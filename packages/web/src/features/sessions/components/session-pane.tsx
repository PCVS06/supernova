import type {CSSProperties, PointerEvent} from "react";
import {useRef, useState} from "react";
import Button from "@/components/ui/button";
import type {AppEnvironment} from "@/lib/app-environment";
import {cn} from "@/lib/cn";
import SessionConversation from "@/features/sessions/components/session-conversation";
import SessionLoading from "@/features/sessions/components/session-loading";
import {useSession} from "@/features/sessions/hooks/api/use-session";
import {useOpenSession} from "@/features/sessions/hooks/use-open-session";
import type {SplitViewPane} from "@/features/sessions/stores/split-view-store";
import {useSplitViewStore} from "@/features/sessions/stores/split-view-store";

interface SessionPaneProps {
  readonly appEnvironment: AppEnvironment;
  readonly pane: SplitViewPane;
}

/** A chat opened beside the routed one: its own width, composer draft and live stream. */
export default function SessionPane(props: SessionPaneProps) {
  const {appEnvironment, pane} = props;
  const closePane = useSplitViewStore((state) => state.closePane);
  const setPaneWidth = useSplitViewStore((state) => state.setPaneWidth);
  const paneRef = useRef<HTMLDivElement>(null);
  const [resizing, setResizing] = useState(false);
  const {data: session, error} = useSession(pane.sessionId);

  useOpenSession(pane.sessionId);

  const handleClose = (): void => {
    closePane(pane.sessionId);
  };

  const handleResizePointerDown = (event: PointerEvent<HTMLDivElement>): void => {
    const rightEdge = paneRef.current?.getBoundingClientRect().right;
    if (rightEdge === undefined) return;

    event.preventDefault();
    setResizing(true);
    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const handlePointerMove = (moveEvent: globalThis.PointerEvent): void => {
      setPaneWidth(pane.sessionId, rightEdge - moveEvent.clientX);
    };

    const handlePointerUp = (): void => {
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;
      setResizing(false);
      window.removeEventListener("pointermove", handlePointerMove);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp, {once: true});
  };

  return (
    <div
      className={cn("relative flex h-full min-h-0 shrink-0 flex-col border-l border-border-strong bg-surface", !resizing && "transition-[width] duration-150 ease-out")}
      ref={paneRef}
      style={{width: "var(--chat-pane-width)", "--chat-pane-width": `${pane.width}px`} as CSSProperties}
    >
      <div className="absolute inset-y-0 left-0 z-30 w-1 cursor-col-resize" onPointerDown={handleResizePointerDown} />
      {session ? (
        <SessionConversation appEnvironment={appEnvironment} onClose={handleClose} session={session} variant="pane" />
      ) : error ? (
        <div className="grid flex-1 place-items-center gap-3 px-6 py-10 text-center">
          <p className="text-sm text-danger-ink">Unable to load this chat.</p>
          <Button className="text-sm text-ink-muted hover:text-ink" onClick={handleClose} variant="bare">
            Close this pane
          </Button>
        </div>
      ) : (
        <SessionLoading appEnvironment={appEnvironment} onClose={handleClose} sessionId={pane.sessionId} variant="pane" />
      )}
    </div>
  );
}
