import {mkdtemp, rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import type {AgentSession, ExtensionContext, ToolDefinition} from "@earendil-works/pi-coding-agent";
import type {HarnessSnapshot, HarnessWorkflow, WorkflowStep} from "@supernova/contracts/harnesses/schemas";
import type {PiSdkServiceShape} from "@supernova/agent-runtime/layers/pi-sdk";
import {HarnessRunStore} from "@supernova/agent-runtime/layers/harnesses/internal/harness-run-store";
import {createHarnessTools} from "@supernova/agent-runtime/layers/harnesses/internal/harness-runtime";
import {createDefaultHarness, resolveHarnessProject} from "@supernova/agent-runtime/layers/harnesses/lib/harness-config";
import {fauxAssistantMessage, selectedPiModel} from "@tests/support/layers/pi-session-test-utils";

const scoutStep: WorkflowStep = {
  id: "scout",
  agent: "scout",
  instructions: "Find sources",
  reads: [],
  output: {fields: [{name: "sources", type: "string[]", required: true}]},
  effects: "none",
};
const reviewStep: WorkflowStep = {
  id: "review",
  agent: "reviewer",
  instructions: "Check the sources",
  reads: ["scout"],
  output: {
    fields: [
      {name: "verdict", type: "string", required: true},
      {name: "confidence", type: "number", required: false},
    ],
  },
  effects: "none",
};
const publishStep: WorkflowStep = {
  id: "publish",
  agent: "publisher",
  instructions: "Publish the summary",
  reads: ["scout"],
  output: {fields: [{name: "url", type: "string", required: true}]},
  effects: "external",
};

function fenced(value: Record<string, unknown>): string {
  return `Here is my result.\n\n\`\`\`json\n${JSON.stringify(value)}\n\`\`\``;
}

/** One reply per created worker session, in call order, with the spend that worker reports. */
type Worker = {answer: string; costUsd?: number} | Error;

describe("workflow runs", () => {
  let root: string;
  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "pi-plus-workflow-test-"));
  });
  afterEach(async () => {
    await rm(root, {recursive: true, force: true});
  });

  function configuration(steps: readonly WorkflowStep[] = [scoutStep, reviewStep], overrides: Partial<HarnessWorkflow> = {}) {
    const workflow: HarnessWorkflow = {
      id: "literature",
      name: "Literature",
      description: "Scout, then review",
      steps,
      limits: {maxWallClockSeconds: 600},
      ...overrides,
    };
    const agents = ["scout", "reviewer", "publisher"].map((name) => ({name, description: `${name} specialist`, systemPrompt: `${name.toUpperCase()} ROLE`, tools: ["read"]}));
    const harness = {...createDefaultHarness(), systemPrompt: "SHARED RULES", agents, workflows: [workflow]};
    const project = {id: "lab", harnessId: "coding", name: "Lab", path: root, systemPrompt: "PROJECT BRIEF", contextInstructions: "", agents: []};
    return {workflow, harness, project, snapshot: resolveHarnessProject(harness, project, 7)};
  }

  /** Replays one scripted worker per session and records the prompts, steering and aborts the runtime produced. */
  function fakeSdk(workers: readonly Worker[], turns = 0) {
    const prompts: string[] = [];
    const limits: string[] = [];
    let created = 0;
    const createAgentSession = vi.fn(async (options: Parameters<PiSdkServiceShape["createAgentSession"]>[0]) => {
      const index = created;
      created += 1;
      const messages: AgentSession["state"]["messages"] = [];
      const handlers = (options?.resourceLoader?.getExtensions().extensions ?? []).flatMap(
        (extension) => (extension.handlers.get("turn_start") ?? []) as ((event: unknown, ctx: unknown) => Promise<unknown>)[]
      );
      return {
        session: {
          subscribe: () => () => {},
          bindExtensions: vi.fn(),
          abort: vi.fn(),
          steer: vi.fn((text: string) => {
            limits.push(`steer:${text}`);
            return Promise.resolve();
          }),
          dispose: vi.fn(),
          getActiveToolNames: () => ["read"],
          model: selectedPiModel,
          thinkingLevel: options?.thinkingLevel,
          systemPrompt: "",
          agent: {waitForIdle: vi.fn()},
          state: {messages},
          prompt: async (task: string) => {
            prompts.push(task);
            for (let turnIndex = 0; turnIndex < turns; turnIndex += 1) {
              for (const handler of handlers) await handler({type: "turn_start", turnIndex, timestamp: 0}, {abort: () => limits.push(`abort:${turnIndex}`)});
            }
            const worker = workers[index];
            if (worker instanceof Error) throw worker;
            const cost = {input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: worker?.costUsd ?? 0};
            messages.push({...fauxAssistantMessage(worker?.answer ?? ""), usage: {input: 120, output: 40, cacheRead: 0, cacheWrite: 0, totalTokens: 160, cost}});
          },
        },
      };
    });
    return {sdk: {createAgentSession, modelRuntime: {getAvailableSnapshot: () => [selectedPiModel]}} as unknown as PiSdkServiceShape, createAgentSession, prompts, limits};
  }

  function workflowTool(snapshot: HarnessSnapshot, sdk: PiSdkServiceShape, store: HarnessRunStore): ToolDefinition {
    return createHarnessTools(snapshot, sdk, {chatId: "chat", store}).find((tool) => tool.name === "harness_workflow")!;
  }

  function context(contextWindow = selectedPiModel.contextWindow): ExtensionContext {
    return {model: {...selectedPiModel, contextWindow}} as unknown as ExtensionContext;
  }

  it("stops a malformed handoff at its source and leaves the cursor and later steps untouched", async () => {
    const {snapshot} = configuration();
    const store = new HarnessRunStore(join(root, "runs"));
    const {sdk, prompts} = fakeSdk([{answer: fenced({sources: ["Paper A"]})}, {answer: "The sources look fine to me."}]);
    const result = await workflowTool(snapshot, sdk, store).execute("call", {task: "Survey the field"}, undefined, undefined, context());
    const [summary] = await store.listWorkflowRuns("chat");
    expect(summary).toMatchObject({status: "failed", cursor: 1, stepCount: 2, workflowName: "Literature", workflowRevision: 7});
    const run = await store.getWorkflowRun("chat", summary!.id);
    expect(run.steps.map((step) => step.status)).toEqual(["completed", "failed"]);
    expect(run.steps[0]!.output).toEqual({sources: ["Paper A"]});
    expect(run.steps[1]).toMatchObject({failureKind: "malformed_output", attempt: 1, rawOutput: "The sources look fine to me."});
    expect(run.steps[1]!.error).toContain("verdict");
    expect(prompts).toHaveLength(2);
    expect(JSON.stringify(result.content)).toContain(`resumeRunId ${run.id}`);
    expect(result.details).toEqual({workflowRunId: run.id, status: "failed", cursor: 1});
  });

  it("resumes the same run in place, re-running only the step at the cursor", async () => {
    const {snapshot} = configuration();
    const store = new HarnessRunStore(join(root, "runs"));
    const first = fakeSdk([{answer: fenced({sources: ["Paper A"]})}, new Error("Provider unavailable")]);
    await workflowTool(snapshot, first.sdk, store).execute("call", {task: "Survey the field"}, undefined, undefined, context());
    const [started] = await store.listWorkflowRuns("chat");
    expect((await store.getWorkflowRun("chat", started!.id)).steps[1]).toMatchObject({failureKind: "provider", status: "failed"});
    const second = fakeSdk([{answer: fenced({verdict: "Sound", confidence: 0.8})}]);
    const result = await workflowTool(snapshot, second.sdk, store).execute("call", {task: "Ignored on resume", resumeRunId: started!.id}, undefined, undefined, context());
    const run = await store.getWorkflowRun("chat", started!.id);
    expect(second.prompts).toHaveLength(1);
    expect(second.prompts[0]).toContain("step 2 of 2 (review)");
    expect(run).toMatchObject({id: started!.id, status: "completed", cursor: 2, task: "Survey the field"});
    expect(run.steps.map((step) => [step.stepId, step.status, step.attempt])).toEqual([
      ["scout", "completed", 1],
      ["review", "completed", 2],
    ]);
    expect(run.steps[1]!.output).toEqual({verdict: "Sound", confidence: 0.8});
    expect(await store.listWorkflowRuns("chat")).toHaveLength(1);
    expect(JSON.stringify(result.content)).toContain("Sound");
  });

  it("refuses to rerun a failed external step without an override and keeps its action id when allowed", async () => {
    const {snapshot} = configuration([scoutStep, publishStep]);
    const store = new HarnessRunStore(join(root, "runs"));
    const first = fakeSdk([{answer: fenced({sources: ["Paper A"]})}, {answer: fenced({url: 42})}]);
    await workflowTool(snapshot, first.sdk, store).execute("call", {task: "Publish the survey"}, undefined, undefined, context());
    const [started] = await store.listWorkflowRuns("chat");
    const failed = await store.getWorkflowRun("chat", started!.id);
    expect(failed.steps[1]).toMatchObject({status: "failed", failureKind: "malformed_output", attempt: 1});
    expect(failed.steps[1]!.error).toContain("url must be string");
    const refused = fakeSdk([{answer: fenced({url: "https://example.test/a"})}]);
    await expect(
      workflowTool(snapshot, refused.sdk, store).execute("call", {task: "Publish the survey", resumeRunId: started!.id}, undefined, undefined, context())
    ).rejects.toThrow("allowExternalRetry");
    expect(refused.prompts).toEqual([]);
    const allowed = fakeSdk([{answer: fenced({url: "https://example.test/a"})}]);
    await workflowTool(snapshot, allowed.sdk, store).execute(
      "call",
      {task: "Publish the survey", resumeRunId: started!.id, allowExternalRetry: true},
      undefined,
      undefined,
      context()
    );
    const run = await store.getWorkflowRun("chat", started!.id);
    expect(run.steps[1]).toMatchObject({status: "completed", attempt: 2, actionId: failed.steps[1]!.actionId});
    expect(allowed.prompts[0]).toContain(failed.steps[1]!.actionId);
  });

  it("hands each step only the outputs it reads", async () => {
    const {snapshot} = configuration([scoutStep, reviewStep, {...publishStep, effects: "workspace"}]);
    const store = new HarnessRunStore(join(root, "runs"));
    const {sdk, prompts} = fakeSdk([
      {answer: fenced({sources: ["SCOUT-FINDING"]})},
      {answer: fenced({verdict: "REVIEW-VERDICT"})},
      {answer: fenced({url: "https://example.test/a"})},
    ]);
    await workflowTool(snapshot, sdk, store).execute("call", {task: "Survey the field"}, undefined, undefined, context());
    expect(prompts[0]).not.toContain("Validated output");
    expect(prompts[1]).toContain("SCOUT-FINDING");
    expect(prompts[2]).toContain("SCOUT-FINDING");
    expect(prompts[2]).not.toContain("REVIEW-VERDICT");
    const run = await store.getWorkflowRun("chat", (await store.listWorkflowRuns("chat"))[0]!.id);
    expect(run.status).toBe("completed");
    expect(run.steps[2]!.input).toEqual({task: "Survey the field", reads: {scout: {sources: ["SCOUT-FINDING"]}}});
  });

  it("stops at the next step boundary once a step's own cost limit is spent", async () => {
    const {snapshot} = configuration([{...scoutStep, limits: {maxCostUsd: 0.2}}, reviewStep]);
    const store = new HarnessRunStore(join(root, "runs"));
    const {sdk, prompts} = fakeSdk([{answer: fenced({sources: ["Paper A"]}), costUsd: 0.3}, {answer: fenced({verdict: "Sound"})}]);
    await workflowTool(snapshot, sdk, store).execute("call", {task: "Survey the field"}, undefined, undefined, context());
    const run = await store.getWorkflowRun("chat", (await store.listWorkflowRuns("chat"))[0]!.id);
    expect(prompts).toHaveLength(1);
    expect(run.steps.map((step) => step.status)).toEqual(["completed", "failed"]);
    expect(run.steps[1]!.failureKind).toBe("limit");
    expect(run.steps[1]!.error).toContain("its limit of 0.2 USD");
  });

  it("stops at the next step boundary once the workflow's cost limit is spent", async () => {
    const {snapshot} = configuration([scoutStep, reviewStep], {limits: {maxWallClockSeconds: 600, maxCostUsd: 0.5}});
    const store = new HarnessRunStore(join(root, "runs"));
    const {sdk, prompts} = fakeSdk([{answer: fenced({sources: ["Paper A"]}), costUsd: 0.75}, {answer: fenced({verdict: "Sound"})}]);
    await workflowTool(snapshot, sdk, store).execute("call", {task: "Survey the field"}, undefined, undefined, context());
    const run = await store.getWorkflowRun("chat", (await store.listWorkflowRuns("chat"))[0]!.id);
    expect(prompts).toHaveLength(1);
    expect(run).toMatchObject({status: "failed", cursor: 1, spentUsd: 0.75});
    expect(run.steps[0]!.usage).toEqual({inputTokens: 120, outputTokens: 40, costUsd: 0.75});
    expect(run.steps[1]).toMatchObject({status: "failed", failureKind: "limit", attempt: 0});
    expect(run.steps[1]!.error).toContain("cost limit");
  });

  it("steers the worker to write up one turn before the turn limit, and still aborts at it", async () => {
    const {harness, project} = configuration([scoutStep]);
    const snapshot = resolveHarnessProject({...harness, loop: {maxTurns: 2, timeoutSeconds: 900}}, project, 7);
    const store = new HarnessRunStore(join(root, "runs"));
    const {sdk, limits} = fakeSdk([{answer: fenced({sources: ["Paper A"]})}], 3);
    await workflowTool(snapshot, sdk, store).execute("call", {task: "Survey the field"}, undefined, undefined, context());
    expect(limits.map((entry) => entry.split(":")[0])).toEqual(["steer", "abort"]);
    expect(limits[0]).toContain("write your findings");
    expect(limits[1]).toBe("abort:2");
  });

  it("refuses instructions that cannot fit the model window before creating a session", async () => {
    const {snapshot} = configuration([scoutStep]);
    const store = new HarnessRunStore(join(root, "runs"));
    const {sdk, createAgentSession} = fakeSdk([{answer: fenced({sources: ["Paper A"]})}]);
    await workflowTool(snapshot, sdk, store).execute("call", {task: "Survey the field"}, undefined, undefined, context(4000));
    expect(createAgentSession).not.toHaveBeenCalled();
    const run = await store.getWorkflowRun("chat", (await store.listWorkflowRuns("chat"))[0]!.id);
    expect(run.steps[0]).toMatchObject({status: "failed", failureKind: "configuration", attempt: 1});
    expect(run.steps[0]!.error).toMatch(/4,?000/);
    expect(run.steps[0]!.error).toContain("reserved");
  });

  it("marks an orphaned run interrupted and keeps specialist receipts out of the workflow listing", async () => {
    const {snapshot} = configuration([scoutStep]);
    const store = new HarnessRunStore(join(root, "runs"));
    const {sdk} = fakeSdk([{answer: fenced({sources: ["Paper A"]})}]);
    await workflowTool(snapshot, sdk, store).execute("call", {task: "Survey the field"}, undefined, undefined, context());
    const run = await store.getWorkflowRun("chat", (await store.listWorkflowRuns("chat"))[0]!.id);
    const receipts = await store.list("chat");
    expect(receipts.map((receipt) => receipt.agentName)).toEqual(["scout"]);
    expect(receipts.some((receipt) => receipt.id === run.id)).toBe(false);
    expect((await store.listWorkflowRuns("chat")).map((item) => item.id)).toEqual([run.id]);
    await store.saveWorkflowRun({...run, status: "running"});
    const restarted = new HarnessRunStore(join(root, "runs"), () => false);
    expect((await restarted.listWorkflowRuns("chat"))[0]?.status).toBe("interrupted");
    expect((await restarted.getWorkflowRun("chat", run.id)).status).toBe("interrupted");
    expect(await restarted.listWorkflowRuns("other-chat")).toEqual([]);
  });

  it("runs the workflow frozen into the run even after the harness changed", async () => {
    const {snapshot} = configuration();
    const store = new HarnessRunStore(join(root, "runs"));
    const first = fakeSdk([{answer: fenced({sources: ["Paper A"]})}, new Error("Provider unavailable")]);
    await workflowTool(snapshot, first.sdk, store).execute("call", {task: "Survey the field"}, undefined, undefined, context());
    const [started] = await store.listWorkflowRuns("chat");
    const edited = configuration([{...scoutStep, instructions: "EDITED INSTRUCTIONS"}]).snapshot;
    const second = fakeSdk([{answer: fenced({verdict: "Sound"})}]);
    await workflowTool(edited, second.sdk, store).execute("call", {task: "Survey the field", resumeRunId: started!.id}, undefined, undefined, context());
    const run = await store.getWorkflowRun("chat", started!.id);
    expect(run.workflow.steps.map((step) => step.id)).toEqual(["scout", "review"]);
    expect(second.prompts[0]).toContain("Check the sources");
    expect(second.prompts[0]).not.toContain("EDITED INSTRUCTIONS");
    expect(run).toMatchObject({status: "completed", cursor: 2, stepCount: 2});
  });
});
