import {useState} from "react";
import type {KeyboardEvent, PointerEvent as ReactPointerEvent} from "react";
import Button from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import SearchField from "@/components/ui/search-field";
import {useFolderFiles} from "@/features/workspace/hooks/api/use-folder-files";
import WorkspaceFileTree from "@/features/workspace/components/workspace-file-tree";
import WorkspaceFileViewer from "@/features/workspace/components/workspace-file-viewer";
import {insertComposerFileReference} from "@/features/workspace/lib/composer-file-reference";
import {useWorkspacePanelStore} from "@/features/workspace/stores/workspace-panel-store";
import {pathFileName} from "@/features/workspace/lib/workspace-paths";

interface WorkspaceFilterResultsProps {
  readonly filter: string;
  readonly projectPath: string;
}

function WorkspaceFilterResults(props: WorkspaceFilterResultsProps) {
  const {filter, projectPath} = props;
  const openFile = useWorkspacePanelStore((state) => state.openFile);
  const filesQuery = useFolderFiles({projectPath, query: filter});
  const items = filesQuery.data?.items ?? [];

  if (filesQuery.error) {
    return (
      <p className="px-3 py-2 text-sm text-danger-ink" role="alert">
        This project could not be searched.
      </p>
    );
  }

  if (items.length === 0) {
    return <p className="px-3 py-2 text-xs text-ink-faint">{filesQuery.isPending ? "Searching files…" : "No matching files."}</p>;
  }

  return (
    <ul aria-label="Matching files" className="min-w-0">
      {items.map((item) => (
        <li className="min-w-0" key={item.path}>
          <Button
            className="flex w-full min-w-0 items-center gap-1.5 rounded-lg corner-superellipse/1.3 px-2 py-1 text-left text-sm leading-5 hover:bg-overlay-hover"
            onClick={() => openFile(item.path)}
            title={item.path}
            variant="bare"
          >
            <Icon className="shrink-0 text-ink-faint" name="file" size="xs" />
            <span className="min-w-0 flex-1 truncate">{item.title}</span>
            {item.subtitle && <span className="min-w-0 max-w-1/2 shrink-0 truncate text-xs text-ink-faint">{item.subtitle}</span>}
          </Button>
        </li>
      ))}
    </ul>
  );
}

interface WorkspaceFilesViewProps {
  readonly projectPath: string;
  readonly sessionId: string;
}

interface WorkspaceFileNavigatorProps {
  readonly compact?: boolean;
  readonly projectPath: string;
  readonly width?: number;
}

function WorkspaceFileNavigator(props: WorkspaceFileNavigatorProps) {
  const {compact = false, projectPath, width} = props;
  const activeFilePath = useWorkspacePanelStore((state) => state.activeFilePath);
  const expandedPaths = useWorkspacePanelStore((state) => state.expandedPaths);
  const filter = useWorkspacePanelStore((state) => state.filter);
  const openFile = useWorkspacePanelStore((state) => state.openFile);
  const setFilter = useWorkspacePanelStore((state) => state.setFilter);
  const toggleDirectory = useWorkspacePanelStore((state) => state.toggleDirectory);

  return (
    <aside
      aria-label="Project file navigation"
      className={compact ? "flex min-h-0 shrink-0 flex-col bg-surface-sidebar" : "flex min-h-0 min-w-0 flex-1 flex-col bg-surface-sidebar"}
      style={compact ? {width} : undefined}
    >
      <p className="shrink-0 truncate px-3 pb-1 pt-3 text-xs text-ink-faint" title={projectPath}>
        {pathFileName(projectPath)} /
      </p>
      <SearchField aria-label="Filter project files" onChange={(event) => setFilter(event.target.value)} placeholder="Filter files" value={filter} />
      <div className="workspace-scrollbar min-h-0 min-w-0 flex-1 overflow-auto px-2 py-2">
        {filter.trim().length > 0 ? (
          <WorkspaceFilterResults filter={filter} projectPath={projectPath} />
        ) : (
          <WorkspaceFileTree
            expandedPaths={expandedPaths}
            onOpenFile={openFile}
            onToggleDirectory={toggleDirectory}
            openFilePath={activeFilePath}
            path=""
            projectPath={projectPath}
          />
        )}
      </div>
    </aside>
  );
}

const DEFAULT_FILE_NAVIGATION_WIDTH = 224;
const FILE_NAVIGATION_WIDTH_STEP = 16;
const MAX_FILE_NAVIGATION_WIDTH = 360;
const MIN_FILE_NAVIGATION_WIDTH = 176;

/** Keeps the file tree usable without letting it crowd out the document. */
function constrainFileNavigationWidth(width: number): number {
  return Math.min(MAX_FILE_NAVIGATION_WIDTH, Math.max(MIN_FILE_NAVIGATION_WIDTH, width));
}

/** Browses project files beside the open document, matching the app's wider document workspace. */
export default function WorkspaceFilesView(props: WorkspaceFilesViewProps) {
  const {projectPath, sessionId} = props;
  const activeFilePath = useWorkspacePanelStore((state) => state.activeFilePath);
  const [fileNavigationWidth, setFileNavigationWidth] = useState(DEFAULT_FILE_NAVIGATION_WIDTH);

  const handleInsertReference = (): void => {
    if (!activeFilePath) return;
    insertComposerFileReference({path: activeFilePath, sessionId});
  };

  const handleResizeKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    setFileNavigationWidth((width) => constrainFileNavigationWidth(width + (event.key === "ArrowLeft" ? FILE_NAVIGATION_WIDTH_STEP : -FILE_NAVIGATION_WIDTH_STEP)));
  };

  const handleResizeStart = (event: ReactPointerEvent<HTMLDivElement>): void => {
    const separator = event.currentTarget;
    const pointerId = event.pointerId;
    const startWidth = fileNavigationWidth;
    const startX = event.clientX;
    separator.setPointerCapture(pointerId);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const handlePointerMove = (moveEvent: globalThis.PointerEvent): void => {
      setFileNavigationWidth(constrainFileNavigationWidth(startWidth + startX - moveEvent.clientX));
    };
    const handlePointerEnd = (): void => {
      separator.removeEventListener("pointermove", handlePointerMove);
      separator.removeEventListener("pointerup", handlePointerEnd);
      separator.removeEventListener("pointercancel", handlePointerEnd);
      if (separator.hasPointerCapture(pointerId)) separator.releasePointerCapture(pointerId);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    separator.addEventListener("pointermove", handlePointerMove);
    separator.addEventListener("pointerup", handlePointerEnd);
    separator.addEventListener("pointercancel", handlePointerEnd);
  };

  return (
    <div className="flex min-h-0 min-w-0 flex-1">
      {activeFilePath ? (
        <>
          <WorkspaceFileViewer key={`${projectPath}:${activeFilePath}`} onAddToChat={handleInsertReference} path={activeFilePath} projectPath={projectPath} />
          <div
            aria-label="Resize file list"
            aria-orientation="vertical"
            className="group relative w-1 shrink-0 cursor-col-resize outline-none focus-visible:bg-overlay-hover"
            onKeyDown={handleResizeKeyDown}
            onPointerDown={handleResizeStart}
            role="separator"
            tabIndex={0}
          >
            <span aria-hidden="true" className="absolute inset-y-0 left-1/2 w-px bg-border-muted group-hover:bg-border-strong group-focus-visible:bg-border-strong" />
          </div>
          <WorkspaceFileNavigator compact projectPath={projectPath} width={fileNavigationWidth} />
        </>
      ) : (
        <WorkspaceFileNavigator projectPath={projectPath} />
      )}
    </div>
  );
}
