import {createHash, randomUUID} from "node:crypto";
import {realpath} from "node:fs/promises";
import {workflowDependencies, workflowLayers, workflowStepSummaries} from "@supernova/contracts/harnesses/workflow-graph";
import {withWorkflowWorkspace} from "@supernova/agent-runtime/layers/harnesses/internal/workflow-workspace-lease";
import {Type} from "typebox";
import type {TSchema} from "typebox";
import {Value} from "typebox/value";
import type {
  HarnessAgent,
  HarnessSnapshot,
  HarnessWorkflow,
  WorkflowField,
  WorkflowRun,
  WorkflowStep,
  WorkflowStepExecutionRecord,
  WorkflowStepUsage,
} from "@supernova/contracts/harnesses/schemas";
import type {HarnessRunStore} from "@supernova/agent-runtime/layers/harnesses/internal/harness-run-store";
import {HarnessConfigurationFailure} from "@supernova/agent-runtime/layers/harnesses/lib/harness-failures";

/** What one step is handed to the specialist worker path, and what that worker returns. */
export type WorkflowStepExecutor = (input: {
  readonly snapshot: HarnessSnapshot;
  readonly agent: HarnessAgent;
  readonly task: string;
  readonly signal?: AbortSignal;
  readonly effects?: WorkflowStep["effects"];
  readonly maxCostUsd?: number;
  readonly onStarted?: (runId: string) => Promise<void>;
  readonly onUsage?: (usage: WorkflowStepUsage) => Promise<void>;
}) => Promise<{readonly runId?: string; readonly text: string; readonly usage: WorkflowStepUsage}>;

const externalRetryGuidance = "Resume with allowExternalRetry set to true once you know the external action did not happen, or finish that action by hand instead.";

/** Builds the step's output contract as a closed TypeBox object, so the same check runs on every provider. */
function outputSchema(fields: readonly WorkflowField[]): TSchema {
  const properties: Record<string, TSchema> = {};
  for (const field of fields) {
    const value = field.type === "number" ? Type.Number() : field.type === "boolean" ? Type.Boolean() : field.type === "string[]" ? Type.Array(Type.String()) : Type.String();
    properties[field.name] = field.required ? value : Type.Optional(value);
  }
  return Type.Object(properties, {additionalProperties: false});
}

/** Returns the last balanced top-level object in free text, ignoring braces inside strings. */
function lastObjectLiteral(text: string): string | undefined {
  let depth = 0;
  let start = -1;
  let inString = false;
  let escaped = false;
  let found: string | undefined;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === '"') inString = false;
      continue;
    }
    if (character === '"') inString = true;
    else if (character === "{") {
      if (depth === 0) start = index;
      depth += 1;
    } else if (character === "}" && depth > 0) {
      depth -= 1;
      if (depth === 0) found = text.slice(start, index + 1);
    }
  }
  return found;
}

/** Prefers a fenced json block, then the last balanced object, so a worker's prose around the result is harmless. */
function jsonCandidates(text: string): string[] {
  const fenced = [...text.matchAll(/```json\s*([\s\S]*?)```/gi)].map((match) => match[1]?.trim()).filter((value): value is string => Boolean(value));
  const literal = lastObjectLiteral(text);
  return [...fenced.slice(-1), ...(literal ? [literal] : [])];
}

/** Validates the worker's text against the step contract locally; provider JSON modes are never trusted. */
function validateStepOutput(step: WorkflowStep, text: string): {output: Record<string, unknown>} | {error: string} {
  const schema = outputSchema(step.output.fields);
  const issues: string[] = [];
  for (const candidate of jsonCandidates(text)) {
    let value: unknown;
    try {
      value = JSON.parse(candidate);
    } catch {
      continue;
    }
    if (typeof value !== "object" || value === null || Array.isArray(value)) continue;
    if (Value.Check(schema, value)) return {output: value as Record<string, unknown>};
    issues.push(...Value.Errors(schema, value).map((error) => `${error.instancePath ? error.instancePath.slice(1) : "the output object"} ${error.message}`));
  }
  const required = step.output.fields.filter((field) => field.required).map((field) => `${field.name} (${field.type})`);
  return {
    error: issues.length
      ? `Step ${step.id} returned output that does not match its contract: ${[...new Set(issues)].join("; ")}.`
      : `Step ${step.id} returned no JSON object. It must return one object with the fields ${required.join(", ")}.`,
  };
}

/** Renders the output contract as the field list the worker has to fill in. */
function contractLines(fields: readonly WorkflowField[]): string {
  return fields.map((field) => `- ${field.name} (${field.type}, ${field.required ? "required" : "optional"})${field.description ? `: ${field.description}` : ""}`).join("\n");
}

/** Builds the step prompt from the run task, the step's own instructions, and only the outputs it reads. */
function stepPrompt(input: {workflow: HarnessWorkflow; step: WorkflowStep; position: number; task: string; actionId: string; reads: Record<string, unknown>}): string {
  const {workflow, step, position, task, actionId, reads} = input;
  const handoffs = Object.entries(reads).map(([stepId, output]) => `${stepId}:\n${JSON.stringify(output, null, 2)}`);
  return [
    `Workflow ${workflow.name}, step ${position + 1} of ${workflow.steps.length} (${step.id}).`,
    `Run task:\n${task}`,
    ...(step.instructions ? [`Your instructions for this step:\n${step.instructions}`] : []),
    ...(handoffs.length ? [`Validated output of the steps you read:\n${handoffs.join("\n\n")}`] : []),
    `Required output: end your final answer with one JSON object in a \`\`\`json block and no other fields:\n${contractLines(step.output.fields)}`,
    `Idempotency: this step's action id is ${actionId}. Any action outside this workspace must carry that id and must never be performed twice; a retry of this step reuses the same id.`,
  ].join("\n\n");
}

/** Layers the step's overrides onto the referenced agent and onto a copy of the snapshot's loop settings. */
function stepExecution(snapshot: HarnessSnapshot, agent: HarnessAgent, step: WorkflowStep): {snapshot: HarnessSnapshot; agent: HarnessAgent} {
  const loop = {
    maxTurns: step.limits?.maxTurns ?? snapshot.harness.loop.maxTurns,
    timeoutSeconds: step.limits?.timeoutSeconds ?? snapshot.harness.loop.timeoutSeconds,
  };
  return {
    snapshot: {...snapshot, harness: {...snapshot.harness, loop}},
    agent: step.execution ? {...agent, execution: {...agent.execution, ...step.execution}} : agent,
  };
}

/** Creates a durable logical action once per step, independent of execution attempts. */
function createdRun(options: RunWorkflowOptions, id: string): WorkflowRun {
  const at = new Date().toISOString();
  return {
    id,
    chatId: options.chatId,
    harnessId: options.snapshot.harness.id,
    projectId: options.snapshot.project.id,
    workflowId: options.workflow.id,
    workflowName: options.workflow.name,
    workflowRevision: options.snapshot.revision,
    invocationId: options.invocationId,
    task: options.task,
    status: "running",
    cursor: 0,
    completedCount: 0,
    revision: 0,
    activeElapsedMs: 0,
    stepCount: options.workflow.steps.length,
    spentUsd: 0,
    startedAt: at,
    updatedAt: at,
    workflow: options.workflow,
    steps: options.workflow.steps.map((step) => ({stepId: step.id, agent: step.agent, actionId: randomUUID(), attempt: 0, status: "pending", input: {}})),
  };
}

/** Refuses uncertain external repeats, and preserves completed branches on continuation. */
function resumedRun(run: WorkflowRun, allowExternalRetry: boolean): WorkflowRun {
  for (const record of run.steps) {
    const step = run.workflow.steps.find((item) => item.id === record.stepId);
    if (record.status !== "completed" && record.attempt > 0 && step?.effects === "external" && !allowExternalRetry)
      throw new Error(`Step ${record.stepId} of ${run.workflowName} has external effects and an unfinished attempt (action ${record.actionId}). ${externalRetryGuidance}`);
  }
  return {
    ...run,
    status: "running",
    error: undefined,
    finishedAt: undefined,
    steps: run.steps.map((record) => (record.status === "completed" ? record : {...record, status: "pending", waitReason: undefined})),
  };
}

/** Dispatches ready steps, keeping all state transitions behind one persistence queue. */
async function executeWorkflow(options: RunWorkflowOptions, initial: WorkflowRun): Promise<WorkflowRun> {
  const {snapshot, store, execute} = options;
  workflowLayers(initial.workflow.steps);
  const workspacePath = await realpath(snapshot.project.path);
  let run = initial;
  const started = Date.now();
  const elapsed = initial.activeElapsedMs ?? 0;
  const remainingMs = initial.workflow.limits.maxWallClockSeconds * 1000 - elapsed;
  const cancellation = new AbortController();
  const signal = options.signal ? AbortSignal.any([options.signal, cancellation.signal]) : cancellation.signal;
  let stopReason: string | undefined;
  const timer = setTimeout(
    () => {
      stopReason = `Workflow ${run.workflowName} reached its wall-clock limit of ${run.workflow.limits.maxWallClockSeconds} seconds.`;
      cancellation.abort();
    },
    Math.max(0, remainingMs)
  );
  timer.unref();
  const active = new Map<string, Promise<void>>();
  const reserved = new Map<string, number>();
  const attemptSpend = new Map<string, number>();
  let fatalError: unknown;
  let writes = Promise.resolve();
  const persist = (update: (current: WorkflowRun) => WorkflowRun): Promise<void> => {
    writes = writes.then(async () => {
      const next = update(run);
      const firstUnfinished = next.steps.findIndex((record) => record.status !== "completed");
      run = {
        ...next,
        cursor: firstUnfinished < 0 ? next.steps.length : firstUnfinished,
        completedCount: next.steps.filter((record) => record.status === "completed").length,
        revision: (run.revision ?? 0) + 1,
        updatedAt: new Date().toISOString(),
        activeElapsedMs: elapsed + Date.now() - started,
        stepStates: workflowStepSummaries(next),
      };
      await store.saveWorkflowRun(run);
      options.onUpdate?.(run);
    });
    return writes;
  };
  const updateStep = (id: string, update: (record: WorkflowStepExecutionRecord) => WorkflowStepExecutionRecord) =>
    persist((current) => ({...current, steps: current.steps.map((record) => (record.stepId === id ? update(record) : record))}));

  const work = async (step: WorkflowStep, allowance?: number): Promise<void> => {
    const childAbort = new AbortController();
    const childSignal = AbortSignal.any([signal, childAbort.signal]);
    const usage = (reported: WorkflowStepUsage): Promise<void> =>
      persist((current) => {
        const record = current.steps.find((item) => item.stepId === step.id)!;
        if (record.status !== "running") return current;
        attemptSpend.set(step.id, reported.costUsd);
        const spentUsd = current.spentUsd + Math.max(0, reported.costUsd - (record.usage?.costUsd ?? 0));
        if (allowance !== undefined && reported.costUsd >= allowance) childAbort.abort();
        if (current.workflow.limits.maxCostUsd !== undefined && spentUsd >= current.workflow.limits.maxCostUsd) {
          stopReason = `Workflow ${current.workflowName} reached its cost limit of ${current.workflow.limits.maxCostUsd} USD.`;
          cancellation.abort();
        }
        return {...current, spentUsd, steps: current.steps.map((item) => (item.stepId === step.id ? {...item, usage: reported} : item))};
      });
    try {
      await updateStep(step.id, (record) => ({...record, waitReason: step.effects === "none" ? "Waiting for workspace access" : "Waiting for exclusive workspace access"}));
      await withWorkflowWorkspace(workspacePath, step.effects !== "none", childSignal, async () => {
        const defined = snapshot.harness.agents.find((agent) => agent.name === step.agent);
        if (!defined) throw new HarnessConfigurationFailure(`Agent ${step.agent} is no longer defined.`);
        const reads = Object.fromEntries(
          step.reads.map((id) => {
            const source = run.steps.find((record) => record.stepId === id);
            if (source?.status !== "completed" || !source.output) throw new HarnessConfigurationFailure(`Step ${step.id} requires the validated output of ${id}.`);
            return [id, source.output];
          })
        );
        await updateStep(step.id, (record) => ({
          ...record,
          status: "running",
          attempt: record.attempt + 1,
          startedAt: new Date().toISOString(),
          finishedAt: undefined,
          input: {task: run.task, reads},
          output: undefined,
          rawOutput: undefined,
          error: undefined,
          failureKind: undefined,
          waitReason: undefined,
          usage: undefined,
          runId: undefined,
        }));
        const record = run.steps.find((item) => item.stepId === step.id)!;
        const {snapshot: child, agent} = stepExecution(snapshot, defined, step);
        const task = stepPrompt({workflow: run.workflow, step, position: run.workflow.steps.indexOf(step), task: run.task, actionId: record.actionId, reads});
        const worked = await execute({
          snapshot: child,
          agent,
          task,
          signal: childSignal,
          effects: step.effects,
          maxCostUsd: allowance,
          onStarted: (runId) => updateStep(step.id, (item) => ({...item, runId})),
          onUsage: usage,
        });
        // A completed reply is accounted even when it crossed a per-reply billing boundary.
        await usage(worked.usage);
        const validated = validateStepOutput(step, worked.text);
        await updateStep(step.id, (item) => ({
          ...item,
          runId: worked.runId ?? item.runId,
          rawOutput: worked.text,
          finishedAt: new Date().toISOString(),
          ...("error" in validated ? {status: "failed", failureKind: "malformed_output", error: validated.error} : {status: "completed", output: validated.output}),
        }));
        if (step.limits?.maxCostUsd !== undefined && worked.usage.costUsd >= step.limits.maxCostUsd)
          stopReason = `Step ${step.id} spent ${worked.usage.costUsd.toFixed(4)} USD, reaching its limit of ${step.limits.maxCostUsd} USD.`;
      });
    } catch (error) {
      const limit = stopReason ?? (childAbort.signal.aborted ? `Step ${step.id} reached its cost allowance.` : undefined);
      await updateStep(step.id, (record) => ({
        ...record,
        status: limit ? "failed" : signal.aborted ? "cancelled" : "failed",
        finishedAt: new Date().toISOString(),
        waitReason: undefined,
        failureKind: limit ? "limit" : signal.aborted ? "cancelled" : error instanceof HarnessConfigurationFailure ? "configuration" : "provider",
        error: limit ?? (error instanceof Error ? error.message : String(error)),
      }));
    } finally {
      reserved.delete(step.id);
      attemptSpend.delete(step.id);
    }
  };

  try {
    await persist((current) => current);
    while (true) {
      if (fatalError) throw fatalError;
      if (remainingMs <= Date.now() - started && !stopReason) {
        stopReason = `Workflow ${run.workflowName} reached its wall-clock limit of ${run.workflow.limits.maxWallClockSeconds} seconds.`;
        cancellation.abort();
      }
      const limit = run.workflow.limits.maxCostUsd;
      if (limit !== undefined && run.spentUsd >= limit && !stopReason) stopReason = `Workflow ${run.workflowName} reached its cost limit of ${limit} USD.`;
      for (const step of run.workflow.steps) {
        if (active.has(step.id)) continue;
        const record = run.steps.find((item) => item.stepId === step.id)!;
        if (record.status !== "pending") continue;
        const dependencies = workflowDependencies(step).map((id) => run.steps.find((item) => item.stepId === id)!);
        const failed = dependencies.filter((item) => ["failed", "blocked", "cancelled"].includes(item.status));
        if (failed.length) {
          await updateStep(step.id, (item) => ({...item, status: "blocked", waitReason: `Waiting for ${failed.map((source) => source.stepId).join(", ")} to succeed`}));
          continue;
        }
        if (stopReason || signal.aborted) {
          await updateStep(step.id, (item) => ({
            ...item,
            status: stopReason ? "failed" : "cancelled",
            failureKind: stopReason ? "limit" : "cancelled",
            error: stopReason ?? "Workflow cancelled before this step started.",
            waitReason: undefined,
          }));
          continue;
        }
        const waiting = dependencies.filter((item) => item.status !== "completed");
        if (waiting.length) {
          const waitReason = `Waiting for ${waiting.map((item) => item.stepId).join(", ")}`;
          if (record.waitReason !== waitReason) await updateStep(step.id, (item) => ({...item, waitReason}));
          continue;
        }
        const capacity = run.workflow.maxParallel ?? 1;
        if (active.size >= capacity) {
          if (record.waitReason !== "Waiting for available capacity") await updateStep(step.id, (item) => ({...item, waitReason: "Waiting for available capacity"}));
          continue;
        }
        const held = [...reserved].reduce((total, [id, amount]) => total + Math.max(0, amount - (attemptSpend.get(id) ?? 0)), 0);
        const available = limit === undefined ? undefined : Math.max(0, limit - run.spentUsd - held);
        if (available !== undefined && available < 0.000001 && active.size > 0) continue;
        const allowance = available === undefined ? step.limits?.maxCostUsd : Math.min(step.limits?.maxCostUsd ?? Infinity, available / (capacity - active.size));
        if (allowance !== undefined) reserved.set(step.id, allowance);
        const pending = work(step, allowance)
          .catch((error: unknown) => {
            fatalError = error;
            cancellation.abort();
          })
          .finally(() => active.delete(step.id));
        active.set(step.id, pending);
      }
      if (active.size > 0) {
        await Promise.race(active.values());
        continue;
      }
      if (fatalError) throw fatalError;
      if (run.steps.some((record) => record.status === "pending")) continue;
      break;
    }
    const failed = run.steps.find((record) => record.status === "failed" || record.status === "blocked");
    await persist((current) => ({
      ...current,
      status: failed ? "failed" : current.steps.every((record) => record.status === "completed") ? "completed" : "cancelled",
      error: failed?.error ?? failed?.waitReason ?? stopReason,
      finishedAt: new Date().toISOString(),
    }));
    return run;
  } finally {
    clearTimeout(timer);
    cancellation.abort();
    await Promise.allSettled(active.values());
  }
}

export interface RunWorkflowOptions {
  readonly snapshot: HarnessSnapshot;
  readonly workflow: HarnessWorkflow;
  readonly chatId: string;
  readonly task: string;
  readonly store: HarnessRunStore;
  readonly execute: WorkflowStepExecutor;
  readonly resume?: WorkflowRun;
  readonly allowExternalRetry?: boolean;
  readonly signal?: AbortSignal;
  readonly invocationId?: string;
  readonly onUpdate?: (run: WorkflowRun) => void;
}

/** Runs a persisted dependency graph with bounded parallelism, shared outputs and one owner per invocation. */
export async function runWorkflow(options: RunWorkflowOptions): Promise<WorkflowRun> {
  const id = options.resume?.id ?? (options.invocationId ? createHash("sha256").update(`${options.chatId}:${options.invocationId}`).digest("hex").slice(0, 40) : randomUUID());
  return options.store.executeWorkflow(options.chatId, id, async () => {
    let saved: WorkflowRun | undefined;
    try {
      saved = await options.store.getWorkflowRun(options.chatId, id);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    if (saved?.status === "completed" || (saved && !options.resume)) return saved;
    if (saved?.status === "running") throw new Error("This workflow is still running. Wait for its current execution before resuming.");
    const initial = saved ?? options.resume;
    return executeWorkflow(options, initial ? resumedRun(initial, options.allowExternalRetry === true) : createdRun(options, id));
  });
}

/** Reports recorded results and the exact continuation identity to the calling agent. */
export function describeWorkflowRun(run: WorkflowRun): string {
  const steps = run.steps.map(
    (record) => `${record.stepId} [${record.agent}] ${record.status}${record.error ? ` — ${record.error}` : record.waitReason ? ` — ${record.waitReason}` : ""}`
  );
  const terminals = run.workflow.steps.filter((step) => !run.workflow.steps.some((other) => workflowDependencies(other).includes(step.id)));
  const outputs = terminals.flatMap((step) => {
    const record = run.steps.find((item) => item.stepId === step.id && item.status === "completed");
    return record?.output ? [`Output of ${step.id}:\n${JSON.stringify(record.output, null, 2)}`] : [];
  });
  return [
    `Workflow ${run.workflowName} ${run.status}: ${run.steps.filter((step) => step.status === "completed").length} of ${run.stepCount} steps done.`,
    steps.join("\n"),
    ...outputs,
    `Spend: ${run.spentUsd.toFixed(4)} USD.`,
    ...(run.status === "completed" ? [] : [`Resume with harness_workflow and resumeRunId ${run.id} once the cause is fixed. Completed steps are not run again.`]),
  ].join("\n\n");
}
