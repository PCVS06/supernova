import {Schema} from "effect";
import {ModelReference, UserMessageContentPart} from "@supernova/contracts/sessions/schemas";
import {SessionControls} from "@supernova/contracts/session-runtime/schemas";

export const GetSessionControlsPayload = Schema.Struct({sessionId: Schema.String});
export const GetSessionControlsResult = SessionControls;

export const SessionControlsAction = Schema.Union([
  Schema.Struct({
    type: Schema.Literal("enqueue"),
    contentParts: Schema.Array(UserMessageContentPart),
    modelReference: ModelReference,
    captureCheckpoints: Schema.optional(Schema.Boolean),
  }),
  Schema.Struct({type: Schema.Literals(["remove_queued", "steer_queued"]), id: Schema.String}),
  Schema.Struct({type: Schema.Literal("edit_queued"), id: Schema.String, text: Schema.String, expectedRevision: Schema.Number}),
  Schema.Struct({type: Schema.Literal("move_queued"), id: Schema.String, direction: Schema.Literals(["up", "down"]), expectedRevision: Schema.Number}),
  Schema.Struct({
    type: Schema.Literal("start_goal"),
    objective: Schema.String,
    modelReference: ModelReference,
    captureCheckpoints: Schema.optional(Schema.Boolean),
    maxTurns: Schema.optional(Schema.Number),
  }),
  Schema.Struct({
    type: Schema.Literal("update_goal"),
    id: Schema.String,
    objective: Schema.String,
    modelReference: ModelReference,
    captureCheckpoints: Schema.optional(Schema.Boolean),
  }),
  Schema.Struct({type: Schema.Literals(["pause_goal", "resume_goal", "clear_goal", "complete_goal", "pause_queue", "resume_queue"])}),
]);

export const UpdateSessionControlsPayload = Schema.Struct({sessionId: Schema.String, action: SessionControlsAction});
export const UpdateSessionControlsResult = SessionControls;

/** Failure to read controls for a known, accessible session. */
export class GetSessionControlsError extends Schema.TaggedErrorClass<GetSessionControlsError>()("GetSessionControlsError", {message: Schema.String}) {}

/** Rejected transition or durable write failure; clients must retain unsent drafts. */
export class UpdateSessionControlsError extends Schema.TaggedErrorClass<UpdateSessionControlsError>()("UpdateSessionControlsError", {message: Schema.String}) {}

export type GetSessionControlsPayload = typeof GetSessionControlsPayload.Type;
export type GetSessionControlsResult = typeof GetSessionControlsResult.Type;
export type UpdateSessionControlsPayload = typeof UpdateSessionControlsPayload.Type;
export type UpdateSessionControlsResult = typeof UpdateSessionControlsResult.Type;
export type SessionControlsAction = typeof SessionControlsAction.Type;
