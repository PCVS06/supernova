import {mkdtemp, mkdir, rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import type {AgentSession, ExtensionContext} from "@earendil-works/pi-coding-agent";
import type {PiSdkServiceShape} from "@supernova/agent-runtime/layers/pi-sdk";
import {BackgroundDelegations, backgroundDelegations} from "@supernova/agent-runtime/layers/harnesses/internal/background-delegations";
import {HarnessRunStore} from "@supernova/agent-runtime/layers/harnesses/internal/harness-run-store";
import {HarnessStore} from "@supernova/agent-runtime/layers/harnesses/internal/harness-store";
import {createHarnessTools} from "@supernova/agent-runtime/layers/harnesses/internal/harness-runtime";
import {createDefaultHarness, resolveHarnessProject} from "@supernova/agent-runtime/layers/harnesses/lib/harness-config";
import {fauxAssistantMessage, selectedPiModel} from "@tests/support/layers/pi-session-test-utils";

/** A controlled provider holds real worker receipts open until its result or abort. */
function provider(holdStartup = false) {
  const releases = new Map<string, () => void>();
  const starts = new Map<string, () => void>();
  const dispose = vi.fn();
  const corrections: string[] = [];
  const createAgentSession = vi.fn(async (options: Parameters<PiSdkServiceShape["createAgentSession"]>[0]) => {
    let listener: Parameters<AgentSession["subscribe"]>[0] | undefined;
    let abort: (() => void) | undefined;
    let streaming = false;
    return {
      session: {
        subscribe: (callback: typeof listener) => {
          listener = callback;
          return () => {
            listener = undefined;
          };
        },
        bindExtensions: async () => {},
        get isStreaming() {
          return streaming;
        },
        steer: async (text: string) => {
          corrections.push(text);
        },
        getActiveToolNames: () => ["read"],
        model: selectedPiModel,
        systemPrompt: options?.resourceLoader?.getAppendSystemPrompt().join("\n"),
        state: {messages: [fauxAssistantMessage("Saved worker result")]},
        agent: {waitForIdle: async () => {}},
        abort: async () => abort?.(),
        dispose,
        prompt: async (task: string) => {
          if (holdStartup)
            await new Promise<void>((resolve, reject) => {
              starts.set(task, resolve);
              abort = () => reject(new Error("Worker cancelled during startup"));
            });
          streaming = true;
          listener?.({type: "agent_start"});
          await new Promise<void>((resolve, reject) => {
            releases.set(task, resolve);
            abort = () => reject(new Error("Worker cancelled"));
          });
          if (task === "fail") throw new Error("Provider failed");
          streaming = false;
        },
      },
    };
  });
  return {
    sdk: {createAgentSession, modelRuntime: {getAvailableSnapshot: () => [selectedPiModel]}} as unknown as PiSdkServiceShape,
    releases,
    starts,
    createAgentSession,
    dispose,
    corrections,
  };
}

describe("background delegation", () => {
  let root: string;
  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "radian-background-test-"));
  });
  afterEach(async () => {
    await backgroundDelegations.cancel(root.split("/").at(-1)!);
    await rm(root, {recursive: true, force: true});
  });

  function setup(hasPendingMessages = () => false, holdStartup = false) {
    const harness = {...createDefaultHarness(), agents: [{name: "reviewer", description: "Review", systemPrompt: "Verify", tools: ["read"]}]};
    const project = {id: "lab", harnessId: harness.id, name: "Lab", path: root, systemPrompt: "", contextInstructions: "", agents: []};
    const store = new HarnessRunStore(join(root, "runs"));
    const child = provider(holdStartup);
    // The store needs a safe chat identifier; the registry still uses that same owner.
    const chatId = root.split("/").at(-1)!;
    const tool = createHarnessTools(resolveHarnessProject(harness, project, 1), child.sdk, {chatId, store})[0]!;
    const execute = (id: string, params: Record<string, unknown>, signal?: AbortSignal) =>
      tool.execute(id, params, signal, undefined, {model: selectedPiModel, hasPendingMessages} as unknown as ExtensionContext);
    return {...child, store, execute, chatId};
  }

  it("holds an early correction until the worker has actually started streaming", async () => {
    const {execute, starts, corrections} = setup(() => false, true);
    const result = await execute("start", {background: true, agent: "reviewer", task: "hold"});
    const runIds = (result.details as {runIds: string[]}).runIds;
    await vi.waitFor(() => expect(starts.has("hold")).toBe(true));
    // Inject a provider startup window after prompt() has returned its pending promise.
    const release = setTimeout(() => starts.get("hold")!(), 100);
    try {
      await expect(execute("early", {action: "message", runIds, message: "Correct from the start"})).resolves.toMatchObject({details: {delivery: "steered"}});
      expect(corrections).toEqual(["Correct from the start"]);
    } finally {
      clearTimeout(release);
    }
  });

  it("returns from waiting for a correction without cancelling the workers", async () => {
    let pending = false;
    const {execute, chatId, store, releases, corrections} = setup(() => pending);
    const started = await execute("start", {background: true, agent: "reviewer", task: "hold"});
    const runIds = (started.details as {runIds: string[]}).runIds;
    await vi.waitFor(() => expect(releases.size).toBe(1));
    let returned = false;
    const waiting = execute("wait", {action: "wait", runIds}).then(() => {
      returned = true;
    });
    pending = true;
    await vi.waitFor(() => expect(returned).toBe(true), {timeout: 1500});
    await waiting;
    expect((await store.get(chatId, runIds[0]!)).status).toBe("running");
    await execute("correct", {action: "message", runIds, message: "Use the corrected objective"});
    expect(corrections).toEqual(["Use the corrected objective"]);
  });

  it("rejects a second concurrent lead for the same project and identifies the existing assignment", async () => {
    const config = new HarnessStore(join(root, "config"));
    const harness = {...createDefaultHarness(), coordinatorProjectId: "head"};
    const head = {id: "head", harnessId: harness.id, name: "Head", path: root, systemPrompt: "", contextInstructions: "", agents: []};
    await config.saveProject(head, 0);
    await config.save(harness, 1);
    await mkdir(join(root, "child"));
    await config.saveProject({...head, id: "child", name: "Child", path: join(root, "child"), parentProjectId: "head"}, 2);
    const child = provider();
    const chatId = root.split("/").at(-1)!;
    const store = new HarnessRunStore(join(root, "runs"));
    const tool = createHarnessTools(await config.resolveProject("head"), child.sdk, {chatId, store}, config).find((tool) => tool.name === "lab_agent")!;
    const invoke = (id: string) =>
      tool.execute(id, {projectId: "child", task: "hold", background: true}, undefined, undefined, {model: selectedPiModel} as unknown as ExtensionContext);
    const first = await invoke("first");
    const id = (first.details as {runIds: string[]}).runIds[0]!;
    await expect(invoke("second")).rejects.toThrow(id);
    expect((await store.list(chatId)).filter((run) => run.role === "lab-orchestrator")).toHaveLength(1);
  });

  it("returns before three workers finish, bounds capacity, coalesces retries and joins persisted results", async () => {
    const {execute, store, chatId, releases, createAgentSession, dispose} = setup();
    const params = {background: true, tasks: ["a", "b", "c"].map((task) => ({agent: "reviewer", task}))};
    const result = await execute("batch", params);
    const runIds = (result.details as {runIds: string[]}).runIds;
    await vi.waitFor(() => expect(releases.size).toBe(3));
    expect((await store.list(chatId)).every((run) => run.status === "running")).toBe(true);
    // This represents the lead's next independent step: the tool has returned while all providers are held.
    expect(dispose).not.toHaveBeenCalled();
    expect((await execute("batch", params)).details).toEqual(result.details);
    await expect(execute("extra", {background: true, agent: "reviewer", task: "extra"})).rejects.toThrow("Three background agents");
    expect(createAgentSession).toHaveBeenCalledTimes(3);
    const status = await execute("status", {action: "status", runIds});
    expect(JSON.stringify(status.content)).toContain("running");
    const joined = execute("join", {action: "wait", runIds});
    for (const release of releases.values()) release();
    expect(JSON.stringify((await joined).content)).toContain("Saved worker result");
    expect((await store.list(chatId)).every((run) => run.status === "completed")).toBe(true);
    expect(dispose).toHaveBeenCalledTimes(3);
    expect(JSON.stringify((await execute("read-again", {action: "wait", runIds})).content)).toContain("Saved worker result");
    expect(createAgentSession).toHaveBeenCalledTimes(3);
  });

  it("delivers a correction once, records it, and rejects completed or foreign assignments", async () => {
    const {execute, store, chatId, releases, corrections} = setup();
    const result = await execute("start", {background: true, agent: "reviewer", task: "hold"});
    const runIds = (result.details as {runIds: string[]}).runIds;
    const params = {action: "message", runIds, message: "Focus on the timing failure"};
    // A correction may arrive while its session is still preparing.
    await execute("correction", params);
    await execute("correction", params);
    expect(corrections).toEqual(["Focus on the timing failure"]);
    expect((await store.get(chatId, runIds[0]!)).events.some((event) => event.message.includes("Focus on the timing failure"))).toBe(true);
    const saved = await store.get(chatId, runIds[0]!);
    await store.save({...saved, id: "foreign", parentRunId: "another-lead"});
    await expect(execute("foreign", {action: "message", runIds: ["foreign"], message: "Cross projects"})).rejects.toThrow("direct assignments");
    releases.get("hold")!();
    await execute("join", {action: "wait", runIds});
    await expect(execute("late", params)).rejects.toThrow("no longer running");
    expect(corrections).toHaveLength(1);
  });

  it("leaves room for three project leads to each orchestrate their own specialists", async () => {
    const registry = new BackgroundDelegations();
    const job = (id: string) => ({
      id,
      execute: (signal: AbortSignal, ready: () => void) =>
        new Promise<void>((resolve) => {
          signal.addEventListener("abort", () => resolve(), {once: true});
          ready();
        }),
    });
    try {
      await registry.start("hierarchy", [job("p1"), job("p2"), job("p3")]);
      for (const parent of ["p1", "p2", "p3"]) await registry.start("hierarchy", [job(`${parent}-a`), job(`${parent}-b`), job(`${parent}-c`)], undefined, parent);
      await expect(registry.start("hierarchy", [job("extra")], undefined, "p1")).rejects.toThrow("Three background agents");
      await expect(registry.start("hierarchy", [job("extra")], undefined, "unrelated")).rejects.toThrow("Twelve background agents");
      await registry.cancelOwned("hierarchy", "p1");
      await registry.start("hierarchy", [job("replacement-a"), job("replacement-b"), job("replacement-c")], undefined, "p1");
      await expect(registry.start("hierarchy", [job("overflow")], undefined, "p2")).rejects.toThrow("Three background agents");
    } finally {
      await registry.cancel("hierarchy");
    }
  });

  it.each(["tool", "parent", "chat"] as const)("cancels and releases a worker through %s cancellation", async (mode) => {
    const {execute, store, chatId, releases, dispose} = setup();
    const parent = new AbortController();
    const result = await execute("start", {background: true, agent: "reviewer", task: "hold"}, parent.signal);
    const runIds = (result.details as {runIds: string[]}).runIds;
    await vi.waitFor(() => expect(releases.size).toBe(1));
    if (mode === "parent") parent.abort();
    if (mode === "chat") await backgroundDelegations.cancel(chatId);
    if (mode === "tool") await execute("cancel", {action: "cancel", runIds});
    await execute("join", {action: "wait", runIds});
    expect((await store.get(chatId, runIds[0]!)).status).toBe("cancelled");
    expect(dispose).toHaveBeenCalledOnce();
  });

  it("keeps an independent worker running after another fails and validates a batch before launch", async () => {
    const {execute, store, chatId, releases, createAgentSession} = setup();
    await expect(
      execute("invalid", {
        background: true,
        tasks: [
          {agent: "reviewer", task: "ok"},
          {agent: "missing", task: "bad"},
        ],
      })
    ).rejects.toThrow("Unknown");
    expect(createAgentSession).not.toHaveBeenCalled();
    const result = await execute("start", {
      background: true,
      tasks: [
        {agent: "reviewer", task: "fail"},
        {agent: "reviewer", task: "ok"},
      ],
    });
    const runIds = (result.details as {runIds: string[]}).runIds;
    await vi.waitFor(() => expect(releases.size).toBe(2));
    releases.get("fail")!();
    await vi.waitFor(async () => expect((await store.list(chatId)).find((run) => run.task === "fail")?.status).toBe("failed"));
    expect((await store.list(chatId)).find((run) => run.task === "ok")?.status).toBe("running");
    releases.get("ok")!();
    const joined = await execute("join", {action: "wait", runIds});
    expect(JSON.stringify(joined.content)).toContain("Provider failed");
    expect(JSON.stringify(joined.content)).toContain("Saved worker result");
  });
});
