import {Schema} from "effect";
import {ModelReference, UserMessageContentPart} from "@supernova/contracts/sessions/schemas";

export const QueuedSessionMessage = Schema.Struct({
  id: Schema.String,
  contentParts: Schema.Array(UserMessageContentPart),
  modelReference: ModelReference,
  captureCheckpoints: Schema.optional(Schema.Boolean),
  createdAt: Schema.String,
  deliveryStatus: Schema.optional(Schema.Literal("uncertain")),
});

export const SessionGoal = Schema.Struct({
  id: Schema.String,
  objective: Schema.String,
  status: Schema.Literals(["active", "paused", "completed", "blocked"]),
  turnsUsed: Schema.Number,
  maxTurns: Schema.Number,
  modelReference: ModelReference,
  captureCheckpoints: Schema.optional(Schema.Boolean),
  createdAt: Schema.String,
  updatedAt: Schema.String,
  message: Schema.optional(Schema.String),
});

export const SessionControls = Schema.Struct({
  sessionId: Schema.String,
  revision: Schema.Number,
  goal: Schema.NullOr(SessionGoal),
  queue: Schema.Array(QueuedSessionMessage),
  /** Accepted corrections owned by the current turn; not available for replay. */
  steering: Schema.optional(Schema.Array(QueuedSessionMessage)),
  queuePaused: Schema.Boolean,
  error: Schema.optional(Schema.String),
});

export type QueuedSessionMessage = typeof QueuedSessionMessage.Type;
export type SessionGoal = typeof SessionGoal.Type;
export type SessionControls = typeof SessionControls.Type;
