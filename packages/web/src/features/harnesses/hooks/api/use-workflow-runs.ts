import {useQuery} from "@tanstack/react-query";
import {Effect} from "effect";
import {eq} from "@/rpc/effect-query";
import {RpcProtocolClientService} from "@/rpc/transport/client";

/** Polls only open or actively streaming chats, never the saved workflow definition. */
export function useWorkflowRuns(sessionId: string, live = false, enabled = true) {
  return useQuery(
    eq.queryOptions({
      enabled,
      queryKey: ["agent", "workflow-runs", sessionId],
      refetchInterval: (query) => (live || query.state.data?.some((run) => run.status === "running") ? 1200 : 8000),
      queryFn: () => Effect.flatMap(Effect.service(RpcProtocolClientService), (rpc) => rpc.listWorkflowRuns({sessionId})),
    })
  );
}

/** Loads the durable run with its frozen workflow and step records, refreshing while it is still running. */
export function useWorkflowRun(sessionId: string, runId: string) {
  return useQuery(
    eq.queryOptions({
      queryKey: ["agent", "workflow-run", sessionId, runId],
      refetchInterval: (query) => (query.state.data?.status === "running" ? 1500 : false),
      queryFn: () => Effect.flatMap(Effect.service(RpcProtocolClientService), (rpc) => rpc.getWorkflowRun({sessionId, runId})),
    })
  );
}
