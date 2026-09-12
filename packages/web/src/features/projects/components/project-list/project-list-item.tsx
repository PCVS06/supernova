import {useCallback, useRef, useState} from "react";
import type {KeyboardEvent, MouseEvent} from "react";
import {useLocation, useNavigate} from "@tanstack/react-router";
import {useQueryClient} from "@tanstack/react-query";
import {autoAnimate} from "@formkit/auto-animate";
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
import {formatUpdatedAt} from "@/features/projects/utils/format-updated-at";
import {cn} from "@/lib/cn";
import AgentMark from "@/features/harnesses/components/agent-mark";
import {agentColor, agentLabel} from "@/features/harnesses/lib/agent-identity";
import {useHarnessNavigationStore} from "@/features/harnesses/stores/harness-navigation-store";
import {useHarnessLibrary, useRemoveHarnessProject} from "@/features/harnesses/hooks/api/use-harnesses";
import {showToast} from "@/components/ui/toast-manager";

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
  const animatedSessionListsRef = useRef(new WeakSet<HTMLElement>());
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

  const sessions =
    sessionsQuery.data?.sessions
      .map((session) => ({
        id: session.id,
        pinned: project.pinnedSessionIds.includes(session.id),
        title: session.title,
        timestamp: Date.parse(session.updatedAt),
        updatedAt: formatUpdatedAt(session.updatedAt),
      }))
      .toSorted((left, right) => Number(right.pinned) - Number(left.pinned) || right.timestamp - left.timestamp) ?? [];

  const activeSession = sessions.find((session) => session.id === activeSessionId);

  const pinnedSessions = sessions.filter((session) => session.pinned);
  const unpinnedSessions = sessions.filter((session) => !session.pinned);
  const visibleSessionIds = new Set([...pinnedSessions, ...unpinnedSessions.slice(0, visibleSessionLimit), ...(activeSession ? [activeSession] : [])].map((session) => session.id));
  const visibleSessions = sessions.filter((session) => visibleSessionIds.has(session.id));
  const displayedSessions = expanded ? visibleSessions : activeSession && !dragging ? [activeSession] : [];
  const sessionsExpanded = expanded || (activeSession != null && !dragging);

  const hasSessions = sessions.length > 0;
  const hasHiddenSessions = unpinnedSessions.some((session) => !visibleSessionIds.has(session.id));
  const canShowLessSessions = visibleSessionLimit > INITIAL_SESSION_LIMIT;
  const canShowMoreSessions = expanded && hasHiddenSessions;
  const canShowLessAtEnd = expanded && canShowLessSessions && !canShowMoreSessions;
  const canOpenInFinder = window.desktopApi?.environment === "mac";
  const projectLabel = project.harnessProjectId ? agentLabel(project.name) : project.name;
  // The chat tree only draws its guide line when it has something to show, so a collapsed project stays a single clean row.
  const sessionTreeVisible = displayedSessions.length > 0 || (expanded && (sessionsQuery.isPending || sessionsQuery.error != null || !hasSessions));

  const handleToggle = (): void => {
    selectProject(project.harnessId ?? "coding", project.harnessProjectId);
    // Chats live in the sidebar, so a project row only expands or collapses; configuration is behind the gear.
    onToggle(project.id);
  };

  const handleRowKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    handleToggle();
  };

  const handleRemoveProject = (): void => {
    removeProject(project.id);
  };

  const library = useHarnessLibrary();
  const removeHarnessProject = useRemoveHarnessProject();
  const handleRemoveFromHarness = (): void => {
    const revision = library.data?.revision;
    if (!project.harnessProjectId || revision === undefined) return;
    if (!window.confirm(`Remove ${projectLabel} from its harness? The folder and its files stay on disk.`)) return;
    removeHarnessProject.mutate(
      {projectId: project.harnessProjectId, expectedRevision: revision},
      {onError: (error) => showToast("Could not remove the project", error instanceof Error ? error.message : "Please try again.")}
    );
  };

  const handleToggleProjectPinned = (): void => {
    toggleProjectPinned(project.id);
  };

  const handleOpenSession = (sessionId: string): void => {
    selectProject(project.harnessId ?? "coding", project.harnessProjectId);
    void navigate({params: {sessionId}, to: "/session/$sessionId"});
  };

  const handlePrefetchSession = (sessionId: string): void => {
    if (sessionId === activeSessionId) return;

    void queryClient.prefetchQuery(sessionQueryOptions(sessionId));
  };

  const handleNewSession = (event: MouseEvent<HTMLButtonElement>): void => {
    event.stopPropagation();
    selectProject(project.harnessId ?? "coding", project.harnessProjectId);
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

  const attachSessionListAutoAnimateRef = useCallback((node: HTMLElement | null): void => {
    if (!node || animatedSessionListsRef.current.has(node)) return;
    autoAnimate(node, {
      duration: 180,
      easing: "ease-out",
    });
    animatedSessionListsRef.current.add(node);
  }, []);

  return (
    <>
      <div
        aria-expanded={hasSessions ? expanded : undefined}
        className={cn(
          "group/project flex h-9 w-full cursor-pointer items-center gap-1.5 rounded-md px-2 text-left text-ink-muted hover:bg-overlay-hover hover:text-ink",
          actionsMenuOpen && "bg-overlay-hover text-ink",
          folderMissing && "opacity-60"
        )}
        onClick={handleToggle}
        onKeyDown={handleRowKeyDown}
        role="button"
        tabIndex={0}
        title={folderMissing ? `Folder missing: ${project.path}` : `${project.name}\n${project.path}`}
      >
        {hasSessions ? (
          <IconButton
            className="size-4 shrink-0 text-ink-faint hover:text-ink"
            label={`${expanded ? "Collapse" : "Expand"} chats in ${projectLabel}`}
            onClick={(event) => {
              event.stopPropagation();
              onToggle(project.id);
            }}
          >
            <Icon name="chevron-down" size="xs" className={cn("transition-transform duration-150", !expanded && "-rotate-90")} />
          </IconButton>
        ) : (
          <span aria-hidden="true" className="size-4 shrink-0" />
        )}
        {folderMissing ? (
          <span className="grid size-5 shrink-0 place-items-center text-danger-ink">
            <Icon name="alert" size="sm" />
          </span>
        ) : project.harnessProjectId ? (
          <AgentMark name={project.harnessProjectId} kind="lead" color={project.color ?? (project.isCoordinator ? "#ffffff" : undefined)} className="size-5 shrink-0" />
        ) : (
          <Icon className="size-5 shrink-0 text-ink-faint" name={expanded ? "folder-open" : "folder"} size="sm" />
        )}
        {renaming ? (
          <input
            aria-label="Project name"
            className="min-w-0 flex-1 truncate bg-transparent text-[13px] text-ink outline-none"
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
          <span className="min-w-0 flex-1 truncate text-[13px] leading-5">{projectLabel}</span>
        )}
        {project.isCoordinator && !renaming && (
          <span className="shrink-0 rounded-sm bg-overlay-pressed px-1 py-px text-[9px] font-medium uppercase tracking-wide text-ink-faint">Lead</span>
        )}
        <span className="grid w-13 shrink-0 place-items-end">
          <span className="col-start-1 row-start-1 flex items-center justify-end pr-1 text-ink-faint group-hover/project:invisible group-focus-within/project:invisible">
            {project.pinned && <Icon name="pin" size="xs" />}
          </span>
          <span
            className={cn(
              "col-start-1 row-start-1 flex items-center gap-0.5 opacity-0 group-hover/project:opacity-100 group-focus-within/project:opacity-100",
              actionsMenuOpen && "opacity-100"
            )}
          >
            <IconButton
              className="size-6 rounded-md text-ink-muted hover:bg-overlay-pressed hover:text-ink"
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
                <Button {...triggerProps} className="size-6 rounded-md text-ink-muted hover:bg-overlay-pressed hover:text-ink" shape="icon" size="md" variant="ghost">
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
              {project.harnessProjectId && (
                <MenuItem
                  icon={<Icon name="settings" size="xs" />}
                  onClick={() => {
                    selectProject(project.harnessId ?? "coding", project.harnessProjectId);
                    void navigate({
                      to: "/settings/harness/$harnessId",
                      params: {harnessId: project.harnessId ?? "coding"},
                      search: {projectId: project.harnessProjectId, section: "projects"},
                    });
                  }}
                >
                  Project settings
                </MenuItem>
              )}
              {!project.harnessProjectId && (
                <MenuItem icon={<Icon name="edit" size="xs" />} onClick={startRenaming}>
                  Rename project
                </MenuItem>
              )}
              {!project.harnessProjectId && (
                <MenuItem icon={<Icon name="x" size="xs" />} onClick={handleRemoveProject}>
                  Remove
                </MenuItem>
              )}
              {project.harnessProjectId && (
                <MenuItem icon={<Icon name="x" size="xs" />} onClick={handleRemoveFromHarness}>
                  Remove from harness
                </MenuItem>
              )}
            </Menu>
          </span>
        </span>
      </div>

      <div className={cn("overflow-hidden", sessionsExpanded && "pb-0.5")} onPointerDown={(event) => event.stopPropagation()}>
        <ul className={cn("flex flex-col gap-px", sessionTreeVisible && "ml-3.5 border-l border-border-muted py-0.5 pl-1.5")} ref={attachSessionListAutoAnimateRef}>
          {expanded && sessionsQuery.isPending && (
            <li className="flex items-center gap-2 px-2 py-1 text-[11px] text-ink-faint">
              Loading chats
              <span className="size-2.5 animate-spin rounded-full border border-border-strong border-t-ink" aria-hidden="true" />
            </li>
          )}
          {expanded && sessionsQuery.error != null && <li className="px-2 py-1 text-[11px] text-danger-ink">Unable to load chats.</li>}
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
                onTogglePinned={() => toggleSessionPinned(project.id, session.id)}
                projectPath={project.path}
                selected={selected}
                session={session}
                color={project.color ?? (project.isCoordinator ? "#ffffff" : agentColor(project.harnessProjectId ?? project.id))}
                managed={!!project.harnessProjectId}
                streaming={sessionStreaming}
                unseen={sessionUnseen}
              />
            );
          })}

          {canShowMoreSessions && (
            <li>
              <Button className="flex h-7 items-center px-2 text-[11px] text-ink-faint hover:text-ink" onClick={handleLoadMoreSessions}>
                Show more
              </Button>
            </li>
          )}

          {canShowLessAtEnd && (
            <li>
              <Button className="flex h-7 items-center px-2 text-[11px] text-ink-faint hover:text-ink" onClick={handleShowLessSessions}>
                Show less
              </Button>
            </li>
          )}

          {expanded && !sessionsQuery.isPending && sessionsQuery.error == null && !hasSessions && <li className="px-2 py-1 text-[11px] text-ink-faint">No chats yet</li>}
        </ul>
      </div>
    </>
  );
}
