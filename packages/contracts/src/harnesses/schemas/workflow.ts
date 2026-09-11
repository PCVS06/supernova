import {Schema} from "effect";
import {ModelReference} from "@supernova/contracts/sessions/schemas";

/** Value types a handoff field may carry. A closed set so the runtime can validate without a schema registry. */
export const WorkflowFieldType = Schema.Literals(["string", "number", "boolean", "string[]"]);

/** One typed field of a step's output contract. */
export const WorkflowField = Schema.Struct({
  name: Schema.String,
  type: WorkflowFieldType,
  description: Schema.optional(Schema.String),
  required: Schema.Boolean,
});

/** The output contract of a step; the runtime rejects output that does not satisfy it. */
export const WorkflowOutputContract = Schema.Struct({fields: Schema.Array(WorkflowField)});

/** Per-step model and effort override, layered over the referenced agent's own execution settings. */
export const WorkflowStepExecution = Schema.Struct({model: Schema.optional(ModelReference), effort: Schema.optional(Schema.String)});

/** Per-step limit overrides; unset values inherit the harness loop and workflow limits. */
export const WorkflowStepLimits = Schema.Struct({
  maxTurns: Schema.optional(Schema.Number),
  timeoutSeconds: Schema.optional(Schema.Number),
  maxCostUsd: Schema.optional(Schema.Number),
});

/** What a step may touch. Decides retry safety: external effects are never re-run automatically. */
export const WorkflowStepEffects = Schema.Literals(["none", "workspace", "external"]);

/** One step of a workflow. It references an existing agent and inherits that agent's prompt, tools and settings. */
export const WorkflowStep = Schema.Struct({
  id: Schema.String,
  agent: Schema.String,
  instructions: Schema.String,
  reads: Schema.Array(Schema.String),
  output: WorkflowOutputContract,
  effects: WorkflowStepEffects,
  execution: Schema.optional(WorkflowStepExecution),
  limits: Schema.optional(WorkflowStepLimits),
});

/** A named, sequential workflow shared by every project of a harness. */
export const HarnessWorkflow = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  description: Schema.String,
  steps: Schema.Array(WorkflowStep),
  limits: Schema.Struct({maxCostUsd: Schema.optional(Schema.Number), maxWallClockSeconds: Schema.Number}),
});

export const WorkflowStepStatus = Schema.Literals(["pending", "running", "completed", "failed", "skipped", "cancelled"]);

/** Why a step stopped. Malformed output and limits are semantic failures and are never retried automatically. */
export const WorkflowFailureKind = Schema.Literals(["malformed_output", "provider", "limit", "cancelled", "configuration", "unknown"]);

export const WorkflowStepUsage = Schema.Struct({inputTokens: Schema.Number, outputTokens: Schema.Number, costUsd: Schema.Number});

/** The execution record of one step within one run. Retries increment `attempt` and keep `actionId`. */
export const WorkflowStepExecutionRecord = Schema.Struct({
  stepId: Schema.String,
  agent: Schema.String,
  /** Stable identity of the logical action across retries of this step in this run; a new run gets new ids. */
  actionId: Schema.String,
  attempt: Schema.Number,
  status: WorkflowStepStatus,
  startedAt: Schema.optional(Schema.String),
  finishedAt: Schema.optional(Schema.String),
  /** Receipt id of the specialist worker that executed this attempt, when one was started. */
  runId: Schema.optional(Schema.String),
  input: Schema.Record(Schema.String, Schema.Unknown),
  output: Schema.optional(Schema.Record(Schema.String, Schema.Unknown)),
  rawOutput: Schema.optional(Schema.String),
  error: Schema.optional(Schema.String),
  failureKind: Schema.optional(WorkflowFailureKind),
  usage: Schema.optional(WorkflowStepUsage),
});

export const WorkflowRunStatus = Schema.Literals(["running", "completed", "failed", "cancelled", "interrupted"]);

export const WorkflowRunSummary = Schema.Struct({
  id: Schema.String,
  chatId: Schema.String,
  harnessId: Schema.String,
  projectId: Schema.String,
  workflowId: Schema.String,
  workflowName: Schema.String,
  /** Library revision the frozen workflow copy was taken from. */
  workflowRevision: Schema.Number,
  task: Schema.String,
  status: WorkflowRunStatus,
  /** Index of the next step to execute; equals the step count when every step finished. */
  cursor: Schema.Number,
  stepCount: Schema.Number,
  spentUsd: Schema.Number,
  startedAt: Schema.String,
  updatedAt: Schema.String,
  finishedAt: Schema.optional(Schema.String),
  error: Schema.optional(Schema.String),
});

/** A durable, resumable workflow run. The workflow definition is frozen so a resume cannot see a later edit. */
export const WorkflowRun = Schema.Struct({
  ...WorkflowRunSummary.fields,
  workflow: HarnessWorkflow,
  steps: Schema.Array(WorkflowStepExecutionRecord),
});

export type WorkflowFieldType = typeof WorkflowFieldType.Type;
export type WorkflowField = typeof WorkflowField.Type;
export type WorkflowOutputContract = typeof WorkflowOutputContract.Type;
export type WorkflowStepExecution = typeof WorkflowStepExecution.Type;
export type WorkflowStepLimits = typeof WorkflowStepLimits.Type;
export type WorkflowStepEffects = typeof WorkflowStepEffects.Type;
export type WorkflowStep = typeof WorkflowStep.Type;
export type HarnessWorkflow = typeof HarnessWorkflow.Type;
export type WorkflowStepStatus = typeof WorkflowStepStatus.Type;
export type WorkflowFailureKind = typeof WorkflowFailureKind.Type;
export type WorkflowStepUsage = typeof WorkflowStepUsage.Type;
export type WorkflowStepExecutionRecord = typeof WorkflowStepExecutionRecord.Type;
export type WorkflowRunStatus = typeof WorkflowRunStatus.Type;
export type WorkflowRunSummary = typeof WorkflowRunSummary.Type;
export type WorkflowRun = typeof WorkflowRun.Type;
