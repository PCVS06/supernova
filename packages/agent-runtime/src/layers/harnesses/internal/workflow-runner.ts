import {randomUUID} from "node:crypto";
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

/** Ends the run on one step, leaving the cursor there so a resume retries exactly that step. */
function endedRun(run: WorkflowRun, index: number, record: WorkflowStepExecutionRecord, spentUsd = run.spentUsd): WorkflowRun {
  const at = new Date().toISOString();
  return {
    ...run,
    steps: run.steps.map((item, position) => (position === index ? record : item)),
    status: record.status === "cancelled" ? "cancelled" : "failed",
    spentUsd,
    error: record.error,
    finishedAt: at,
  };
}

/**
 * Why the run must stop before the step at the cursor, if anything. The wall clock is measured over this pass because a
 * resumed run may have waited for a person, while the spend cap is cumulative over the whole run.
 */
function limitReached(run: WorkflowRun, deadline: number, executed: ReadonlySet<string>): string | undefined {
  const {maxCostUsd, maxWallClockSeconds} = run.workflow.limits;
  if (Date.now() >= deadline) return `Workflow ${run.workflow.name} reached its wall-clock limit of ${maxWallClockSeconds} seconds.`;
  if (maxCostUsd !== undefined && run.spentUsd >= maxCostUsd)
    return `Workflow ${run.workflow.name} reached its cost limit of ${maxCostUsd} USD after spending ${run.spentUsd.toFixed(4)} USD.`;
  const previous = run.steps[run.cursor - 1];
  const cap = run.workflow.steps[run.cursor - 1]?.limits?.maxCostUsd;
  if (previous?.usage && cap !== undefined && executed.has(previous.stepId) && previous.usage.costUsd >= cap)
    return `Step ${previous.stepId} spent ${previous.usage.costUsd.toFixed(4)} USD, reaching its limit of ${cap} USD.`;
  return undefined;
}

/** Starts a fresh run with one pending record per step and a stable action id per step. */
function createdRun(input: {snapshot: HarnessSnapshot; workflow: HarnessWorkflow; chatId: string; task: string}): WorkflowRun {
  const at = new Date().toISOString();
  return {
    id: randomUUID(),
    chatId: input.chatId,
    harnessId: input.snapshot.harness.id,
    projectId: input.snapshot.project.id,
    workflowId: input.workflow.id,
    workflowName: input.workflow.name,
    workflowRevision: input.snapshot.revision,
    task: input.task,
    status: "running",
    cursor: 0,
    stepCount: input.workflow.steps.length,
    spentUsd: 0,
    startedAt: at,
    updatedAt: at,
    workflow: input.workflow,
    steps: input.workflow.steps.map((step) => ({stepId: step.id, agent: step.agent, actionId: randomUUID(), attempt: 0, status: "pending", input: {}})),
  };
}

/** Reopens an existing run in place, refusing a rerun that could repeat an external action. */
function resumedRun(run: WorkflowRun, allowExternalRetry: boolean): WorkflowRun {
  const record = run.steps[run.cursor];
  const step = run.workflow.steps[run.cursor];
  if (record && step && step.effects === "external" && record.status === "failed" && record.attempt > 0 && !allowExternalRetry)
    throw new Error(
      `Step ${step.id} of ${run.workflow.name} has external effects and its attempt ${record.attempt} failed (action ${record.actionId}), so it is not rerun automatically. ${externalRetryGuidance}`
    );
  return {...run, status: "running", error: undefined, finishedAt: undefined};
}

export interface RunWorkflowOptions {
  readonly snapshot: HarnessSnapshot;
  readonly workflow: HarnessWorkflow;
  readonly chatId: string;
  readonly task: string;
  readonly store: HarnessRunStore;
  readonly execute: WorkflowStepExecutor;
  /** An existing run to continue in place. Its frozen workflow is executed, not the harness's current one. */
  readonly resume?: WorkflowRun;
  readonly allowExternalRetry?: boolean;
  readonly signal?: AbortSignal;
}

/** Runs a workflow's steps in order, validating each handoff and persisting the run at every step boundary. */
export async function runWorkflow(options: RunWorkflowOptions): Promise<WorkflowRun> {
  const {snapshot, store, execute, signal} = options;
  let run = options.resume ? resumedRun(options.resume, options.allowExternalRetry === true) : createdRun(options);
  const deadline = Date.now() + run.workflow.limits.maxWallClockSeconds * 1000;
  const executed = new Set<string>();
  const persist = async (next: WorkflowRun): Promise<void> => {
    run = {...next, updatedAt: new Date().toISOString()};
    await store.saveWorkflowRun(run);
  };
  await persist(run);
  while (run.cursor < run.workflow.steps.length) {
    const index = run.cursor;
    const step = run.workflow.steps[index]!;
    const pending = run.steps[index]!;
    const stop = limitReached(run, deadline, executed);
    if (stop) {
      await persist(endedRun(run, index, {...pending, status: "failed", failureKind: "limit", error: stop}));
      return run;
    }
    if (signal?.aborted) {
      await persist(endedRun(run, index, {...pending, status: "cancelled", failureKind: "cancelled", error: `Step ${step.id} was cancelled before it started.`}));
      return run;
    }
    const defined = snapshot.harness.agents.find((item) => item.name === step.agent);
    if (!defined) {
      const error = `Step ${step.id} runs the agent ${step.agent}, which this harness no longer defines.`;
      await persist(endedRun(run, index, {...pending, status: "failed", failureKind: "configuration", error}));
      return run;
    }
    const reads = Object.fromEntries(step.reads.map((stepId) => [stepId, run.steps.find((item) => item.stepId === stepId)?.output ?? {}]));
    const started: WorkflowStepExecutionRecord = {
      ...pending,
      attempt: pending.attempt + 1,
      status: "running",
      startedAt: new Date().toISOString(),
      finishedAt: undefined,
      input: {task: run.task, reads},
      output: undefined,
      rawOutput: undefined,
      error: undefined,
      failureKind: undefined,
      usage: undefined,
    };
    await persist({...run, steps: run.steps.map((item, position) => (position === index ? started : item))});
    const {snapshot: child, agent} = stepExecution(snapshot, defined, step);
    const prompt = stepPrompt({workflow: run.workflow, step, position: index, task: run.task, actionId: started.actionId, reads});
    let worked: Awaited<ReturnType<WorkflowStepExecutor>>;
    try {
      worked = await execute({snapshot: child, agent, task: prompt, signal});
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const failureKind = signal?.aborted ? "cancelled" : error instanceof HarnessConfigurationFailure ? "configuration" : "provider";
      const status = failureKind === "cancelled" ? "cancelled" : "failed";
      await persist(endedRun(run, index, {...started, status, failureKind, error: message, finishedAt: new Date().toISOString()}));
      return run;
    }
    const finished = {...started, runId: worked.runId, usage: worked.usage, rawOutput: worked.text, finishedAt: new Date().toISOString()};
    const spentUsd = run.spentUsd + worked.usage.costUsd;
    const validated = validateStepOutput(step, worked.text);
    if ("error" in validated) {
      await persist(endedRun(run, index, {...finished, status: "failed", failureKind: "malformed_output", error: validated.error}, spentUsd));
      return run;
    }
    executed.add(step.id);
    await persist({
      ...run,
      steps: run.steps.map((item, position) => (position === index ? {...finished, status: "completed", output: validated.output} : item)),
      cursor: index + 1,
      spentUsd,
    });
  }
  await persist({...run, status: "completed", finishedAt: new Date().toISOString()});
  return run;
}

/** Reports the run to the calling agent: what every step did, the validated result, the spend, and how to resume. */
export function describeWorkflowRun(run: WorkflowRun): string {
  const steps = run.steps.map((record, index) => {
    const detail = record.failureKind ? ` — ${record.failureKind}: ${record.error ?? "no detail"}` : record.attempt > 1 ? ` (attempt ${record.attempt})` : "";
    return `${index + 1}. ${record.stepId} [${record.agent}] ${record.status}${detail}`;
  });
  const completed = [...run.steps].reverse().find((record) => record.status === "completed" && record.output);
  const limit = run.workflow.limits.maxCostUsd !== undefined ? ` of ${run.workflow.limits.maxCostUsd.toFixed(2)} USD` : "";
  return [
    `Workflow ${run.workflowName} ${run.status}: ${run.cursor} of ${run.stepCount} steps done.`,
    steps.join("\n"),
    completed ? `Output of ${completed.stepId}:\n${JSON.stringify(completed.output, null, 2)}` : "No step produced validated output.",
    `Spend: ${run.spentUsd.toFixed(4)} USD${limit}.`,
    ...(run.status === "completed" ? [] : [`Resume with harness_workflow and resumeRunId ${run.id} once the cause is fixed. Completed steps are not run again.`]),
  ].join("\n\n");
}
