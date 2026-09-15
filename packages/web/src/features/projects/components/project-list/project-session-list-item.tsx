import {SidebarBranch, SidebarPresence} from "@/features/sidebar/components/sidebar-presence";
import SidebarLabel from "@/features/sidebar/components/sidebar-label";
import {useState} from "react";
import {useLocation} from "@tanstack/react-router";
import {useWorkspaceOverview} from "@/features/workspace/hooks/use-workspace-overview";
import ChatAgentList from "@/features/sidebar/components/chat-agent-list";
import ConversationStar from "@/components/brand/conversation-star";
import Button from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import IconButton from "@/components/ui/icon-button";
import SessionActionsMenu from "@/features/sessions/components/session-actions-menu";
import SessionTitleText from "@/features/sessions/components/session-title-text";
import {useRenameSession} from "@/features/sessions/hooks/api/use-rename-session";
import {useInlineRename} from "@/hooks/use-inline-rename";
import {cn} from "@/lib/cn";
import WorkspaceActivityLink from "@/features/workspace/components/workspace-activity-link";
import type {SessionLiveStatus} from "@/features/sessions/stores/session-live-store";
import {ledgerDisclosureClassName, ledgerMarkClassName, ledgerPrimaryClassName, ledgerRowClassName} from "@/features/sidebar/lib/ledger-styles";
import LedgerRowEnd from "@/features/sidebar/components/ledger-row-end";

interface ProjectSessionListItemProps {
  session: {id: string; title: string; pinned: boolean};
  projectPath: string;
  managed?: boolean;
  orchestrator?: boolean;
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
  const {session, projectPath, selected, current = selected, streaming, status, unseen, onOpen, onPrefetch, onTogglePinned, managed, orchestrator} = props;
  const overview = useWorkspaceOverview();
  const {pathname} = useLocation();
  const [agentView, setAgentView] = useState<{path: string; open: boolean}>();
  const agentSelected = pathname.startsWith(`/session/${session.id}/run/`);
  const expanded = agentView?.path === pathname ? agentView.open : agentSelected;
  const workers = overview.model.items.filter((item) => item.sessionId === session.id && item.kind === "agent");
  const hasAgents = workers.length > 0 || agentSelected || (overview.data?.activityTotals.find((item) => item.sessionId === session.id)?.runs ?? 0) > 0;
  const agentsWorking = workers.some((item) => item.active);
  const renameSession = useRenameSession();
  const {draftName, handleBlur, handleChange, handleClick, handleFocus, handleInputRef, handleKeyDown, renaming, startRenaming} = useInlineRename({
    initialValue: session.title,
    onSave: (title) => renameSession.mutate({sessionId: session.id, title}),
  });

  const activityLabel = status === "stopping" ? "Stopping" : status === "compacting" ? "Compacting" : streaming ? "Working" : unseen ? "Unread chat" : "Chat";

  return (
    <SidebarPresence as="li" level="chat" onPrefetch={onPrefetch}>
      <div className={cn(ledgerRowClassName, current && "bg-overlay-pressed text-ink-strong", selected && !current && "text-ink")} title={session.title}>
        <span className="ml-2 grid w-3 shrink-0 place-items-center">
          {hasAgents && (
            <IconButton
              label={`${expanded ? "Collapse" : "Expand"} agents in ${session.title}`}
              aria-expanded={expanded}
              className="sidebar-row-disclosure grid h-8 w-3 shrink-0 place-items-center"
              onClick={() => setAgentView({path: pathname, open: !expanded})}
            >
              <Icon name="chevron-right" size="xs" className={cn(ledgerDisclosureClassName, expanded && "rotate-90")} />
            </IconButton>
          )}
        </span>
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
          <Button aria-current={current ? "page" : undefined} aria-label={`Open chat: ${session.title}`} className={cn(ledgerPrimaryClassName, "gap-1 py-0 pl-1")} onClick={onOpen}>
            <span className={ledgerMarkClassName} role="img" aria-label={activityLabel} title={activityLabel}>
              <ConversationStar className="size-5" active={streaming || agentsWorking} />
            </span>
            <SidebarLabel constant={orchestrator ? "tau" : "phi"} text={session.title} className="min-w-0 flex-1 truncate text-xs leading-5">
              <SessionTitleText title={session.title} />
            </SidebarLabel>
          </Button>
        )}
        <LedgerRowEnd
          actions={
            <>
              <IconButton
                aria-pressed={session.pinned}
                className="sidebar-pin size-6 rounded-md text-white hover:bg-overlay-pressed"
                label={session.pinned ? "Unpin chat" : "Pin chat"}
                onClick={(event) => {
                  event.stopPropagation();
                  onTogglePinned();
                }}
              >
                <Icon name={session.pinned ? "pin-filled" : "pin"} size="xs" />
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
      <SidebarBranch open={hasAgents && expanded}>
        <ChatAgentList sessionId={session.id} live={streaming || agentsWorking} />
      </SidebarBranch>
      {managed && <WorkspaceActivityLink sessionId={session.id} />}
    </SidebarPresence>
  );
}
