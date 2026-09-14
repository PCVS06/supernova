import {Schema} from "effect";
import {HarnessRunSummary, WorkflowRunSummary} from "@supernova/contracts/harnesses/schemas";
import {SessionSummary} from "@supernova/contracts/sessions/schemas";
import {SessionControls} from "@supernova/contracts/session-runtime/schemas";

export const WorkspaceOverviewPayload = Schema.Struct({projectPaths: Schema.optional(Schema.Array(Schema.String)), pinnedSessionIds: Schema.optional(Schema.Array(Schema.String))});
/** Bounded navigation summaries; no worker transcript, model prompt or full chat is sent. */
export const WorkspaceOverviewResult = Schema.Struct({
  revision: Schema.Number,
  capturedAt: Schema.String,
  projects: Schema.Array(Schema.Struct({projectId: Schema.String, projectPath: Schema.String, sessions: Schema.Array(SessionSummary), total: Schema.Number})),
  runs: Schema.Array(HarnessRunSummary),
  workflows: Schema.Array(WorkflowRunSummary),
  controls: Schema.Array(SessionControls),
  curators: Schema.Array(Schema.Struct({harnessId: Schema.String, pending: Schema.Number, updatedAt: Schema.optional(Schema.String)})),
  activityTotals: Schema.Array(Schema.Struct({sessionId: Schema.String, runs: Schema.Number, workflows: Schema.Number})),
  errors: Schema.Array(Schema.String),
});
export type WorkspaceOverviewResult = typeof WorkspaceOverviewResult.Type;
