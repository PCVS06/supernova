import {mkdtemp, rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import type {AgentSession, ExtensionContext} from "@earendil-works/pi-coding-agent";
import type {PiSdkServiceShape} from "@supernova/agent-runtime/layers/pi-sdk";
import {backgroundDelegations} from "@supernova/agent-runtime/layers/harnesses/internal/background-delegations";
import {HarnessRunStore} from "@supernova/agent-runtime/layers/harnesses/internal/harness-run-store";
import {createHarnessTools} from "@supernova/agent-runtime/layers/harnesses/internal/harness-runtime";
import {createDefaultHarness, resolveHarnessProject} from "@supernova/agent-runtime/layers/harnesses/lib/harness-config";
import {fauxAssistantMessage, selectedPiModel} from "@tests/support/layers/pi-session-test-utils";

/** A controlled provider holds real worker receipts open until its result or abort. */
function provider() {
  const releases = new Map<string, () => void>();
  const dispose = vi.fn();
  const createAgentSession = vi.fn(async (options: Parameters<PiSdkServiceShape["createAgentSession"]>[0]) => {
    let listener: Parameters<AgentSession["subscribe"]>[0] | undefined;
    let abort: (() => void) | undefined;
    return {
      session: {
        subscribe: (callback: typeof listener) => {
          listener = callback;
          return () => {
            listener = undefined;
          };
        },
        bindExtensions: async () => {},
        getActiveToolNames: () => ["read"],
        model: selectedPiModel,
        systemPrompt: options?.resourceLoader?.getAppendSystemPrompt().join("\n"),
        state: {messages: [fauxAssistantMessage("Saved worker result")]},
        agent: {waitForIdle: async () => {}},
        abort: async () => abort?.(),
        dispose,
        prompt: async (task: string) => {
          listener?.({type: "agent_start"});
          await new Promise<void>((resolve, reject) => {
            releases.set(task, resolve);
            abort = () => reject(new Error("Worker cancelled"));
          });
          if (task === "fail") throw new Error("Provider failed");
        },
      },
    };
  });
  return {sdk: {createAgentSession, modelRuntime: {getAvailableSnapshot: () => [selectedPiModel]}} as unknown as PiSdkServiceShape, releases, createAgentSession, dispose};
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

  function setup() {
    const harness = {...createDefaultHarness(), agents: [{name: "reviewer", description: "Review", systemPrompt: "Verify", tools: ["read"]}]};
    const project = {id: "lab", harnessId: harness.id, name: "Lab", path: root, systemPrompt: "", contextInstructions: "", agents: []};
    const store = new HarnessRunStore(join(root, "runs"));
    const child = provider();
    // The store needs a safe chat identifier; the registry still uses that same owner.
    const chatId = root.split("/").at(-1)!;
    const tool = createHarnessTools(resolveHarnessProject(harness, project, 1), child.sdk, {chatId, store})[0]!;
    const execute = (id: string, params: Record<string, unknown>, signal?: AbortSignal) =>
      tool.execute(id, params, signal, undefined, {model: selectedPiModel} as unknown as ExtensionContext);
    return {...child, store, execute, chatId};
  }

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
