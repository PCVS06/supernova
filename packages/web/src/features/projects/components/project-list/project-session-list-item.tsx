import PiOrb from "@/components/brand/pi-orb";
import Button from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import IconButton from "@/components/ui/icon-button";
import SessionActionsMenu from "@/features/sessions/components/session-actions-menu";
import SessionTitleText from "@/features/sessions/components/session-title-text";
import {useRenameSession} from "@/features/sessions/hooks/api/use-rename-session";
import {useInlineRename} from "@/hooks/use-inline-rename";
import {cn} from "@/lib/cn";
import ChatRunList from "@/features/harnesses/components/chat-run-list";
import type {SessionLiveStatus} from "@/features/sessions/stores/session-live-store";
import {ledgerPrimaryClassName, ledgerRowClassName} from "@/features/sidebar/lib/ledger-styles";
import LedgerRowEnd from "@/features/sidebar/components/ledger-row-end";

interface ProjectSessionListItemProps {
  session: {id: string; title: string; pinned: boolean};
  projectPath: string;
  color?: string;
  managed?: boolean;
  selected: boolean;
  /** The owning chat remains contextual while one of its workers is selected. */
  current?: boolean;
  streaming: boolean;
  status?: SessionLiveStatus;
  unseen: boolean;
  onOpen: () => void;
  onPrefetch: () => void;
  onTogglePinned: () => void;
}

/** Renders a sidebar chat with shared actions and local inline renaming. */
export default function ProjectSessionListItem(props: ProjectSessionListItemProps) {
  const {session, projectPath, selected, current = selected, streaming, status, unseen, onOpen, onPrefetch, onTogglePinned, color, managed} = props;
  const renameSession = useRenameSession();
  const {draftName, handleBlur, handleChange, handleClick, handleFocus, handleInputRef, handleKeyDown, renaming, startRenaming} = useInlineRename({
    initialValue: session.title,
    onSave: (title) => renameSession.mutate({sessionId: session.id, title}),
  });

  const activityLabel = status === "stopping" ? "Stopping" : status === "compacting" ? "Compacting" : streaming ? "Working" : unseen ? "Unread chat" : "Chat";

  return (
    <li onFocusCapture={onPrefetch} onPointerDown={onPrefetch} onPointerEnter={onPrefetch}>
      <div className={cn(ledgerRowClassName, current && "bg-overlay-pressed text-ink-strong", selected && !current && "text-ink")} title={session.title}>
        {renaming ? (
          <input
            aria-label="Chat title"
            className="m-2 min-w-0 flex-1 rounded-md bg-overlay-hover px-2 py-2 text-sm text-ink outline-none focus-visible:ring-1 focus-visible:ring-border-strong"
            onBlur={handleBlur}
            onChange={handleChange}
            onClick={handleClick}
            onFocus={handleFocus}
            onKeyDown={handleKeyDown}
            onPointerDown={(event) => event.stopPropagation()}
            ref={handleInputRef}
            value={draftName}
          />
        ) : (
          <Button aria-current={current ? "page" : undefined} aria-label={`Open chat: ${session.title}`} className={ledgerPrimaryClassName} onClick={onOpen}>
            <span className="grid size-4 shrink-0 place-items-center">
              {streaming ? <PiOrb color={color} className="size-4" label={activityLabel} state="working" /> : <Icon name="session" size="xs" className="text-ink-faint" />}
            </span>
            <SessionTitleText className="min-w-0 flex-1 line-clamp-2 break-words text-sm leading-5" title={session.title} />
          </Button>
        )}
        <LedgerRowEnd
          actions={
            <>
              <IconButton
                aria-pressed={session.pinned}
                className={cn("size-6 rounded-md text-ink-faint hover:bg-overlay-pressed hover:text-ink", session.pinned && "text-ink-muted")}
                label={session.pinned ? "Unpin chat" : "Pin chat"}
                onClick={(event) => {
                  event.stopPropagation();
                  onTogglePinned();
                }}
              >
                <Icon name="pin" size="xs" />
              </IconButton>
              <SessionActionsMenu
                onRename={startRenaming}
                projectPath={projectPath}
                sessionId={session.id}
                sessionTitle={session.title}
                triggerClassName="size-6 rounded-md hover:bg-overlay-pressed"
              />
            </>
          }
        />
      </div>
      {managed && <ChatRunList sessionId={session.id} live={selected || streaming} />}
    </li>
  );
}
