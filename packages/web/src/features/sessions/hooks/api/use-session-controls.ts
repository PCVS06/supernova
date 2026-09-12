import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {Effect} from "effect";
import type {SessionControls as SessionControlsState} from "@supernova/contracts/session-runtime/schemas";
import type {SessionControlsAction} from "@supernova/contracts/session-runtime/procedures";
import {eq} from "@/rpc/effect-query";
import {RpcProtocolClientService} from "@/rpc/transport/client";
export type {SessionControlsState, SessionControlsAction};

/** Keeps a late poll from replacing a newer acknowledged control action. */
function newestControls(current: unknown, incoming: unknown): unknown {
  if (
    current &&
    incoming &&
    typeof current === "object" &&
    typeof incoming === "object" &&
    "revision" in current &&
    "revision" in incoming &&
    typeof current.revision === "number" &&
    typeof incoming.revision === "number" &&
    current.revision > incoming.revision
  )
    return current;
  return incoming;
}

/** Sends acknowledged controls for an existing or newly created chat without replaying mutations. */
export function useUpdateSessionControls(sessionId?: string) {
  const queryClient = useQueryClient();
  return useMutation(
    eq.mutationOptions({
      mutationFn: (input: {sessionId: string; action: SessionControlsAction}) =>
        Effect.gen(function* () {
          const rpc = yield* RpcProtocolClientService;
          return yield* rpc.updateSessionControls(input);
        }),
      retry: false,
      scope: sessionId ? {id: `session-controls:${sessionId}`} : undefined,
      onSuccess: (state) => {
        queryClient.setQueryData<SessionControlsState>(["agent", "session-controls", state.sessionId], (current) => newestControls(current, state) as SessionControlsState);
      },
      onSettled: (_data, _error, input) => {
        void queryClient.invalidateQueries({queryKey: ["agent", "session-controls", input.sessionId]});
      },
    })
  );
}

/** Loads authoritative goals and pending messages; initial loading never blocks a normal chat send. */
export function useSessionControls(sessionId: string, working: boolean) {
  const query = useQuery(
    eq.queryOptions({
      queryKey: ["agent", "session-controls", sessionId],
      queryFn: () =>
        Effect.gen(function* () {
          const rpc = yield* RpcProtocolClientService;
          return yield* rpc.getSessionControls({sessionId});
        }),
      refetchInterval: (query) => (working || query.state.data?.goal?.status === "active" || (query.state.data?.queue.length ?? 0) > 0 ? 750 : 3000),
      structuralSharing: newestControls,
    })
  );
  const mutation = useUpdateSessionControls(sessionId);

  const update = async (action: SessionControlsAction): Promise<boolean> => {
    if (query.data?.error) return false;
    try {
      await mutation.mutateAsync({sessionId, action});
      return true;
    } catch {
      // The tray presents the typed mutation error. Keep all unacknowledged content.
      return false;
    }
  };

  const refresh = async () => {
    mutation.reset();
    return query.refetch();
  };

  return {state: query.data, loading: query.isPending, pending: mutation.isPending, error: mutation.error ?? query.error, update, refresh};
}
