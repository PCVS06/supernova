import {readdir} from "node:fs/promises";
import {join} from "node:path";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import type {ExtensionContext, ToolDefinition} from "@earendil-works/pi-coding-agent";
import {runCuratorReview} from "@supernova/agent-runtime/layers/curator/curator-run";
import type {PiSdkServiceShape} from "@supernova/agent-runtime/layers/pi-sdk";
import {fauxAssistantMessage, selectedPiModel} from "@tests/support/layers/pi-session-test-utils";
import {createCuratorFixture, writeLedger, writeReceipt} from "@tests/support/layers/curator-test-utils";
import type {CuratorFixture} from "@tests/support/layers/curator-test-utils";

const harnessPrompt = "Always cite the source.\nNever cite the source.";

function assistant(text: string, costUsd = 0, stopReason?: "aborted" | "error") {
  const message = fauxAssistantMessage(text, stopReason ? {stopReason} : {});
  return {...message, usage: {...message.usage, cost: {...message.usage.cost, total: costUsd}}};
}

/** What the curator's turn did: the tools it called and the messages it produced, without a provider. */
type Turn = (session: {tools: ToolDefinition[]; reply: (message: unknown) => void; emit: () => void}) => Promise<void>;

function stubSdk(turn: Turn) {
  const messages: unknown[] = [];
  const listeners: ((event: {type: string}) => void)[] = [];
  const abort = vi.fn(async () => {});
  const dispose = vi.fn();
  let created: Record<string, unknown> | undefined;
  const createAgentSession = vi.fn(async (options: Record<string, unknown>) => {
    created = options;
    const session = {
      state: {messages},
      subscribe: (listener: (event: {type: string}) => void) => {
        listeners.push(listener);
        return () => undefined;
      },
      bindExtensions: async () => undefined,
      prompt: async () =>
        turn({
          tools: (options.customTools ?? []) as ToolDefinition[],
          reply: (message: unknown) => messages.push(message),
          emit: () => listeners.forEach((listener) => listener({type: "turn_end"})),
        }),
      agent: {waitForIdle: async () => undefined},
      abort,
      dispose,
    };
    return {session};
  });
  const piSdk = {createAgentSession: (options: unknown) => createAgentSession(options as Record<string, unknown>), modelRuntime: {getAvailableSnapshot: () => [selectedPiModel]}};
  return {piSdk: piSdk as unknown as PiSdkServiceShape, createAgentSession, abort, dispose, options: () => created};
}

async function call(tools: ToolDefinition[], name: string, params: unknown): Promise<string> {
  const tool = tools.find((item) => item.name === name)!;
  const result = await tool.execute("call-1", params, undefined, undefined, {} as ExtensionContext);
  return result.content.map((part) => ("text" in part ? part.text : "")).join("");
}

describe("curator review run", () => {
  let fixture: CuratorFixture;
  beforeEach(async () => {
    fixture = await createCuratorFixture({harnessPrompt});
  });
  afterEach(async () => {
    await fixture.cleanup();
  });

  it("runs one session with the curator's own prompt and tools, and records what it did", async () => {
    const snapshot = await fixture.store.resolveProject(fixture.projectId);
    await fixture.store.bindSession("chat-1", snapshot);
    const runId = await writeReceipt(fixture.runs, {chatId: "chat-1", projectId: fixture.projectId, projectPath: fixture.projectPath, error: "cited nothing"});
    const sdk = stubSdk(async ({tools, reply}) => {
      await call(tools, "read_instructions", {});
      const filed = await call(tools, "propose_change", {
        target: {kind: "harness"},
        find: "\nNever cite the source.",
        replace: "",
        rationale: "Contradicts the rule above it.",
        evidence: [{kind: "run", ref: runId, quote: "cited nothing"}],
      });
      expect(filed).toMatch(/^Filed proposal /);
      reply(assistant(["Proposed one removal.", "Applied nothing.", "Skipped two findings without evidence.", "Fourth line.", "Fifth line.", "Sixth line."].join("\n"), 0.05));
    });

    const review = await runCuratorReview({
      harnessId: fixture.harnessId,
      trigger: "manual",
      scope: "full",
      piSdk: sdk.piSdk,
      store: fixture.store,
      curation: fixture.curation,
      runs: fixture.runs,
    });

    expect(review).toMatchObject({status: "completed", trigger: "manual", proposals: 1, applied: 0, spentUsd: 0.05});
    expect(review.summary.split("\n")).toHaveLength(5);
    expect(review.summary).toContain("Proposed one removal.");
    expect(review.finishedAt).toBeDefined();
    expect(await fixture.curation.listReviews(fixture.harnessId)).toHaveLength(1);
    expect((await fixture.curation.listProposals(fixture.harnessId))[0]?.reviewId).toBe(review.id);
    expect(sdk.dispose).toHaveBeenCalledOnce();

    const options = sdk.options()!;
    expect(options.tools).toEqual(["read_instructions", "read_receipts", "read_steers", "read_ledger", "read_document", "propose_change", "apply_memory_op", "append_curator_log"]);
    expect(options.cwd).toBe(fixture.projectPath);
    const prompt = (options.resourceLoader as {getAppendSystemPrompt: () => string[]}).getAppendSystemPrompt().join("\n");
    expect(prompt).toContain("You are the Curator of the Coding harness.");
    expect(prompt).toContain("3. Remove before you add. Assembled instructions are at 0% of budget; above 80% propose only removals and merges.");
    expect(prompt).toContain("Scope: harness Coding, all projects");
    // The curator's session is not a chat: it leaves no receipt anywhere.
    expect((await readdir(join(fixture.root, "config", "runs"))).sort()).toEqual(["chat-1"]);
    expect(await fixture.runs.listWorkflowRuns("chat-1")).toEqual([]);
    expect((await fixture.runs.list("chat-1")).map((run) => run.id)).toEqual([runId]);
  });

  it("scopes a memory review to one project's ledger", async () => {
    await writeLedger(fixture.projectPath, [{recordId: "C-1", statement: "Fermentation stalls below 14 degrees."}]);
    const sdk = stubSdk(async ({tools, reply}) => {
      expect(tools.map((tool) => tool.name)).toEqual(["read_receipts", "read_steers", "read_ledger", "apply_memory_op"]);
      expect(await call(tools, "read_ledger", {projectId: fixture.projectId})).toContain("C-1");
      reply(assistant("Nothing needed changing."));
    });

    const review = await runCuratorReview({
      harnessId: fixture.harnessId,
      projectId: fixture.projectId,
      trigger: "after-run",
      scope: "memory",
      piSdk: sdk.piSdk,
      store: fixture.store,
      curation: fixture.curation,
      runs: fixture.runs,
    });

    expect(review).toMatchObject({status: "completed", trigger: "after-run", projectId: fixture.projectId, summary: "Nothing needed changing."});
    const prompt = (sdk.options()!.resourceLoader as {getAppendSystemPrompt: () => string[]}).getAppendSystemPrompt().join("\n");
    expect(prompt).toContain("Scope: memory ledger of project Project A only; do not propose text changes");
  });

  it("aborts a review that reaches its cost limit and records why", async () => {
    const sdk = stubSdk(async ({reply, emit}) => {
      reply(assistant("Reading everything", 0.4));
      emit();
      reply(assistant("Still reading", 0.4));
      emit();
    });

    const review = await runCuratorReview({
      harnessId: fixture.harnessId,
      trigger: "manual",
      scope: "full",
      piSdk: sdk.piSdk,
      store: fixture.store,
      curation: fixture.curation,
      runs: fixture.runs,
    });

    expect(review.status).toBe("failed");
    expect(review.error).toContain("cost limit of 0.5 USD");
    expect(review.spentUsd).toBeCloseTo(0.8);
    expect(sdk.abort).toHaveBeenCalled();
  });

  it("records an aborted answer as a failed review", async () => {
    const sdk = stubSdk(async ({reply}) => {
      reply(assistant("Interrupted", 0.01, "aborted"));
    });

    const review = await runCuratorReview({
      harnessId: fixture.harnessId,
      trigger: "manual",
      scope: "full",
      piSdk: sdk.piSdk,
      store: fixture.store,
      curation: fixture.curation,
      runs: fixture.runs,
    });

    expect(review).toMatchObject({status: "failed", error: "aborted"});
  });

  it("skips the review once the day's budget is spent, without starting a session", async () => {
    await fixture.curation.addReview({
      id: "earlier",
      harnessId: fixture.harnessId,
      trigger: "manual",
      status: "completed",
      startedAt: new Date().toISOString(),
      summary: "Spent the budget.",
      proposals: 0,
      applied: 0,
      spentUsd: 2,
    });
    const sdk = stubSdk(async () => undefined);

    const review = await runCuratorReview({
      harnessId: fixture.harnessId,
      trigger: "after-run",
      scope: "full",
      piSdk: sdk.piSdk,
      store: fixture.store,
      curation: fixture.curation,
      runs: fixture.runs,
    });

    expect(review.status).toBe("failed");
    expect(review.error).toContain("2.00 USD today");
    expect(sdk.createAgentSession).not.toHaveBeenCalled();
  });

  it("refuses to run without a curator, and refuses a memory review without a project", async () => {
    const sdk = stubSdk(async () => undefined);
    const base = {trigger: "manual" as const, piSdk: sdk.piSdk, store: fixture.store, curation: fixture.curation, runs: fixture.runs};

    await expect(runCuratorReview({...base, harnessId: fixture.harnessId, scope: "memory"})).rejects.toThrow("A memory review needs the project");
    await expect(runCuratorReview({...base, harnessId: "missing", scope: "full"})).rejects.toThrow("Harness not found.");

    const harness = (await fixture.store.list()).harnesses[0]!;
    await fixture.store.save({...harness, curator: {...harness.curator!, enabled: false}}, 2);
    await expect(runCuratorReview({...base, harnessId: fixture.harnessId, scope: "full"})).rejects.toThrow("switched off");
    expect(sdk.createAgentSession).not.toHaveBeenCalled();
  });
});
