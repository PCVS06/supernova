import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {Effect} from "effect";
import type {CurationTarget} from "@supernova/contracts/harnesses/schemas";
import {harnessLibraryKey} from "@/features/harnesses/hooks/api/use-harnesses";
import {eq} from "@/rpc/effect-query";
import {RpcProtocolClientService} from "@/rpc/transport/client";

export function curationQueryKey(harnessId: string) {
  return ["agent", "curation", harnessId] as const;
}

/** Proposals and reviews of one harness. Polled, because a review can finish while the inbox is open. */
export function useCuration(harnessId: string) {
  return useQuery(
    eq.queryOptions({
      enabled: harnessId.length > 0,
      queryKey: curationQueryKey(harnessId),
      refetchInterval: 10_000,
      staleTime: 5_000,
      queryFn: () => Effect.flatMap(Effect.service(RpcProtocolClientService), (rpc) => rpc.listCuration({harnessId})),
    })
  );
}

/** Approves or rejects one proposal. Approving applies it, so the library answer is authoritative. */
export function useDecideCuration() {
  const client = useQueryClient();

  return useMutation(
    eq.mutationOptions({
      mutationFn: (input: {proposalId: string; decision: "approve" | "reject"; replace?: string; reason?: string; expectedRevision: number}) =>
        Effect.flatMap(Effect.service(RpcProtocolClientService), (rpc) => rpc.decideCuration(input)),
      onSuccess: (result) => {
        client.setQueryData(harnessLibraryKey, result.library);
        void client.invalidateQueries({queryKey: curationQueryKey(result.proposal.harnessId)});
      },
    })
  );
}

/** Restores the text an applied proposal replaced. */
export function useRollbackCuration() {
  const client = useQueryClient();

  return useMutation(
    eq.mutationOptions({
      mutationFn: (input: {proposalId: string; expectedRevision: number}) => Effect.flatMap(Effect.service(RpcProtocolClientService), (rpc) => rpc.rollbackCuration(input)),
      onSuccess: (result) => {
        client.setQueryData(harnessLibraryKey, result.library);
        void client.invalidateQueries({queryKey: curationQueryKey(result.proposal.harnessId)});
      },
    })
  );
}

/** Runs one review and answers when it has finished, so the mutation stays pending for its whole wall clock. */
export function useRunCuratorReview() {
  const client = useQueryClient();

  return useMutation(
    eq.mutationOptions({
      mutationFn: (input: {harnessId: string; projectId?: string}) => Effect.flatMap(Effect.service(RpcProtocolClientService), (rpc) => rpc.runCuratorReview(input)),
      onSettled: (_result, _error, input) => client.invalidateQueries({queryKey: curationQueryKey(input.harnessId)}),
    })
  );
}

/** Previous texts of one instruction piece, newest revision first on the server. */
export function useInstructionVersions(target: CurationTarget) {
  return useQuery(
    eq.queryOptions({
      queryKey: ["agent", "instruction-versions", target] as const,
      staleTime: 30_000,
      queryFn: () => Effect.flatMap(Effect.service(RpcProtocolClientService), (rpc) => rpc.listInstructionVersions({target})),
    })
  );
}

/** Reads one saved revision; idle until a revision is chosen. */
export function useInstructionVersion(target: CurationTarget, revision?: number) {
  return useQuery(
    eq.queryOptions({
      enabled: revision !== undefined,
      queryKey: ["agent", "instruction-version", target, revision ?? 0] as const,
      staleTime: 30_000,
      queryFn: () => Effect.flatMap(Effect.service(RpcProtocolClientService), (rpc) => rpc.readInstructionVersion({target, revision: revision ?? 0})),
    })
  );
}
