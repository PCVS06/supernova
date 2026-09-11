import {useQuery} from "@tanstack/react-query";
import {Effect} from "effect";
import {eq} from "@/rpc/effect-query";
import {RpcProtocolClientService} from "@/rpc/transport/client";

export function folderFilesQueryKey(projectPath: string, query: string) {
  return ["agent", "folder", "files", projectPath, query] as const;
}

interface UseFolderFilesInput {
  readonly projectPath: string;
  /** Filter text; an empty query leaves the tree in charge. */
  readonly query: string;
}

/** Searches the whole project for files matching the workspace filter. */
export function useFolderFiles(input: UseFolderFilesInput) {
  const {projectPath, query} = input;

  return useQuery(
    eq.queryOptions({
      enabled: projectPath.length > 0 && query.trim().length > 0,
      placeholderData: (previousData) => previousData,
      queryKey: folderFilesQueryKey(projectPath, query.trim()),
      staleTime: 15_000,
      queryFn: () => Effect.flatMap(Effect.service(RpcProtocolClientService), (rpc) => rpc.listFolderFiles({projectPath, query: query.trim()})),
    })
  );
}
