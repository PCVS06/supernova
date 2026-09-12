import Button from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import SearchField from "@/components/ui/search-field";
import {useFolderFiles} from "@/features/workspace/hooks/api/use-folder-files";
import WorkspaceFileTree from "@/features/workspace/components/workspace-file-tree";
import WorkspaceFileViewer from "@/features/workspace/components/workspace-file-viewer";
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
}

interface WorkspaceFileNavigatorProps {
  readonly projectPath: string;
}

function WorkspaceFileNavigator(props: WorkspaceFileNavigatorProps) {
  const {projectPath} = props;
  const expandedPaths = useWorkspacePanelStore((state) => state.expandedPaths);
  const filter = useWorkspacePanelStore((state) => state.filter);
  const openFile = useWorkspacePanelStore((state) => state.openFile);
  const setFilter = useWorkspacePanelStore((state) => state.setFilter);
  const toggleDirectory = useWorkspacePanelStore((state) => state.toggleDirectory);

  return (
    <aside aria-label="Project file navigation" className="flex min-h-0 min-w-0 flex-1 flex-col bg-surface-sidebar">
      <p className="shrink-0 truncate px-3 pb-1 pt-3 text-xs text-ink-faint" title={projectPath}>
        {pathFileName(projectPath)} /
      </p>
      <SearchField aria-label="Filter project files" onChange={(event) => setFilter(event.target.value)} placeholder="Filter files" value={filter} />
      <div className="min-h-0 min-w-0 flex-1 overflow-auto px-2 py-2">
        {filter.trim().length > 0 ? (
          <WorkspaceFilterResults filter={filter} projectPath={projectPath} />
        ) : (
          <WorkspaceFileTree expandedPaths={expandedPaths} onOpenFile={openFile} onToggleDirectory={toggleDirectory} openFilePath={null} path="" projectPath={projectPath} />
        )}
      </div>
    </aside>
  );
}

/** Browses project files beside the open document, matching the app's wider document workspace. */
export default function WorkspaceFilesView(props: WorkspaceFilesViewProps) {
  const {projectPath} = props;
  const activeFilePath = useWorkspacePanelStore((state) => state.activeFilePath);

  return (
    <div className="flex min-h-0 min-w-0 flex-1">
      {activeFilePath ? (
        <WorkspaceFileViewer key={`${projectPath}:${activeFilePath}`} path={activeFilePath} projectPath={projectPath} />
      ) : (
        <WorkspaceFileNavigator projectPath={projectPath} />
      )}
    </div>
  );
}
