import {useQuery} from "@tanstack/react-query";
import {Effect} from "effect";
import {eq} from "@/rpc/effect-query";
import {RpcProtocolClientService} from "@/rpc/transport/client";

export function folderEntriesQueryKey(projectPath: string, path: string) {
  return ["agent", "folder", "entries", projectPath, path] as const;
}

interface UseFolderEntriesInput {
  /** Directories load only once the tree reveals them. */
  readonly enabled?: boolean;
  /** Project-relative directory; the empty string is the project root. */
  readonly path: string;
  readonly projectPath: string;
}

/** Lists the direct children of one project directory for the workspace file tree. */
export function useFolderEntries(input: UseFolderEntriesInput) {
  const {enabled = true, path, projectPath} = input;

  return useQuery(
    eq.queryOptions({
      enabled: enabled && projectPath.length > 0,
      queryKey: folderEntriesQueryKey(projectPath, path),
      staleTime: 15_000,
      queryFn: () => Effect.flatMap(Effect.service(RpcProtocolClientService), (rpc) => rpc.listFolderEntries({path, projectPath})),
    })
  );
}
