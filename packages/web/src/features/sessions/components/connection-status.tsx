import {useState} from "react";
import Button from "@/components/ui/button";
import {useConnectionStore} from "@/rpc/connection-store";

/** Keeps the workspace readable and provides an explicit restart after a local API exit. */
export default function ConnectionStatus() {
  const {status, server} = useConnectionStore();
  const [error, setError] = useState<string>();
  if (status === "connected" && (!server || server.status === "running")) return null;
  const stopped = server?.status === "stopped";
  return (
    <section
      role="status"
      aria-label="Connection status"
      className="flex shrink-0 items-center justify-between gap-3 border-b border-border-muted px-4 py-2 text-xs text-ink-muted"
    >
      <div>
        <p className="font-medium text-ink">
          {stopped ? "Local agent interrupted" : server?.status === "restarting" ? "Restarting local agent…" : status === "connecting" ? "Connecting…" : "Reconnecting…"}
        </p>
        <p>
          {stopped
            ? "Showing the last saved workspace. Restart, then review the chat and queue before continuing."
            : "Your draft stays here. Work may still be running; pending actions are not retried automatically."}
        </p>
        {error && <p role="alert">{error}</p>}
      </div>
      {stopped && typeof window !== "undefined" && window.desktopApi && (
        <Button
          className="shrink-0"
          variant="ghost"
          onClick={() => {
            setError(undefined);
            void window.desktopApi!.restartServer().catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Restart failed. Try again."));
          }}
        >
          Restart local agent
        </Button>
      )}
    </section>
  );
}
