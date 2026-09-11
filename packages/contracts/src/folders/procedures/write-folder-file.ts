import {Schema} from "effect";

export const FolderFileWritePayload = Schema.Struct({
  projectPath: Schema.String,
  /** Project-relative path of a Markdown file; the server refuses other extensions and paths that escape the project. */
  path: Schema.String,
  content: Schema.String,
  /** Modification time the client last saw, so a concurrent edit is refused instead of overwritten. */
  expectedModifiedAt: Schema.optional(Schema.String),
});

export const FolderFileWriteResult = Schema.Struct({path: Schema.String, size: Schema.Number, modifiedAt: Schema.String});

export class FolderFileWriteError extends Schema.TaggedErrorClass<FolderFileWriteError>()("FolderFileWriteError", {
  cause: Schema.optional(Schema.Defect),
  message: Schema.String,
}) {}

export type FolderFileWritePayload = typeof FolderFileWritePayload.Type;
export type FolderFileWriteResult = typeof FolderFileWriteResult.Type;
