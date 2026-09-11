import {mkdtemp, mkdir, readFile, rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import type {AgentSession, ExtensionContext} from "@earendil-works/pi-coding-agent";
import type {PiSdkServiceShape} from "@supernova/agent-runtime/layers/pi-sdk";
import {HarnessRunStore} from "@supernova/agent-runtime/layers/harnesses/internal/harness-run-store";
import {HarnessStore} from "@supernova/agent-runtime/layers/harnesses/internal/harness-store";
import {createHarnessTools} from "@supernova/agent-runtime/layers/harnesses/internal/harness-runtime";
import {createDefaultHarness, resolveHarnessProject} from "@supernova/agent-runtime/layers/harnesses/lib/harness-config";
import {harnessPromptLayers} from "@supernova/agent-runtime/layers/harnesses/lib/harness-prompts";
import {selectedPiModel} from "@tests/support/layers/pi-session-test-utils";

describe("chat-owned worker receipts and view boundaries", () => {
  let root: string;
  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "pi-plus-trace-test-"));
  });
  afterEach(async () => {
    await rm(root, {recursive: true, force: true});
  });

  function configuration() {
    const agent = {name: "reviewer", description: "Review evidence", systemPrompt: "REVIEW ROLE", tools: ["read"], execution: {effort: "high"}};
    const harness = {...createDefaultHarness(), systemPrompt: "SHARED RULES", agents: [agent]};
    const project = {id: "lab", harnessId: "coding", name: "Lab", path: root, systemPrompt: "PROJECT BRIEF", contextInstructions: "", agents: []};
    return {agent, harness, project, snapshot: resolveHarnessProject(harness, project, 4)};
  }

  function fakeSdk(fail = false) {
    const disposals: ReturnType<typeof vi.fn>[] = [];
    const createAgentSession = vi.fn(async (options: Parameters<PiSdkServiceShape["createAgentSession"]>[0]) => {
      if (!options) throw new Error("Missing test session options");
      let listener: Parameters<AgentSession["subscribe"]>[0] | undefined;
      const dispose = vi.fn();
      disposals.push(dispose);
      const session = {
        subscribe: (callback: typeof listener) => {
          listener = callback;
          return () => {
            listener = undefined;
          };
        },
        bindExtensions: vi.fn(),
        abort: vi.fn(),
        dispose,
        getActiveToolNames: () => ["read"],
        model: selectedPiModel,
        thinkingLevel: options.thinkingLevel,
        systemPrompt: options.resourceLoader?.getAppendSystemPrompt().join("\n"),
        agent: {waitForIdle: vi.fn()},
        state: {messages: [{role: "assistant", content: [{type: "text", text: "Verified evidence"}], stopReason: "stop"}]},
        prompt: async () => {
          await listener?.({type: "agent_start"});
          if (fail) throw new Error("Provider unavailable");
          const worker = options.customTools?.find((tool) => tool.name === "subagent");
          if (worker)
            await worker.execute("nested", {agent: "reviewer", task: "Review lab evidence"}, undefined, undefined, {model: selectedPiModel} as unknown as ExtensionContext);
        },
      };
      return {session};
    });
    return {sdk: {createAgentSession, modelRuntime: {getAvailableSnapshot: () => [selectedPiModel]}} as unknown as PiSdkServiceShape, disposals};
  }

  it("persists actual nested lab and specialist runs under one chat, with distinct instruction owners", async () => {
    const {harness, project} = configuration();
    const head = {...project, id: "head", name: "Science Space", systemPrompt: "HEAD BRIEF"};
    const shared = {...harness, coordinatorProjectId: head.id, orchestratorPrompt: "HEAD ROLE"};
    const lab = {...project, parentProjectId: head.id, orchestratorPrompt: "LAB ROLE"};
    const snapshot = {...resolveHarnessProject(shared, head, 4), delegation: {harness: shared, projects: [lab]}};
    const store = new HarnessRunStore(join(root, "runs"));
    const {sdk, disposals} = fakeSdk();
    const tool = createHarnessTools(snapshot, sdk, {chatId: "chat", store}).find((tool) => tool.name === "lab_agent")!;
    await tool.execute("lab", {projectId: lab.id, task: "Investigate lab question"}, undefined, undefined, {model: selectedPiModel} as unknown as ExtensionContext);
    const runs = await store.list("chat");
    expect(runs).toHaveLength(2);
    const lead = runs.find((run) => run.role === "lab-orchestrator")!;
    const worker = runs.find((run) => run.role === "specialist")!;
    expect(worker.parentRunId).toBe(lead.id);
    expect(runs.every((run) => run.status === "completed" && run.chatId === "chat")).toBe(true);
    const receipt = await store.get("chat", worker.id);
    expect(receipt.instructions.map((layer) => layer.content)).toEqual(["SHARED RULES", "PROJECT BRIEF", "REVIEW ROLE"]);
    expect(receipt.runtime?.systemPrompt).not.toContain("HEAD ROLE");
    expect(receipt.runtime?.systemPrompt).not.toContain("HEAD BRIEF");
    expect(receipt.model?.thinkingLevel).toBe("high");
    expect(receipt.output).toBe("Verified evidence");
    expect(receipt.projectPath).toBe(root);
    expect(disposals.every((dispose) => dispose.mock.calls.length === 1)).toBe(true);
    const summary = await readFile(join(root, "runs", "chat", `${worker.id}.summary.json`), "utf8");
    expect(summary).not.toContain("PROJECT BRIEF");
    expect(summary).not.toContain("Verified evidence");
    expect(await store.list("unrelated")).toEqual([]);
    await expect(store.get("unrelated", worker.id)).rejects.toThrow();
    await expect(store.get("../chat", worker.id)).rejects.toThrow("Invalid");
    const restarted = new HarnessRunStore(join(root, "runs"), () => false);
    expect((await restarted.get("chat", worker.id)).status).toBe("completed");
    await store.save({...receipt, status: "running"});
    expect((await restarted.list("chat")).find((run) => run.id === worker.id)?.status).toBe("interrupted");
  });

  it("records failed startup and provider failure, and releases the worker", async () => {
    const {snapshot} = configuration();
    const store = new HarnessRunStore(join(root, "runs"));
    const {sdk, disposals} = fakeSdk(true);
    await expect(
      createHarnessTools(snapshot, sdk, {chatId: "chat", store})[0]!.execute("worker", {agent: "reviewer", task: "Review"}, undefined, undefined, {
        model: selectedPiModel,
      } as unknown as ExtensionContext)
    ).rejects.toThrow("Provider unavailable");
    const [run] = await store.list("chat");
    expect(run?.status).toBe("failed");
    expect((await store.get("chat", run!.id)).error).toBe("Provider unavailable");
    expect(disposals[0]).toHaveBeenCalledOnce();
    const cancelled = AbortSignal.abort();
    await expect(
      createHarnessTools(snapshot, sdk, {chatId: "cancelled", store})[0]!.execute("worker", {agent: "reviewer", task: "Review"}, cancelled, undefined, {} as ExtensionContext)
    ).rejects.toThrow("cancelled");
    expect((await store.list("cancelled"))[0]?.status).toBe("cancelled");
    expect(disposals).toHaveLength(1);
  });

  it("recovers legacy prompt joins exactly without duplicating project instructions", () => {
    const {snapshot, agent} = configuration();
    const legacy = {...snapshot, sharedInstructions: undefined};
    expect(harnessPromptLayers(legacy, agent).map((layer) => layer.content)).toEqual(["SHARED RULES", "PROJECT BRIEF", "REVIEW ROLE"]);
  });

  it("allows bounded view edits, rejects cross-lab authority and stale revisions, and preserves prompts and folders", async () => {
    const store = new HarnessStore(join(root, "configuration"));
    await mkdir(join(root, "lab"));
    await store.save({...createDefaultHarness("science", "Science Pi"), source: {rootPath: root, packagePath: root}}, 0);
    const project = {id: "head", harnessId: "science", name: "Science Space", path: root, systemPrompt: "PRESERVE HEAD", contextInstructions: "", agents: []};
    await store.saveProject(project, 1);
    await store.saveProject({...project, id: "lab", name: "Lab", path: join(root, "lab"), systemPrompt: "PRESERVE LAB"}, 2);
    const head = await store.resolveProject("head");
    const lab = await store.resolveProject("lab");
    const updated = await store.updateView(head, {projectId: "lab", name: "Evidence Lab", color: "#7dd3fc"}, 3);
    expect(updated.projects.find((item) => item.id === "lab")).toMatchObject({name: "Evidence Lab", color: "#7dd3fc", systemPrompt: "PRESERVE LAB", path: lab.project.path});
    await expect(store.updateView(lab, {projectId: "head", name: "Forbidden"}, 4)).rejects.toThrow("cannot manage");
    await expect(store.updateView(head, {projectId: "lab", name: "Stale"}, 3)).rejects.toThrow("changed elsewhere");
    await expect(store.updateView(lab, {projectId: "lab", color: "red;display:none"}, 4)).rejects.toThrow("hex color");
    await store.updateView(lab, {projectId: "lab", beforeProjectId: ""}, 4);
    expect((await store.list()).projects.find((item) => item.id === "lab")?.order).toBe(0);
  });
});
