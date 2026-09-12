import type {FolderEntry} from "@supernova/contracts/folders/procedures";
import Button from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import {useFolderEntries} from "@/features/workspace/hooks/api/use-folder-entries";
import {cn} from "@/lib/cn";

const TREE_INDENT_REM = 0.75;

/** Directories first, then files, each alphabetically, so a tree reads predictably. */
function sortEntries(entries: readonly FolderEntry[]): readonly FolderEntry[] {
  return entries.toSorted((left, right) => {
    if (left.kind !== right.kind) return left.kind === "directory" ? -1 : 1;
    return left.name.localeCompare(right.name);
  });
}

interface WorkspaceFileTreeRowProps {
  readonly depth: number;
  readonly entry: FolderEntry;
  readonly expanded: boolean;
  readonly onActivate: () => void;
  readonly selected: boolean;
}

function WorkspaceFileTreeRow(props: WorkspaceFileTreeRowProps) {
  const {depth, entry, expanded, onActivate, selected} = props;
  const directory = entry.kind === "directory";

  return (
    <Button
      aria-expanded={directory ? expanded : undefined}
      className={cn(
        "flex w-full min-w-0 items-center gap-1.5 rounded-lg corner-superellipse/1.3 py-0.5 pr-2 text-left text-xs leading-5 hover:bg-overlay-hover",
        selected && "bg-overlay-pressed text-ink-strong",
        entry.ignored && "text-ink-faint"
      )}
      onClick={onActivate}
      style={{paddingInlineStart: `${0.25 + depth * TREE_INDENT_REM}rem`}}
      title={entry.path}
      variant="bare"
    >
      {directory ? (
        <Icon className={cn("shrink-0 text-ink-faint transition-transform duration-160 ease-out", expanded && "rotate-90")} name="chevron-right" size="xs" />
      ) : (
        <span aria-hidden="true" className="size-3.5 shrink-0" />
      )}
      <Icon className="shrink-0 text-ink-faint" name={directory ? (expanded ? "folder-open" : "folder") : "file"} size="xs" />
      <span className="min-w-0 flex-1 truncate">{entry.name}</span>
    </Button>
  );
}

interface WorkspaceFileTreeProps {
  readonly depth?: number;
  /** Directories the user has revealed; children load only for these. */
  readonly expandedPaths: readonly string[];
  readonly onOpenFile: (path: string) => void;
  readonly onToggleDirectory: (path: string) => void;
  readonly openFilePath: string | null;
  /** Project-relative directory to list; the empty string is the project root. */
  readonly path: string;
  readonly projectPath: string;
}

/** Lists one project directory and, for revealed directories, the level below it. */
export default function WorkspaceFileTree(props: WorkspaceFileTreeProps) {
  const {depth = 0, expandedPaths, onOpenFile, onToggleDirectory, openFilePath, path, projectPath} = props;
  const entriesQuery = useFolderEntries({path, projectPath});
  const indentStyle = {paddingInlineStart: `${0.5 + depth * TREE_INDENT_REM}rem`};

  if (entriesQuery.error) {
    return (
      <p className="px-2 py-1.5 text-xs text-danger-ink" role="alert">
        This folder could not be read.
      </p>
    );
  }

  if (!entriesQuery.data) {
    return (
      <p className="px-2 py-1.5 text-xs text-ink-faint" style={indentStyle}>
        Loading files…
      </p>
    );
  }

  const entries = sortEntries(entriesQuery.data.entries);
  if (entries.length === 0) {
    return (
      <p className="px-2 py-1.5 text-xs text-ink-faint" style={indentStyle}>
        Empty folder
      </p>
    );
  }

  return (
    <ul aria-label={depth === 0 ? "Project files" : undefined} className="min-w-0">
      {entries.map((entry) => {
        const expanded = expandedPaths.includes(entry.path);

        const handleActivate = (): void => {
          if (entry.kind === "directory") onToggleDirectory(entry.path);
          else onOpenFile(entry.path);
        };

        return (
          <li className="min-w-0" key={entry.path}>
            <WorkspaceFileTreeRow depth={depth} entry={entry} expanded={expanded} onActivate={handleActivate} selected={openFilePath === entry.path} />
            {entry.kind === "directory" && expanded && (
              <WorkspaceFileTree
                depth={depth + 1}
                expandedPaths={expandedPaths}
                onOpenFile={onOpenFile}
                onToggleDirectory={onToggleDirectory}
                openFilePath={openFilePath}
                path={entry.path}
                projectPath={projectPath}
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}
