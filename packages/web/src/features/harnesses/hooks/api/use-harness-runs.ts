import {useQuery} from "@tanstack/react-query";
import {Effect} from "effect";
import {eq} from "@/rpc/effect-query";
import {RpcProtocolClientService} from "@/rpc/transport/client";

/** Polls only open or actively streaming chats, never agent definitions. */
export function useHarnessRuns(sessionId: string, live = false) {
  return useQuery(
    eq.queryOptions({
      queryKey: ["agent", "harness-runs", sessionId],
      refetchInterval: live ? 1200 : false,
      queryFn: () => Effect.flatMap(Effect.service(RpcProtocolClientService), (rpc) => rpc.listHarnessRuns({sessionId})),
    })
  );
}

/** Loads the exact worker receipt, refreshing while the inspector is open. */
export function useHarnessRun(sessionId: string, runId: string) {
  return useQuery(
    eq.queryOptions({
      queryKey: ["agent", "harness-run", sessionId, runId],
      refetchInterval: (query) => (["starting", "running"].includes(query.state.data?.status ?? "") ? 1500 : false),
      queryFn: () => Effect.flatMap(Effect.service(RpcProtocolClientService), (rpc) => rpc.getHarnessRun({sessionId, runId})),
    })
  );
}

/** Distinguishes this chat's pinned configuration from its last observed runtime context. */
export function useChatHarness(sessionId: string, live = false) {
  return useQuery(
    eq.queryOptions({
      queryKey: ["agent", "chat-harness", sessionId],
      refetchInterval: live ? 5000 : false,
      queryFn: () => Effect.flatMap(Effect.service(RpcProtocolClientService), (rpc) => rpc.getChatHarness({sessionId})),
    })
  );
}
