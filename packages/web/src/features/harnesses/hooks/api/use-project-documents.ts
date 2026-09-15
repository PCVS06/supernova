import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {Effect} from "effect";
import type {FolderFileReadResult} from "@supernova/contracts/folders/procedures";
import {eq} from "@/rpc/effect-query";
import {RpcProtocolClientService} from "@/rpc/transport/client";

export function projectDocumentQueryKey(projectPath: string, path: string) {
  return ["agent", "project-document", projectPath, path] as const;
}

interface ProjectDocumentWrite {
  projectPath: string;
  path: string;
  content: string;
  /** Modification time the editor loaded, so a document changed on disk is refused instead of overwritten. */
  expectedModifiedAt?: string;
}

/** Reads one planning document of a project. Idle until a document is selected. */
export function useProjectDocument(projectPath: string, path: string) {
  return useQuery(
    eq.queryOptions({
      enabled: projectPath.length > 0 && path.length > 0,
      queryKey: projectDocumentQueryKey(projectPath, path),
      refetchOnWindowFocus: false,
      // A file that is not on disk yet is a normal state, not a transient failure: report it at once.
      retry: false,
      staleTime: 5_000,
      queryFn: () => Effect.flatMap(Effect.service(RpcProtocolClientService), (rpc) => rpc.readFolderFile({path, projectPath})),
    })
  );
}

/** Saves one planning document and keeps the loaded modification time in step with the server's answer. */
export function useSaveProjectDocument() {
  const client = useQueryClient();

  return useMutation(
    eq.mutationOptions({
      mutationFn: (input: ProjectDocumentWrite) => Effect.flatMap(Effect.service(RpcProtocolClientService), (rpc) => rpc.writeFolderFile(input)),
      onSuccess: (result, input) =>
        client.setQueryData(projectDocumentQueryKey(input.projectPath, input.path), (previous: FolderFileReadResult | undefined) => ({
          binary: false,
          truncated: false,
          ...previous,
          content: input.content,
          modifiedAt: result.modifiedAt,
          path: result.path,
          size: result.size,
        })),
    })
  );
}
