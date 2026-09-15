import {Layer} from "effect";
import {FoldersService} from "@supernova/agent-runtime/services/folders-service";
import {createFolder} from "@supernova/agent-runtime/layers/folders/operations/create-folder";
import {listFolderEntries} from "@supernova/agent-runtime/layers/folders/operations/list-folder-entries";
import {listFolderFiles} from "@supernova/agent-runtime/layers/folders/operations/list-folder-files";
import {listFolderSuggestions} from "@supernova/agent-runtime/layers/folders/operations/list-folder-suggestions";
import {readFolderFile} from "@supernova/agent-runtime/layers/folders/operations/read-folder-file";
import {writeFolderFile} from "@supernova/agent-runtime/layers/folders/operations/write-folder-file";

export const FileSystemFoldersLive = Layer.succeed(FoldersService, {
  create: createFolder,
  listEntries: listFolderEntries,
  listFiles: listFolderFiles,
  listSuggestions: listFolderSuggestions,
  readFile: readFolderFile,
  writeFile: writeFolderFile,
});
