import {useCallback, useRef, useState} from "react";
import type {MouseEvent} from "react";
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

const INITIAL_SESSION_LIMIT = 5;
const SESSION_LIMIT_INCREMENT = 5;

interface ProjectListItemProps {
  activeSessionId: string;
  dragging: boolean;
  expanded: boolean;
  project: ProjectListProject;
  onToggle: (projectId: string) => void;
}

export default function ProjectListItem(props: ProjectListItemProps) {
  const {activeSessionId, dragging, expanded, onToggle, project} = props;

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

  const handleToggle = (): void => {
    selectProject(project.harnessId ?? "coding", project.harnessProjectId);
    if (project.harnessProjectId) {
      if (!expanded) onToggle(project.id);
      void navigate({to: "/harness/$harnessId", params: {harnessId: project.harnessId ?? "coding"}, search: {projectId: project.harnessProjectId, section: "Chats"}});
    } else onToggle(project.id);
  };

  const handleRemoveProject = (): void => {
    removeProject(project.id);
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
      <Button
        as="div"
        className={cn("group relative flex w-full justify-between items-center gap-1 pl-1 pr-1 py-1 text-ink-muted hover:text-ink", actionsMenuOpen && "bg-overlay-hover")}
        title={`${project.name}\n${project.path}`}
        onClick={handleToggle}
        variant="primary"
      >
        <div className="flex min-w-0 flex-1 flex-row gap-2 items-center">
          {project.harnessProjectId && (
            <IconButton
              label={`${expanded ? "Collapse" : "Expand"} chats in ${project.name}`}
              className="size-4 shrink-0 text-ink-faint"
              onClick={(event) => {
                event.stopPropagation();
                onToggle(project.id);
              }}
            >
              <Icon name="chevron-down" size="xs" className={cn(!expanded && "-rotate-90")} />
            </IconButton>
          )}
          {project.harnessProjectId ? (
            <AgentMark name={project.harnessProjectId} kind="lead" color={project.color ?? (project.isCoordinator ? "#ffffff" : undefined)} className="size-7 shrink-0" />
          ) : (
            <Icon className="text-ink-muted" name={expanded ? "folder-open" : "folder"} size="sm" />
          )}
          {renaming && (
            <input
              className="min-w-0 flex-1 truncate bg-transparent text-sm text-ink-muted outline-none"
              onBlur={handleRenameBlur}
              onChange={handleRenameChange}
              onClick={handleRenameClick}
              onFocus={handleRenameFocus}
              onKeyDown={handleRenameKeyDown}
              onPointerDown={(event) => event.stopPropagation()}
              ref={renameInputRef}
              value={draftName}
            />
          )}
          {!renaming && (
            <span className="min-w-0 flex-1 pr-5 text-[13px] leading-snug">
              <span className="line-clamp-2">{project.harnessProjectId ? agentLabel(project.name) : project.name}</span>
              {project.isCoordinator && <span className="mt-0.5 block text-[10px] text-ink-faint">Coordinates all labs</span>}
            </span>
          )}
        </div>
        <div className="absolute right-1 flex items-center gap-0.5 rounded-md bg-surface-sidebar opacity-0 group-hover:opacity-100 group-focus-within:opacity-100">
          <div className={cn("opacity-0 group-hover:opacity-100", actionsMenuOpen && "opacity-100")}>
            <Menu
              onOpenChange={setActionsMenuOpen}
              open={actionsMenuOpen}
              trigger={(triggerProps) => (
                <Button {...triggerProps} className="size-7" shape="icon" size="md" variant="ghost">
                  <Icon name="more-horizontal" size="xs" />
                </Button>
              )}
              triggerLabel={`Project actions for ${project.name}`}
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
                      to: "/harness/$harnessId",
                      params: {harnessId: project.harnessId ?? "coding"},
                      search: {projectId: project.harnessProjectId, section: "Prompts"},
                    });
                  }}
                >
                  Project instructions
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
            </Menu>
          </div>
          <IconButton className="size-7" label={`New session in ${project.name}`} onClick={handleNewSession}>
            <Icon name="new-session" size="xs" />
          </IconButton>
        </div>
      </Button>

      <div className={cn("overflow-hidden", sessionsExpanded && "py-0.5")} onPointerDown={(event) => event.stopPropagation()}>
        <ul className="flex flex-col gap-0.5" ref={attachSessionListAutoAnimateRef}>
          {expanded && sessionsQuery.isPending && (
            <li className="ml-10 inline-flex items-center justify-start gap-2 px-0 py-1 text-sm text-ink-faint">
              Loading sessions
              <span className="size-2.5 animate-spin rounded-full border border-border-strong border-t-ink" aria-hidden="true" />
            </li>
          )}
          {expanded && sessionsQuery.error != null && <li className="px-8 py-1 text-sm text-danger-ink">Unable to load sessions.</li>}
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
              <Button className="ml-8 inline-flex items-center justify-start gap-2 py-1 text-xs" onClick={handleLoadMoreSessions} variant="ghost">
                Show more
              </Button>
            </li>
          )}

          {canShowLessAtEnd && (
            <li>
              <Button className="ml-8 justify-start px-0 py-1 text-xs" onClick={handleShowLessSessions} variant="ghost">
                Show less
              </Button>
            </li>
          )}

          {expanded && !sessionsQuery.isPending && sessionsQuery.error == null && !hasSessions && <li className="px-8 py-1 text-sm text-ink-faint">No sessions</li>}
        </ul>
      </div>
    </>
  );
}
