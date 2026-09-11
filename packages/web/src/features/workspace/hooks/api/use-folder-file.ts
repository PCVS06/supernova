import {useQuery} from "@tanstack/react-query";
import {Effect} from "effect";
import {eq} from "@/rpc/effect-query";
import {RpcProtocolClientService} from "@/rpc/transport/client";

export function folderFileQueryKey(projectPath: string, path: string) {
  return ["agent", "folder", "file", projectPath, path] as const;
}

interface UseFolderFileInput {
  /** Project-relative file path, or null while no file is open. */
  readonly path: string | null;
  readonly projectPath: string;
}

/** Reads one project file for the workspace viewer, including its truncation and binary flags. */
export function useFolderFile(input: UseFolderFileInput) {
  const {path, projectPath} = input;

  return useQuery(
    eq.queryOptions({
      enabled: path !== null && path.length > 0 && projectPath.length > 0,
      queryKey: folderFileQueryKey(projectPath, path ?? ""),
      staleTime: 15_000,
      queryFn: () => Effect.flatMap(Effect.service(RpcProtocolClientService), (rpc) => rpc.readFolderFile({path: path ?? "", projectPath})),
    })
  );
}
