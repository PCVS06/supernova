import {Schema} from "effect";
import {ModelReference} from "@supernova/contracts/sessions/schemas";

/** Delivers a message to a running turn, interrupting it, instead of queuing it for the next one. */
export const SteerSessionPayload = Schema.Struct({
  sessionId: Schema.String,
  text: Schema.String,
  /** Explicitly preserve a correction as the next message if the current answer has already settled. */
  fallback: Schema.optional(Schema.Struct({modelReference: ModelReference, captureCheckpoints: Schema.optional(Schema.Boolean)})),
});

/** Acknowledges the single durable delivery chosen by the runtime. */
export const SteerSessionResult = Schema.Struct({delivery: Schema.Literals(["steered", "queued"]), messageId: Schema.String});

/** The message was not accepted; the caller must retain it. */
export class SteerSessionError extends Schema.TaggedErrorClass<SteerSessionError>()("SteerSessionError", {message: Schema.String}) {}

export type SteerSessionPayload = typeof SteerSessionPayload.Type;
export type SteerSessionResult = typeof SteerSessionResult.Type;
