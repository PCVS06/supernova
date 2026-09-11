import {Schema} from "effect";

export const HarnessResourcePayload = Schema.Struct({harnessId: Schema.String, projectId: Schema.optional(Schema.String)});
export const HarnessResourceResult = Schema.Struct({
  tools: Schema.Array(Schema.Struct({name: Schema.String, description: Schema.String, group: Schema.String})),
  extensions: Schema.Array(Schema.Struct({name: Schema.String, toolCount: Schema.Number, commands: Schema.Array(Schema.String), loaded: Schema.Boolean})),
  warnings: Schema.Array(Schema.String),
});
export const ToolCredentialPayload = Schema.Struct({});
export const ToolCredentialResult = Schema.Array(
  Schema.Struct({
    id: Schema.String,
    name: Schema.String,
    fields: Schema.Array(Schema.Struct({name: Schema.String, label: Schema.String, configured: Schema.Boolean, source: Schema.String, optional: Schema.Boolean})),
  })
);
export const SaveToolCredentialPayload = Schema.Struct({name: Schema.String, value: Schema.String});
export const HarnessMemoryPayload = Schema.Struct({harnessId: Schema.String, projectId: Schema.optional(Schema.String)});
export const HarnessMemoryResult = Schema.Struct({
  projectName: Schema.String,
  available: Schema.Boolean,
  unavailableReason: Schema.optional(Schema.Literal("workspace-missing")),
  total: Schema.Number,
  rejected: Schema.Number,
  records: Schema.Array(
    Schema.Struct({id: Schema.String, statement: Schema.String, kind: Schema.String, state: Schema.String, updatedAt: Schema.String, evidence: Schema.Array(Schema.String)})
  ),
});

export type HarnessResourceResult = typeof HarnessResourceResult.Type;
export type ToolCredentialResult = typeof ToolCredentialResult.Type;
export type HarnessMemoryResult = typeof HarnessMemoryResult.Type;
