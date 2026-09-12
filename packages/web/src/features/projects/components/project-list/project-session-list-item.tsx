import type {KeyboardEvent} from "react";
import PiOrb from "@/components/brand/pi-orb";
import Icon from "@/components/ui/icon";
import IconButton from "@/components/ui/icon-button";
import SessionActionsMenu from "@/features/sessions/components/session-actions-menu";
import SessionTitleText from "@/features/sessions/components/session-title-text";
import {useRenameSession} from "@/features/sessions/hooks/api/use-rename-session";
import {useInlineRename} from "@/hooks/use-inline-rename";
import {cn} from "@/lib/cn";
import ChatRunList from "@/features/harnesses/components/chat-run-list";

interface ProjectSessionListItemProps {
  session: {id: string; title: string; pinned: boolean; updatedAt: string};
  projectPath: string;
  color?: string;
  managed?: boolean;
  selected: boolean;
  streaming: boolean;
  unseen: boolean;
  onOpen: () => void;
  onPrefetch: () => void;
  onTogglePinned: () => void;
}

/** Renders a sidebar chat with shared actions and local inline renaming. */
export default function ProjectSessionListItem(props: ProjectSessionListItemProps) {
  const {session, projectPath, selected, streaming, unseen, onOpen, onPrefetch, onTogglePinned, color, managed} = props;
  const renameSession = useRenameSession();
  const {draftName, handleBlur, handleChange, handleClick, handleFocus, handleInputRef, handleKeyDown, renaming, startRenaming} = useInlineRename({
    initialValue: session.title,
    onSave: (title) => renameSession.mutate({sessionId: session.id, title}),
  });

  const handleRowKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    onOpen();
  };

  return (
    <li onFocusCapture={onPrefetch} onPointerDown={onPrefetch} onPointerEnter={onPrefetch}>
      <div
        aria-current={selected ? "page" : undefined}
        className={cn(
          "group/session flex h-8 w-full cursor-pointer items-center gap-1.5 rounded-md px-2 text-left text-ink-muted hover:bg-overlay-hover hover:text-ink",
          selected && "bg-overlay-pressed text-ink-strong"
        )}
        onClick={onOpen}
        onKeyDown={handleRowKeyDown}
        role="button"
        tabIndex={0}
        title={session.title}
      >
        {renaming ? (
          <input
            aria-label="Chat title"
            className="min-w-0 flex-1 truncate bg-transparent text-[13px] text-ink outline-none"
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
          <SessionTitleText className="min-w-0 flex-1 truncate text-[13px] leading-5" title={session.title} />
        )}
        <span className="grid w-12 shrink-0 place-items-end">
          <span className="col-start-1 row-start-1 flex items-center justify-end pr-1 group-hover/session:invisible group-focus-within/session:invisible group-has-[[data-popup-open]]/session:invisible">
            {streaming ? (
              <PiOrb color={color} className="size-4" label="Chat streaming" state="working" />
            ) : unseen ? (
              <span className="inline-block size-1.5 rounded-full bg-ink" aria-label="Finished while closed" role="status" />
            ) : session.pinned ? (
              <Icon className="text-ink-faint" name="pin" size="xs" />
            ) : (
              <span className="font-mono text-[10px] tabular-nums text-ink-faint">{session.updatedAt}</span>
            )}
          </span>
          <span className="col-start-1 row-start-1 flex items-center gap-0.5 opacity-0 group-hover/session:opacity-100 group-focus-within/session:opacity-100 group-has-[[data-popup-open]]/session:opacity-100">
            <IconButton
              className="group/pin-toggle size-5 rounded-md text-ink-faint hover:bg-overlay-pressed hover:text-ink"
              label={session.pinned ? "Unpin chat" : "Pin chat"}
              onClick={(event) => {
                event.stopPropagation();
                onTogglePinned();
              }}
            >
              <Icon
                className="origin-center transition-transform duration-250 ease-[cubic-bezier(0.2,0.9,0.2,1.15)] group-active/pin-toggle:scale-85 group-active/pin-toggle:-rotate-8 motion-reduce:transition-none"
                name="pin"
                size="xs"
              />
            </IconButton>
            <SessionActionsMenu
              onRename={startRenaming}
              projectPath={projectPath}
              sessionId={session.id}
              sessionTitle={session.title}
              triggerClassName="size-5 rounded-md hover:bg-overlay-pressed"
            />
          </span>
        </span>
      </div>
      {managed && <ChatRunList sessionId={session.id} live={selected || streaming} />}
    </li>
  );
}
