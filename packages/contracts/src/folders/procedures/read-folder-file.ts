import {Schema} from "effect";

export const FolderFileReadPayload = Schema.Struct({
  projectPath: Schema.String,
  /** Project-relative file path; the server refuses anything that escapes the project. */
  path: Schema.String,
});

export const FolderFileReadResult = Schema.Struct({
  path: Schema.String,
  /** UTF-8 text, empty when the file is binary. */
  content: Schema.String,
  size: Schema.Number,
  /** True when the content was cut at the server's read limit. */
  truncated: Schema.Boolean,
  binary: Schema.Boolean,
  modifiedAt: Schema.String,
});

export class FolderFileReadError extends Schema.TaggedErrorClass<FolderFileReadError>()("FolderFileReadError", {
  cause: Schema.optional(Schema.Defect),
  message: Schema.String,
}) {}

export type FolderFileReadPayload = typeof FolderFileReadPayload.Type;
export type FolderFileReadResult = typeof FolderFileReadResult.Type;
