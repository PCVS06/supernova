import {Schema} from "effect";

/** One direct child of a project directory, for the file tree. */
export const FolderEntry = Schema.Struct({
  name: Schema.String,
  /** Project-relative path using forward slashes. */
  path: Schema.String,
  kind: Schema.Literals(["file", "directory"]),
  size: Schema.optional(Schema.Number),
  ignored: Schema.Boolean,
});

export const FolderEntriesListPayload = Schema.Struct({
  projectPath: Schema.String,
  /** Project-relative directory to list; empty string for the project root. */
  path: Schema.String,
});

export const FolderEntriesListResult = Schema.Struct({path: Schema.String, entries: Schema.Array(FolderEntry)});

export class FolderEntriesListError extends Schema.TaggedErrorClass<FolderEntriesListError>()("FolderEntriesListError", {
  cause: Schema.optional(Schema.Defect),
  message: Schema.String,
}) {}

export type FolderEntry = typeof FolderEntry.Type;
export type FolderEntriesListPayload = typeof FolderEntriesListPayload.Type;
export type FolderEntriesListResult = typeof FolderEntriesListResult.Type;
