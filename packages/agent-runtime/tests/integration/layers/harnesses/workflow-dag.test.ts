import {mkdtemp, rm} from "node:fs/promises";
import {join} from "node:path";
import {tmpdir} from "node:os";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import type {HarnessWorkflow, WorkflowStep} from "@supernova/contracts/harnesses/schemas";
import {workflowLayers} from "@supernova/contracts/harnesses/workflow-graph";
import {HarnessRunStore} from "@supernova/agent-runtime/layers/harnesses/internal/harness-run-store";
import {runWorkflow} from "@supernova/agent-runtime/layers/harnesses/internal/workflow-runner";
import {createDefaultHarness, resolveHarnessProject} from "@supernova/agent-runtime/layers/harnesses/lib/harness-config";

function gate() {
  let release!: () => void;
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  return {promise, release};
}

function step(id: string, reads: string[] = [], effects: WorkflowStep["effects"] = "none"): WorkflowStep {
  return {id, agent: id, reads, instructions: id, effects, output: {fields: [{name: "result", type: "string", required: true}]}};
}

describe("durable parallel workflows", () => {
  let root: string;
  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "radian-workflow-dag-"));
  });
  afterEach(async () => {
    await rm(root, {recursive: true, force: true});
  });

  function setup(steps: WorkflowStep[], maxParallel = 3) {
    const workflow: HarnessWorkflow = {id: "dag", name: "Parallel review", description: "", steps, maxParallel, limits: {maxWallClockSeconds: 60}};
    const harness = {...createDefaultHarness(), agents: steps.map(({agent}) => ({name: agent, description: "", systemPrompt: agent, tools: ["read"]})), workflows: [workflow]};
    const project = {id: "project", harnessId: "coding", name: "Project", path: root, systemPrompt: "", contextInstructions: "", agents: []};
    return {snapshot: resolveHarnessProject(harness, project, 1), workflow, store: new HarnessRunStore(join(root, "runs")), chatId: "chat", task: "Review the evidence"};
  }

  it("runs independent branches together, shares one validated input and joins only after both finish", async () => {
    const options = setup([step("source"), step("technical", ["source"]), step("economic", ["source"]), step("join", ["technical", "economic"])]);
    const technical = gate();
    const economic = gate();
    const calls: string[] = [];
    const prompts = new Map<string, string>();
    const result = runWorkflow({
      ...options,
      execute: async ({agent, task}) => {
        calls.push(agent.name);
        prompts.set(agent.name, task);
        if (agent.name === "technical") await technical.promise;
        if (agent.name === "economic") await economic.promise;
        return {text: JSON.stringify({result: `${agent.name}-result`}), usage: {inputTokens: 10, outputTokens: 5, costUsd: 0.01}};
      },
    });
    try {
      await vi.waitFor(() => expect(calls).toEqual(["source", "technical", "economic"]), {timeout: 1500});
      const [summary] = await options.store.listWorkflowRuns("chat");
      const active = await options.store.getWorkflowRun("chat", summary!.id);
      expect(active.steps.filter((record) => record.status === "running").map((record) => record.stepId)).toEqual(["technical", "economic"]);
      technical.release();
      await vi.waitFor(async () => expect((await options.store.getWorkflowRun("chat", summary!.id)).steps[1]?.status).toBe("completed"));
      expect(calls).not.toContain("join");
    } finally {
      technical.release();
      economic.release();
      await result;
    }
    const completed = await result;
    expect(completed.status).toBe("completed");
    expect(calls).toEqual(["source", "technical", "economic", "join"]);
    expect(prompts.get("economic")).toContain("source-result");
    expect(prompts.get("technical")).toContain("source-result");
    expect(prompts.get("join")).toContain("economic-result");
    expect(completed.spentUsd).toBeCloseTo(0.04);
  });

  it.each([1, 3])("serializes shared workspace writers with a parallel limit of %s", async (maxParallel) => {
    const options = setup([step("first", [], "workspace"), step("second", [], "workspace")], maxParallel);
    let active = 0;
    let peak = 0;
    await runWorkflow({
      ...options,
      execute: async ({agent}) => {
        active += 1;
        peak = Math.max(peak, active);
        await new Promise<void>((resolve) => setImmediate(resolve));
        active -= 1;
        return {text: JSON.stringify({result: agent.name}), usage: {inputTokens: 1, outputTokens: 1, costUsd: 0}};
      },
    });
    expect(peak).toBe(1);
  });

  it("keeps a successful branch when another fails and resumes only unfinished work", async () => {
    const options = setup([step("source"), step("bad", ["source"]), step("good", ["source"]), step("join", ["bad", "good"])]);
    const calls: string[] = [];
    const first = await runWorkflow({
      ...options,
      execute: async ({agent}) => {
        calls.push(agent.name);
        if (agent.name === "bad") throw new Error("Unavailable");
        return {text: JSON.stringify({result: agent.name}), usage: {inputTokens: 1, outputTokens: 1, costUsd: 0.01}};
      },
    });
    expect(first.steps.map(({status}) => status)).toEqual(["completed", "failed", "completed", "blocked"]);
    const resumed: string[] = [];
    const finished = await runWorkflow({
      ...options,
      resume: first,
      execute: async ({agent}) => {
        resumed.push(agent.name);
        return {text: JSON.stringify({result: agent.name}), usage: {inputTokens: 1, outputTokens: 1, costUsd: 0.01}};
      },
    });
    expect(finished.status).toBe("completed");
    expect(resumed).toEqual(["bad", "join"]);
    expect(finished.steps[1]?.actionId).toBe(first.steps[1]?.actionId);
    expect(finished.steps[1]?.attempt).toBe(2);
  });

  it("coalesces simultaneous starts and replays the saved invocation without executing again", async () => {
    const options = setup([step("source")]);
    const barrier = gate();
    const execute = vi.fn(async () => {
      await barrier.promise;
      return {text: '{"result":"once"}', usage: {inputTokens: 1, outputTokens: 1, costUsd: 0.01}};
    });
    const first = runWorkflow({...options, invocationId: "tool-123", execute});
    const second = runWorkflow({...options, invocationId: "tool-123", execute});
    try {
      await vi.waitFor(() => expect(execute).toHaveBeenCalledTimes(1));
    } finally {
      barrier.release();
    }
    expect((await first).id).toBe((await second).id);
    const replay = await runWorkflow({...options, invocationId: "tool-123", execute});
    expect(replay.status).toBe("completed");
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it("runs forward references by prerequisites rather than display order", async () => {
    const options = setup([step("join", ["source"]), step("source")]);
    const calls: string[] = [];
    const result = await runWorkflow({
      ...options,
      execute: async ({agent}) => {
        calls.push(agent.name);
        return {text: '{"result":"ok"}', usage: {inputTokens: 1, outputTokens: 1, costUsd: 0}};
      },
    });
    expect(calls).toEqual(["source", "join"]);
    expect(result.status).toBe("completed");
  });

  it("reserves one shared cost budget across concurrently running branches", async () => {
    const options = setup([step("a"), step("b"), step("c")]);
    options.workflow = {...options.workflow, limits: {...options.workflow.limits, maxCostUsd: 0.3}};
    const barrier = gate();
    const allowances: number[] = [];
    const result = runWorkflow({
      ...options,
      execute: async ({maxCostUsd, onUsage}) => {
        allowances.push(maxCostUsd!);
        await barrier.promise;
        await onUsage?.({inputTokens: 10, outputTokens: 2, costUsd: 0.01});
        return {text: '{"result":"ok"}', usage: {inputTokens: 10, outputTokens: 2, costUsd: 0.01}};
      },
    });
    try {
      await vi.waitFor(() => expect(allowances).toHaveLength(3));
      expect(allowances.reduce((sum, value) => sum + value, 0)).toBeCloseTo(0.3);
    } finally {
      barrier.release();
    }
    expect((await result).spentUsd).toBeCloseTo(0.03);
  });

  it("cancels running work and prevents pending starts", async () => {
    const options = setup([step("source"), step("next", ["source"])]);
    const cancellation = new AbortController();
    const calls: string[] = [];
    const result = runWorkflow({
      ...options,
      signal: cancellation.signal,
      execute: async ({agent, signal}) => {
        calls.push(agent.name);
        await new Promise<void>((resolve) => signal!.addEventListener("abort", () => resolve(), {once: true}));
        throw new Error("Cancelled");
      },
    });
    await vi.waitFor(() => expect(calls).toEqual(["source"]));
    cancellation.abort();
    const stopped = await result;
    expect(calls).toEqual(["source"]);
    expect(stopped.steps[0]?.status).toBe("cancelled");
    expect(stopped.steps[1]?.attempt).toBe(0);
  });

  it("requires an explicit decision before retrying an uncertain external action", async () => {
    const options = setup([step("send", [], "external")]);
    const first = await runWorkflow({
      ...options,
      execute: async () => {
        throw new Error("Connection lost after request");
      },
    });
    const execute = vi.fn(async () => ({text: '{"result":"ok"}', usage: {inputTokens: 1, outputTokens: 1, costUsd: 0}}));
    await expect(runWorkflow({...options, resume: first, execute})).rejects.toThrow("allowExternalRetry");
    expect(execute).not.toHaveBeenCalled();
    const resumed = await runWorkflow({...options, resume: first, allowExternalRetry: true, execute});
    expect(resumed.steps[0]?.actionId).toBe(first.steps[0]?.actionId);
    expect(resumed.status).toBe("completed");
  });

  it.each([[step("a", ["missing"])], [step("a", ["a"])], [step("a", ["b"]), step("b", ["a"])]])("rejects missing or circular prerequisites before dispatch", (...steps) => {
    expect(() => workflowLayers(steps)).toThrow();
  });
});
