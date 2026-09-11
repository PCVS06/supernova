import {Schema} from "effect";

/** Delivers a message to a running turn, interrupting it, instead of queuing it for the next one. */
export const SteerSessionPayload = Schema.Struct({
  sessionId: Schema.String,
  text: Schema.String,
});

export type SteerSessionPayload = typeof SteerSessionPayload.Type;
