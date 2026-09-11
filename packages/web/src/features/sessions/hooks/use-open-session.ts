import {useSessionLiveStore} from "@/features/sessions/stores/session-live-store";
import {useMountEffect} from "@/lib/use-mount-effect";

/**
 * Registers a chat as open for as long as a pane shows it, so streamed activity
 * in any visible chat counts as seen. Callers remount per chat.
 */
export function useOpenSession(sessionId: string): void {
  const closeSession = useSessionLiveStore((state) => state.closeSession);
  const openSession = useSessionLiveStore((state) => state.openSession);

  useMountEffect(() => {
    openSession(sessionId);
    return () => closeSession(sessionId);
  });
}
