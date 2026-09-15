import {useState} from "react";
import ConstantOrb from "@/components/brand/constant-orb";
import type {MouseEvent} from "react";
import {useLocation, useNavigate} from "@tanstack/react-router";
import {useQueryClient} from "@tanstack/react-query";
import {AnimatePresence} from "framer-motion";
import SidebarLabel from "@/features/sidebar/components/sidebar-label";
import Button from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import IconButton from "@/components/ui/icon-button";
import Menu, {MenuItem} from "@/components/ui/menu";
import type {ProjectListProject} from "@/features/projects/types/project-list";
import ProjectSessionListItem from "@/features/projects/components/project-list/project-session-list-item";
import {useListProjectSessions} from "@/features/projects/hooks/api/use-list-project-sessions";
import {useInlineRename} from "@/hooks/use-inline-rename";
import {useProjectsStore} from "@/features/projects/stores/projects-store";
import {sessionQueryOptions} from "@/features/sessions/hooks/api/use-session";
import {useSessionLiveStore} from "@/features/sessions/stores/session-live-store";
import {hasUnseenActivity, useSessionVisitsStore} from "@/features/sessions/stores/session-visits-store";
import {useWorkspaceMapStore} from "@/features/workspace/stores/workspace-map-store";
import {useWorkspaceOverview} from "@/features/workspace/hooks/use-workspace-overview";
import {workspaceActivity} from "@/features/workspace/lib/build-workspace-model";
import {cn} from "@/lib/cn";
import AgentMark from "@/features/harnesses/components/agent-mark";
import {agentColor, agentLabel} from "@/features/harnesses/lib/agent-identity";
import {useHarnessNavigationStore} from "@/features/harnesses/stores/harness-navigation-store";
import {useHarnessLibrary, useRemoveHarnessProject} from "@/features/harnesses/hooks/api/use-harnesses";
import {showToast} from "@/components/ui/toast-manager";
import {ledgerDisclosureClassName, ledgerMarkClassName, ledgerPrimaryClassName, ledgerRowClassName} from "@/features/sidebar/lib/ledger-styles";
import LedgerRowEnd from "@/features/sidebar/components/ledger-row-end";

const INITIAL_SESSION_LIMIT = 5;
const SESSION_LIMIT_INCREMENT = 5;

interface ProjectListItemProps {
  activeSessionId: string;
  dragging: boolean;
  expanded: boolean;
  /** The project folder is gone from disk, so new chats cannot start. */
  folderMissing?: boolean;
  project: ProjectListProject;
  onToggle: (projectId: string) => void;
}

export default function ProjectListItem(props: ProjectListItemProps) {
  const {activeSessionId, dragging, expanded, folderMissing = false, onToggle, project} = props;

  const [actionsMenuOpen, setActionsMenuOpen] = useState(false);
  const [visibleSessionLimit, setVisibleSessionLimit] = useState(INITIAL_SESSION_LIMIT);
  const location = useLocation();
  const navigate = useNavigate();
  const selectProject = useHarnessNavigationStore((state) => state.selectProject);
  const queryClient = useQueryClient();
  const removeProject = useProjectsStore((state) => state.removeProject);
  const renameProject = useProjectsStore((state) => state.renameProject);
  const toggleSessionPinned = useProjectsStore((state) => state.toggleSessionPinned);
  const toggleProjectPinned = useProjectsStore((state) => state.toggleProjectPinned);
  const sessionLiveStates = useSessionLiveStore((state) => state.sessions);
  const sessionVisits = useSessionVisitsStore((state) => state.visits);
  const {
    draftName,
    handleBlur: handleRenameBlur,
    handleChange: handleRenameChange,
    handleClick: handleRenameClick,
    handleFocus: handleRenameFocus,
    handleKeyDown: handleRenameKeyDown,
    handleInputRef: renameInputRef,
    renaming,
    startRenaming,
  } = useInlineRename({initialValue: project.name, onSave: (name) => renameProject(project.id, name)});
  const sessionsQuery = useListProjectSessions({projectPath: project.path});

  const overview = useWorkspaceOverview();
  const sidebarDetail = useWorkspaceMapStore((state) => state.sidebarDetail);
  const activity = workspaceActivity(
    overview.model.items,
    undefined,
    project.harnessProjectId ?? overview.model.items.find((item) => item.kind === "project" && item.projectPath === project.path)?.projectId ?? project.id
  );
  const [heldOrder, setHeldOrder] = useState<readonly string[]>();
  const sessions = sessionsQuery.data
    ? sessionsQuery.data.sessions
        .map((session) => ({
          id: session.id,
          pinned: project.pinnedSessionIds.includes(session.id),
          title: session.title,
          timestamp: Date.parse(session.updatedAt),
        }))
        .toSorted((left, right) => {
          if (left.pinned !== right.pinned) return left.pinned ? -1 : 1;
          if (left.pinned) return project.pinnedSessionIds.indexOf(left.id) - project.pinnedSessionIds.indexOf(right.id);
          if (heldOrder) {
            const a = heldOrder.indexOf(left.id);
            const b = heldOrder.indexOf(right.id);
            if (a !== b) return (a < 0 ? Number.MAX_SAFE_INTEGER : a) - (b < 0 ? Number.MAX_SAFE_INTEGER : b);
          }
          return right.timestamp - left.timestamp;
        })
    : [];

  const activeSession = sessions.find((session) => session.id === activeSessionId);
  const delegatedSessionIds = new Set(overview.model.items.filter((item) => item.kind === "agent" && item.active).map((item) => item.sessionId));
  const workingSessions = sessions.filter((session) => {
    const status = sessionLiveStates[session.id]?.status;
    return status === "streaming" || status === "stopping" || status === "compacting" || delegatedSessionIds.has(session.id);
  });

  const pinnedSessions = sessions.filter((session) => session.pinned);
  const unpinnedSessions = sessions.filter((session) => !session.pinned);
  const visibleSessionIds = new Set(
    [...pinnedSessions, ...workingSessions, ...unpinnedSessions.slice(0, visibleSessionLimit), ...(activeSession ? [activeSession] : [])].map((session) => session.id)
  );
  const visibleSessions = sessions.filter((session) => visibleSessionIds.has(session.id));
  const displayedSessions = dragging ? [] : expanded ? visibleSessions : visibleSessions.filter((session) => session.id === activeSessionId || workingSessions.includes(session));
  const sessionsExpanded = expanded || displayedSessions.length > 0;

  const hasSessions = sessions.length > 0;
  const hasHiddenSessions = unpinnedSessions.some((session) => !visibleSessionIds.has(session.id));
  const canShowLessSessions = visibleSessionLimit > INITIAL_SESSION_LIMIT;
  const canShowMoreSessions = expanded && hasHiddenSessions;
  const canShowLessAtEnd = expanded && canShowLessSessions && !canShowMoreSessions;
  const canOpenInFinder = window.desktopApi?.environment === "mac";
  // A project without a harness has no harness pages and no lead; its row offers plain project actions instead.
  const harnessId = project.harnessId;
  const harnessProjectId = harnessId ? project.harnessProjectId : undefined;
  const projectLabel = harnessProjectId ? agentLabel(project.name) : project.name;

  const followHarness = (): void => {
    if (harnessId) selectProject(harnessId, harnessProjectId);
  };

  const handleToggle = (): void => {
    followHarness();
    // Chats live in the sidebar, so a project row only expands or collapses; configuration is behind the gear.
    onToggle(project.id);
  };

  const handleRemoveProject = (): void => {
    removeProject(project.id);
  };

  const library = useHarnessLibrary();
  const removeHarnessProject = useRemoveHarnessProject();
  const handleRemoveFromHarness = (): void => {
    const revision = library.data?.revision;
    if (!harnessProjectId || revision === undefined) return;
    if (!window.confirm(`Remove ${projectLabel} from its harness? The folder and its files stay on disk.`)) return;
    removeHarnessProject.mutate(
      {projectId: harnessProjectId, expectedRevision: revision},
      {onError: (error) => showToast("Could not remove the project", error instanceof Error ? error.message : "Please try again.")}
    );
  };

  const handleToggleProjectPinned = (): void => {
    const stored = useProjectsStore.getState().addProject(project.path, project.harnessId);
    if (stored) toggleProjectPinned(stored.id);
  };

  const handleOpenSession = (sessionId: string): void => {
    followHarness();
    void navigate({params: {sessionId}, to: "/session/$sessionId"});
  };

  const handlePrefetchSession = (sessionId: string): void => {
    if (sessionId === activeSessionId) return;

    void queryClient.prefetchQuery(sessionQueryOptions(sessionId));
  };

  const handleNewSession = (event: MouseEvent<HTMLButtonElement>): void => {
    event.stopPropagation();
    followHarness();
    void navigate({search: {projectId: project.id}, to: "/session/new"});
  };

  const handleOpenInFinder = (): void => {
    void window.desktopApi?.openDirectory(project.path);
  };

  const handleLoadMoreSessions = (): void => {
    setVisibleSessionLimit((limit) => limit + SESSION_LIMIT_INCREMENT);
  };

  const handleShowLessSessions = (): void => {
    setVisibleSessionLimit(INITIAL_SESSION_LIMIT);
  };

  return (
    <>
      <div
        className={cn(ledgerRowClassName, actionsMenuOpen && "bg-overlay-hover text-ink", folderMissing && "opacity-60")}
        data-sidebar-level={project.isCoordinator ? "lead" : "project"}
        title={folderMissing ? `Folder missing: ${project.path}` : `${project.name}\n${project.path}`}
      >
        {renaming ? (
          <input
            aria-label="Project name"
            className="m-2 min-w-0 flex-1 rounded-md bg-overlay-hover px-2 py-2 text-sm text-ink outline-none focus-visible:ring-1 focus-visible:ring-border-strong"
            onBlur={handleRenameBlur}
            onChange={handleRenameChange}
            onClick={handleRenameClick}
            onFocus={handleRenameFocus}
            onKeyDown={handleRenameKeyDown}
            onPointerDown={(event) => event.stopPropagation()}
            ref={renameInputRef}
            value={draftName}
          />
        ) : (
          <Button
            aria-expanded={expanded}
            aria-label={hasSessions ? `${expanded ? "Collapse" : "Expand"} chats in ${projectLabel}` : projectLabel}
            className={cn(ledgerPrimaryClassName, "gap-1 py-0")}
            onClick={handleToggle}
          >
            <Icon className={cn(ledgerDisclosureClassName, !expanded && "-rotate-90")} name="chevron-down" size="xs" />
            <span className={ledgerMarkClassName}>
              {folderMissing ? (
                <Icon className="shrink-0 text-danger-ink" name="alert" size="sm" />
              ) : harnessProjectId ? (
                <AgentMark
                  className={project.isCoordinator ? "size-8 shrink-0" : "size-7 shrink-0"}
                  color={project.color ?? (project.isCoordinator ? "#ffffff" : agentColor(harnessProjectId))}
                  kind={project.isCoordinator ? "orchestrator" : "lead"}
                  name={harnessProjectId}
                  working={!overview.error && !overview.data?.errors.length && (activity.working > 0 || workingSessions.length > 0)}
                />
              ) : (
                <ConstantOrb
                  constant="phi"
                  className="size-7"
                  state={!overview.error && !overview.data?.errors.length && (activity.working > 0 || workingSessions.length > 0) ? "working" : "idle"}
                />
              )}
            </span>
            <span className="min-w-0 flex-1">
              <SidebarLabel constant={project.isCoordinator ? "tau" : "phi"} text={projectLabel} className="block truncate text-sm font-medium leading-5" />
              {(folderMissing || (sidebarDetail && (project.isCoordinator || workingSessions.length > 0 || activity.working > 0 || activity.attention > 0))) && (
                <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-ink-faint">
                  {sidebarDetail && project.isCoordinator && <span>Harness lead</span>}
                  {folderMissing ? (
                    <span className="text-danger-ink">Folder missing</span>
                  ) : activity.working > 0 || workingSessions.length > 0 || activity.attention > 0 ? (
                    <span className="text-white">
                      {overview.error || overview.data?.errors.length ? "Last saved · " : ""}
                      {[
                        Math.max(activity.working, workingSessions.length) > 0 ? `${Math.max(activity.working, workingSessions.length)} working` : "",
                        activity.attention > 0 ? `${activity.attention} need attention` : "",
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  ) : null}
                </span>
              )}
            </span>
          </Button>
        )}
        <LedgerRowEnd
          actions={
            <>
              <IconButton
                className="size-6 rounded-md text-ink-faint hover:bg-overlay-pressed hover:text-ink"
                disabled={folderMissing}
                label={`New chat in ${projectLabel}`}
                onClick={handleNewSession}
                title={folderMissing ? "Folder missing, so chats cannot start" : `New chat in ${projectLabel}`}
              >
                <Icon name="new-chat" size="xs" />
              </IconButton>
              <Menu
                onOpenChange={setActionsMenuOpen}
                open={actionsMenuOpen}
                trigger={(triggerProps) => (
                  <Button {...triggerProps} className="size-6 rounded-md text-ink-faint hover:bg-overlay-pressed hover:text-ink" shape="icon" size="md" variant="ghost">
                    <Icon name="more-horizontal" size="xs" />
                  </Button>
                )}
                triggerLabel={`Project actions for ${projectLabel}`}
                sideOffset={2}
              >
                <MenuItem icon={<Icon name="pin" size="xs" />} onClick={handleToggleProjectPinned}>
                  {project.pinned ? "Unpin project" : "Pin project"}
                </MenuItem>
                {canOpenInFinder && (
                  <MenuItem icon={<Icon name="folder-open" size="xs" />} onClick={handleOpenInFinder}>
                    Open in Finder
                  </MenuItem>
                )}
                {harnessId && harnessProjectId && (
                  <MenuItem
                    icon={<Icon name="settings" size="xs" />}
                    onClick={() => {
                      selectProject(harnessId, harnessProjectId);
                      void navigate({
                        to: "/settings/harness/$harnessId/$page",
                        params: {harnessId, page: "projects"},
                        search: {project: harnessProjectId},
                      });
                    }}
                  >
                    Project settings
                  </MenuItem>
                )}
                {!harnessProjectId && (
                  <MenuItem icon={<Icon name="edit" size="xs" />} onClick={startRenaming}>
                    Rename project
                  </MenuItem>
                )}
                {!harnessProjectId && (
                  <MenuItem icon={<Icon name="x" size="xs" />} onClick={handleRemoveProject}>
                    Remove
                  </MenuItem>
                )}
                {harnessProjectId && (
                  <MenuItem icon={<Icon name="x" size="xs" />} onClick={handleRemoveFromHarness}>
                    Remove from harness
                  </MenuItem>
                )}
              </Menu>
            </>
          }
        />
      </div>

      <div className={cn("overflow-hidden", sessionsExpanded && "pb-0.5")} onPointerDown={(event) => event.stopPropagation()}>
        <ul
          aria-label={`Chats in ${projectLabel}`}
          onPointerEnter={() => setHeldOrder(sessions.map((session) => session.id))}
          onPointerLeave={(event) => {
            if (!event.currentTarget.contains(document.activeElement)) setHeldOrder(undefined);
          }}
          onFocus={() => {
            if (!heldOrder) setHeldOrder(sessions.map((session) => session.id));
          }}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) setHeldOrder(undefined);
          }}
          className="ml-3 flex flex-col gap-0.5"
        >
          {expanded && sessionsQuery.isPending && (
            <li className="flex items-center gap-2 px-2 py-1 text-xs text-ink-faint">
              Loading chats
              <span className="size-2.5 animate-spin rounded-full border border-border-strong border-t-ink" aria-hidden="true" />
            </li>
          )}
          {expanded && sessionsQuery.error != null && (
            <li role="status" className="px-2 py-1 text-xs text-danger-ink">
              Unable to load chats.
            </li>
          )}
          <AnimatePresence initial={false}>
            {displayedSessions.map((session) => {
              const selected = location.pathname === `/session/${session.id}` || location.pathname.startsWith(`/session/${session.id}/`);
              const sessionLive = sessionLiveStates[session.id];
              const sessionStreaming = sessionLive?.status === "streaming" || sessionLive?.status === "stopping" || sessionLive?.status === "compacting";
              const sessionUnseen = !sessionStreaming && hasUnseenActivity({activityAtMs: session.timestamp, visitedAt: sessionVisits[session.id]});

              return (
                <ProjectSessionListItem
                  key={session.id}
                  onOpen={() => handleOpenSession(session.id)}
                  onPrefetch={() => handlePrefetchSession(session.id)}
                  onTogglePinned={() => {
                    const stored = useProjectsStore.getState().addProject(project.path, project.harnessId);
                    if (stored) toggleSessionPinned(stored.id, session.id);
                  }}
                  projectPath={project.path}
                  selected={selected}
                  current={location.pathname === `/session/${session.id}`}
                  session={session}
                  managed={!!harnessProjectId}
                  orchestrator={project.isCoordinator}
                  streaming={sessionStreaming}
                  status={sessionLive?.status}
                  unseen={sessionUnseen}
                />
              );
            })}
          </AnimatePresence>

          {canShowMoreSessions && (
            <li>
              <Button className="flex h-8 items-center gap-1.5 rounded-lg px-2 text-xs text-ink-faint hover:bg-overlay-hover hover:text-ink" onClick={handleLoadMoreSessions}>
                <Icon name="chevron-down" size="xs" />
                Show more chats
              </Button>
            </li>
          )}

          {canShowLessAtEnd && (
            <li>
              <Button className="flex h-8 items-center gap-1.5 rounded-lg px-2 text-xs text-ink-faint hover:bg-overlay-hover hover:text-ink" onClick={handleShowLessSessions}>
                <Icon name="chevron-down" size="xs" className="rotate-180" />
                Show fewer chats
              </Button>
            </li>
          )}

          {expanded && !sessionsQuery.isPending && sessionsQuery.error == null && !hasSessions && <li className="px-2 py-1 text-xs text-ink-faint">No chats yet</li>}
        </ul>
      </div>
    </>
  );
}
