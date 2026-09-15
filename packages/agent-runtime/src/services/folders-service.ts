import {Context, Effect} from "effect";
import type {
  FolderCreateError,
  FolderCreateResult,
  FolderEntriesListError,
  FolderEntriesListResult,
  FolderFileReadError,
  FolderFileReadResult,
  FolderFileWriteError,
  FolderFileWriteResult,
  FolderFilesListError,
  FolderFilesListResult,
  FolderSuggestionsListError,
  FolderSuggestionsListResult,
} from "@supernova/contracts/folders/procedures";

export interface FoldersServiceShape {
  readonly create: (path: string) => Effect.Effect<FolderCreateResult, FolderCreateError>;
  readonly listEntries: (projectPath: string, path: string) => Effect.Effect<FolderEntriesListResult, FolderEntriesListError>;
  readonly listFiles: (projectPath: string, query: string) => Effect.Effect<FolderFilesListResult, FolderFilesListError>;
  readonly listSuggestions: (query: string) => Effect.Effect<FolderSuggestionsListResult, FolderSuggestionsListError>;
  readonly readFile: (projectPath: string, path: string) => Effect.Effect<FolderFileReadResult, FolderFileReadError>;
  readonly writeFile: (projectPath: string, path: string, content: string, expectedModifiedAt?: string) => Effect.Effect<FolderFileWriteResult, FolderFileWriteError>;
}

export class FoldersService extends Context.Service<FoldersService, FoldersServiceShape>()("supernova/agent-runtime/FoldersService") {}
