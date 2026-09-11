import * as Rpc from "effect/unstable/rpc/Rpc";
import {
  FolderCreateError,
  FolderCreatePayload,
  FolderCreateResult,
  FolderFilesListError,
  FolderFilesListPayload,
  FolderFilesListResult,
  FolderSuggestionsListError,
  FolderSuggestionsListPayload,
  FolderSuggestionsListResult,
  FolderEntriesListError,
  FolderEntriesListPayload,
  FolderEntriesListResult,
  FolderFileReadError,
  FolderFileReadPayload,
  FolderFileReadResult,
  FolderFileWriteError,
  FolderFileWritePayload,
  FolderFileWriteResult,
} from "@supernova/contracts/folders/procedures";

export const FolderCreateRpc = Rpc.make("createFolder", {
  error: FolderCreateError,
  payload: FolderCreatePayload,
  success: FolderCreateResult,
});

export const FolderSuggestionsListRpc = Rpc.make("listFolderSuggestions", {
  error: FolderSuggestionsListError,
  payload: FolderSuggestionsListPayload,
  success: FolderSuggestionsListResult,
});

export const FolderFilesListRpc = Rpc.make("listFolderFiles", {
  error: FolderFilesListError,
  payload: FolderFilesListPayload,
  success: FolderFilesListResult,
});

export const FolderEntriesListRpc = Rpc.make("listFolderEntries", {
  error: FolderEntriesListError,
  payload: FolderEntriesListPayload,
  success: FolderEntriesListResult,
});

export const FolderFileReadRpc = Rpc.make("readFolderFile", {
  error: FolderFileReadError,
  payload: FolderFileReadPayload,
  success: FolderFileReadResult,
});

export const FolderFileWriteRpc = Rpc.make("writeFolderFile", {
  error: FolderFileWriteError,
  payload: FolderFileWritePayload,
  success: FolderFileWriteResult,
});

export const FolderRpcs = [FolderCreateRpc, FolderSuggestionsListRpc, FolderFilesListRpc, FolderEntriesListRpc, FolderFileReadRpc, FolderFileWriteRpc] as const;
