import {useState} from "react";
import {useQueries} from "@tanstack/react-query";
import Button from "@/components/ui/button";
import Dialog from "@/components/ui/dialog";
import Icon from "@/components/ui/icon";
import {MenuLabel} from "@/components/ui/menu";
import SearchField from "@/components/ui/search-field";
import {listProjectSessionsQueryOptions} from "@/features/projects/hooks/api/use-list-project-sessions";
import {useProjectList} from "@/features/projects/hooks/use-project-list";
import {formatUpdatedAt} from "@/features/projects/utils/format-updated-at";
import SessionTitleText from "@/features/sessions/components/session-title-text";

interface SplitCandidate {
  readonly id: string;
  readonly projectName: string;
  readonly timestamp: number;
  readonly title: string;
  readonly updatedAt: string;
}

interface SplitSessionPickerProps {
  /** Chats that already own a pane, including the routed one. */
  readonly excludedSessionIds: readonly string[];
  readonly onClose: () => void;
  readonly onSelect: (sessionId: string) => void;
  readonly open: boolean;
}

/** Picks the chat to open beside the current one, from any project. */
export default function SplitSessionPicker(props: SplitSessionPickerProps) {
  const {excludedSessionIds, onClose, onSelect, open} = props;
  const [query, setQuery] = useState("");
  const projects = useProjectList();
  const projectSessionQueries = useQueries({queries: projects.map((project) => listProjectSessionsQueryOptions(project.path))});
  const projectNamesByPath = new Map(projects.map((project) => [project.path, project.name]));
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const excluded = new Set(excludedSessionIds);

  const candidatesByProject = projectSessionQueries
    .map((projectSessionsQuery) => {
      const projectPath = projectSessionsQuery.data?.projectPath ?? "";
      const projectName = projectNamesByPath.get(projectPath) ?? projectPath;
      const sessions = (projectSessionsQuery.data?.sessions ?? [])
        .filter((session) => !excluded.has(session.id) && (normalizedQuery.length === 0 || session.title.toLocaleLowerCase().includes(normalizedQuery)))
        .map(
          (session): SplitCandidate => ({
            id: session.id,
            projectName,
            timestamp: Date.parse(session.updatedAt),
            title: session.title,
            updatedAt: formatUpdatedAt(session.updatedAt),
          })
        )
        .toSorted((left, right) => right.timestamp - left.timestamp);

      return {projectName, projectPath, sessions};
    })
    .filter((group) => group.sessions.length > 0);

  const handleOpenChange = (nextOpen: boolean): void => {
    if (!nextOpen) onClose();
  };

  const handleOpenChangeComplete = (nextOpen: boolean): void => {
    if (!nextOpen) setQuery("");
  };

  return (
    <Dialog onOpenChange={handleOpenChange} onOpenChangeComplete={handleOpenChangeComplete} open={open} title="Open a chat beside this one">
      <SearchField aria-label="Search chats" autoFocus className="-mx-5 mt-3 px-5" onChange={(event) => setQuery(event.target.value)} placeholder="Search chats" value={query} />
      <div className="min-h-0 flex-1 overflow-y-auto py-2">
        {candidatesByProject.length === 0 && <p className="px-3 py-2 text-sm text-ink-faint">No other chats to open here.</p>}
        {candidatesByProject.map((group) => (
          <div className="pb-1" key={group.projectPath}>
            <MenuLabel className="pb-1 text-xs">{group.projectName}</MenuLabel>
            {group.sessions.map((session) => (
              <Button
                className="flex w-full min-w-0 items-center gap-3 rounded-xl corner-superellipse/1.3 px-3 py-2 text-left hover:bg-overlay-hover"
                key={session.id}
                onClick={() => onSelect(session.id)}
                variant="bare"
              >
                <Icon className="shrink-0 text-ink-muted" name="session" size="sm" />
                <SessionTitleText className="min-w-0 flex-1 truncate text-sm text-ink" title={session.title} />
                <span className="shrink-0 text-xs text-ink-muted">{session.updatedAt}</span>
              </Button>
            ))}
          </div>
        ))}
      </div>
    </Dialog>
  );
}
