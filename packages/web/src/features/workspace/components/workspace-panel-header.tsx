import Button from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import IconButton from "@/components/ui/icon-button";
import {insertComposerFileReference} from "@/features/workspace/lib/composer-file-reference";
import {pathFileName} from "@/features/workspace/lib/workspace-paths";
import {WORKSPACE_VIEW_DEFINITIONS} from "@/features/workspace/lib/workspace-view-definitions";
import {useWorkspacePanelStore} from "@/features/workspace/stores/workspace-panel-store";
import {cn} from "@/lib/cn";

interface WorkspacePanelHeaderProps {
  readonly sessionId: string | null;
}

/** Keeps workspace selection, open file tabs, and compact file actions in one stable header. */
export default function WorkspacePanelHeader(props: WorkspacePanelHeaderProps) {
  const {sessionId} = props;
  const activeFilePath = useWorkspacePanelStore((state) => state.activeFilePath);
  const closeFile = useWorkspacePanelStore((state) => state.closeFile);
  const closePanel = useWorkspacePanelStore((state) => state.closePanel);
  const openFilePaths = useWorkspacePanelStore((state) => state.openFilePaths);
  const pickerVisible = useWorkspacePanelStore((state) => state.pickerVisible);
  const selectFile = useWorkspacePanelStore((state) => state.selectFile);
  const showViewPicker = useWorkspacePanelStore((state) => state.showViewPicker);
  const view = useWorkspacePanelStore((state) => state.view);
  const viewDefinition = WORKSPACE_VIEW_DEFINITIONS.find((item) => item.value === view) ?? WORKSPACE_VIEW_DEFINITIONS[0];

  const handleInsertReference = (): void => {
    if (!activeFilePath || !sessionId) return;
    insertComposerFileReference({path: activeFilePath, sessionId});
  };

  return (
    <header className="flex h-12 shrink-0 items-center gap-1 border-b border-border-muted px-2">
      {pickerVisible ? (
        <span className="min-w-0 flex-1 truncate px-1 text-sm font-medium text-ink">Workspace</span>
      ) : (
        <nav aria-label="Workspace tabs" className="scroll-fade-x flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
          <Button
            aria-label="Switch workspace view"
            className={cn(
              "flex h-8 shrink-0 items-center gap-2 rounded-lg px-2 text-sm font-medium text-ink hover:bg-overlay-hover",
              view === "files" && activeFilePath === null && "bg-overlay-hover"
            )}
            onClick={showViewPicker}
            variant="ghost"
          >
            <Icon className="text-ink-muted" name={viewDefinition.icon} size="sm" />
            <span>{viewDefinition.label}</span>
            <Icon className="text-ink-faint" name="chevron-down" size="xs" />
          </Button>
          {openFilePaths.map((path) => {
            const active = view === "files" && activeFilePath === path;
            const name = pathFileName(path);
            return (
              <span className={cn("flex h-8 shrink-0 items-center rounded-lg", active && "bg-overlay-hover")} key={path}>
                <Button
                  aria-current={active ? "page" : undefined}
                  aria-label={`Open file tab ${path}`}
                  className="flex h-8 min-w-0 max-w-40 items-center gap-1.5 rounded-l-lg px-2 text-xs text-ink-muted hover:text-ink"
                  onClick={() => selectFile(path)}
                  title={path}
                  variant="ghost"
                >
                  <Icon className="shrink-0 text-ink-faint" name="file" size="xs" />
                  <span className="truncate">{name}</span>
                </Button>
                <IconButton className="mr-1 size-6 shrink-0 rounded-md" label={`Close file tab ${path}`} onClick={() => closeFile(path)} title={`Close ${name}`}>
                  <Icon name="x" size="xs" />
                </IconButton>
              </span>
            );
          })}
        </nav>
      )}
      {!pickerVisible && view === "files" && activeFilePath && (
        <IconButton
          className="size-7 shrink-0 rounded-full"
          disabled={!sessionId}
          label="Add to chat"
          onClick={handleInsertReference}
          title={sessionId ? `Add ${pathFileName(activeFilePath)} to chat` : "Open a chat to reference this file"}
          variant="ghost"
        >
          <Icon name="corner-left-up" size="sm" />
        </IconButton>
      )}
      <IconButton className="size-7 shrink-0" label="Close workspace panel" onClick={closePanel} title="Close workspace panel">
        <Icon name="x" size="sm" />
      </IconButton>
    </header>
  );
}
