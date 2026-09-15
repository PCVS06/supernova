import {Schema} from "effect";

/** Shared fields for every checkpoint navigation command. */
const CheckpointNavigationFields = {
  /** Allows discarding conflicting or uncaptured workspace changes. */
  force: Schema.optional(Schema.Boolean),
  review: Schema.optional(Schema.Boolean),
  reviewFingerprint: Schema.optional(Schema.String),
  sessionId: Schema.String,
};

export const RevertToMessagePayload = Schema.Struct({
  ...CheckpointNavigationFields,
  turnId: Schema.String,
});

export const UndoCheckpointPayload = Schema.Struct(CheckpointNavigationFields);

export const RedoCheckpointPayload = Schema.Struct(CheckpointNavigationFields);

/** Navigation failure with no actionable detail, reported for every cause except a workspace conflict. */
export class CheckpointGenericError extends Schema.TaggedErrorClass<CheckpointGenericError>()("CheckpointGenericError", {
  cause: Schema.optional(Schema.Defect),
  message: Schema.String,
}) {}

/** Raised when restoring would discard workspace changes made after the current checkpoint. Retry with `force` to discard them. */
export class CheckpointConflictError extends Schema.TaggedErrorClass<CheckpointConflictError>()("CheckpointConflictError", {
  cause: Schema.optional(Schema.Defect),
  message: Schema.String,
}) {}

/** Raised when the current boundary has no workspace snapshot. Retry with `force` to restore the captured target. */
export class CheckpointUncapturedError extends Schema.TaggedErrorClass<CheckpointUncapturedError>()("CheckpointUncapturedError", {
  message: Schema.String,
}) {}

export const CheckpointPreview = Schema.Struct({
  fingerprint: Schema.String,
  filesCaptured: Schema.Boolean,
  manualChanges: Schema.Boolean,
  files: Schema.Array(Schema.Struct({path: Schema.String, action: Schema.Literals(["restore", "delete"])})),
  patches: Schema.Array(Schema.Struct({repository: Schema.String, patch: Schema.String, unavailable: Schema.Boolean})),
});

/** Read-only restore plan, returned before navigation so the user can inspect its exact scope. */
export class CheckpointReviewRequired extends Schema.TaggedErrorClass<CheckpointReviewRequired>()("CheckpointReviewRequired", {
  message: Schema.String,
  preview: CheckpointPreview,
}) {}

export const CheckpointNavigationError = Schema.Union([CheckpointGenericError, CheckpointConflictError, CheckpointUncapturedError, CheckpointReviewRequired]);

export type CheckpointPreview = typeof CheckpointPreview.Type;
export type CheckpointNavigationError = typeof CheckpointNavigationError.Type;
export type RevertToMessagePayload = typeof RevertToMessagePayload.Type;
export type UndoCheckpointPayload = typeof UndoCheckpointPayload.Type;
export type RedoCheckpointPayload = typeof RedoCheckpointPayload.Type;
