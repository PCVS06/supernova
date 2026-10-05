import {Schema} from "effect";

export const FolderFileReadPayload = Schema.Struct({
  projectPath: Schema.String,
  /** Project-relative file path; the server refuses anything that escapes the project. */
  path: Schema.String,
  /** Requests a bounded image preview instead of text. */
  imagePreview: Schema.optional(Schema.Boolean),
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
  image: Schema.optional(Schema.Struct({mediaType: Schema.String, base64: Schema.String})),
});

export class FolderFileReadError extends Schema.TaggedErrorClass<FolderFileReadError>()("FolderFileReadError", {
  cause: Schema.optional(Schema.Defect),
  message: Schema.String,
}) {}

export type FolderFileReadPayload = typeof FolderFileReadPayload.Type;
export type FolderFileReadResult = typeof FolderFileReadResult.Type;
