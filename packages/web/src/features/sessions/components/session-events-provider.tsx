import {useQueryClient} from "@tanstack/react-query";
import {connectSessionEvents} from "@/features/sessions/lib/streaming/session-event-stream";
import {useMountEffect} from "@/lib/use-mount-effect";
import {useRpcClient} from "@/rpc/use-rpc-client";
import {useConnectionStore} from "@/rpc/connection-store";

interface SessionEventsProviderProps {
  children: React.ReactNode;
}

export default function SessionEventsProvider(props: SessionEventsProviderProps) {
  const {children} = props;
  const queryClient = useQueryClient();
  const rpcClient = useRpcClient();

  useMountEffect(() => connectSessionEvents({queryClient, rpcClient}));
  useMountEffect(() => {
    if (!window.desktopApi?.onServerState) return;
    const update = useConnectionStore.getState().setServer;
    const stop = window.desktopApi.onServerState(update);
    void window.desktopApi
      .getServerState()
      .then(update)
      .catch(() => {
        useConnectionStore.getState().setStatus("reconnecting");
      });
    return stop;
  });

  return children;
}
