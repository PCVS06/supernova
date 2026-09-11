import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {Effect} from "effect";
import {eq} from "@/rpc/effect-query";
import {RpcProtocolClientService} from "@/rpc/transport/client";

export function useHarnessResources(harnessId: string, projectId?: string) {
  return useQuery(
    eq.queryOptions({
      queryKey: ["agent", "harness-resources", harnessId, projectId],
      staleTime: 30000,
      refetchOnWindowFocus: false,
      queryFn: () => Effect.flatMap(Effect.service(RpcProtocolClientService), (rpc) => rpc.getHarnessResources({harnessId, projectId})),
    })
  );
}
export function useHarnessMemory(harnessId: string, projectId?: string) {
  return useQuery(
    eq.queryOptions({
      queryKey: ["agent", "harness-memory", harnessId, projectId],
      staleTime: 15000,
      refetchOnWindowFocus: false,
      queryFn: () => Effect.flatMap(Effect.service(RpcProtocolClientService), (rpc) => rpc.getHarnessMemory({harnessId, projectId})),
    })
  );
}
export function useToolCredentials() {
  return useQuery(
    eq.queryOptions({
      queryKey: ["agent", "tool-credentials"],
      staleTime: 15000,
      refetchOnWindowFocus: false,
      queryFn: () => Effect.flatMap(Effect.service(RpcProtocolClientService), (rpc) => rpc.getToolCredentials({})),
    })
  );
}
export function useSaveToolCredential() {
  const client = useQueryClient();
  return useMutation(
    eq.mutationOptions({
      gcTime: 0,
      mutationFn: (input: {name: string; value: string}) => Effect.flatMap(Effect.service(RpcProtocolClientService), (rpc) => rpc.saveToolCredential(input)),
      onSuccess: (data) => client.setQueryData(["agent", "tool-credentials"], data),
    })
  );
}
