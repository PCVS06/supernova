import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {Effect} from "effect";
import type {HarnessConfig, HarnessProject} from "@supernova/contracts/harnesses/schemas";
import {eq} from "@/rpc/effect-query";
import {RpcProtocolClientService} from "@/rpc/transport/client";

export const harnessLibraryKey = ["agent", "harnesses"] as const;

/** Lists connected skills without exposing package entry points. */
export function useHarnessSkills(harnessId: string) {
  return useQuery(
    eq.queryOptions({
      queryKey: ["agent", "harness-skills", harnessId],
      staleTime: 30000,
      queryFn: () => Effect.flatMap(Effect.service(RpcProtocolClientService), (rpc) => rpc.getHarnessSkills({harnessId})),
    })
  );
}

/** Reads the authoritative server-side harness library. */
export function useHarnessLibrary() {
  return useQuery(
    eq.queryOptions({
      queryKey: harnessLibraryKey,
      refetchOnWindowFocus: false,
      refetchInterval: 8000,
      staleTime: 30000,
      queryFn: () => Effect.flatMap(Effect.service(RpcProtocolClientService), (rpc) => rpc.getHarnessLibrary({})),
    })
  );
}

/** Persists sidebar ordering so an orchestrator and the user see the same lab view. */
export function useMoveHarnessProject() {
  const client = useQueryClient();
  return useMutation(
    eq.mutationOptions({
      mutationFn: (input: {projectId: string; beforeProjectId: string; expectedRevision: number}) =>
        Effect.flatMap(Effect.service(RpcProtocolClientService), (rpc) => rpc.updateHarnessView(input)),
      onSuccess: (library) => client.setQueryData(harnessLibraryKey, library),
    })
  );
}

/** Saves shared configuration with optimistic concurrency protection. */
export function useSaveHarness() {
  const client = useQueryClient();
  return useMutation(
    eq.mutationOptions({
      mutationFn: (input: {harness: HarnessConfig; expectedRevision: number}) => Effect.flatMap(Effect.service(RpcProtocolClientService), (rpc) => rpc.saveHarness(input)),
      onSuccess: (library) => client.setQueryData(harnessLibraryKey, library),
    })
  );
}

/** Links a project and saves its overrides without editing project files. */
export function useSaveHarnessProject() {
  const client = useQueryClient();
  return useMutation(
    eq.mutationOptions({
      mutationFn: (input: {project: HarnessProject; expectedRevision: number}) => Effect.flatMap(Effect.service(RpcProtocolClientService), (rpc) => rpc.saveHarnessProject(input)),
      onSuccess: (library) => client.setQueryData(harnessLibraryKey, library),
    })
  );
}

/** Explicitly imports the local Science Pi package and its lab folders. */
export function useImportScienceHarness() {
  const client = useQueryClient();
  return useMutation(
    eq.mutationOptions({
      mutationFn: (input: {packagePath: string; rootPath: string; expectedRevision: number}) =>
        Effect.flatMap(Effect.service(RpcProtocolClientService), (rpc) => rpc.importScienceHarness(input)),
      onSuccess: (library) => client.setQueryData(harnessLibraryKey, library),
    })
  );
}
