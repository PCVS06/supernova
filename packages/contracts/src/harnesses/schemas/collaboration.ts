import {Schema} from "effect";

/** Bounded collaboration presets supported by the chat runtime. */
export const CollaborationMode = Schema.Literals(["solo", "advisor", "compare", "fuse"]);

/** Identifies an acknowledged setup independently of a mutable library revision. */
export const SessionHarnessSelection = Schema.Struct({
  id: Schema.String,
  harnessId: Schema.String,
  name: Schema.String,
  mode: CollaborationMode,
  selectedAt: Schema.String,
});

export type CollaborationMode = typeof CollaborationMode.Type;
export type SessionHarnessSelection = typeof SessionHarnessSelection.Type;
