import type {CSSProperties, PointerEvent} from "react";
import {useRef, useState} from "react";
import Button from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import IconButton from "@/components/ui/icon-button";
import type {AppEnvironment} from "@/lib/app-environment";
import {cn} from "@/lib/cn";
import WorkspaceBrowserView from "@/features/workspace/components/workspace-browser-view";
import WorkspaceFilesView from "@/features/workspace/components/workspace-files-view";
import type {WorkspaceView} from "@/features/workspace/stores/workspace-panel-store";
import {useWorkspacePanelStore} from "@/features/workspace/stores/workspace-panel-store";

interface WorkspaceViewTabProps {
  readonly active: boolean;
  readonly label: string;
  readonly onSelect: () => void;
  readonly shortcut: string;
}

function WorkspaceViewTab(props: WorkspaceViewTabProps) {
  const {active, label, onSelect, shortcut} = props;

  return (
    <Button
      aria-pressed={active}
      className={cn("rounded-lg corner-superellipse/1.3 px-2 py-1 text-xs text-ink-muted hover:bg-overlay-hover", active && "bg-overlay-pressed text-ink-strong")}
      onClick={onSelect}
      title={`${label} (${shortcut})`}
      variant="bare"
    >
      {label}
    </Button>
  );
}

interface WorkspacePanelProps {
  readonly appEnvironment: AppEnvironment;
}

/** Right-hand panel that keeps the project's files and a reference browser beside the chat. */
export default function WorkspacePanel(props: WorkspacePanelProps) {
  const {appEnvironment} = props;
  const target = useWorkspacePanelStore((state) => state.target);
  const view = useWorkspacePanelStore((state) => state.view);
  const visible = useWorkspacePanelStore((state) => state.visible);
  const width = useWorkspacePanelStore((state) => state.width);
  const closePanel = useWorkspacePanelStore((state) => state.closePanel);
  const setWidth = useWorkspacePanelStore((state) => state.setWidth);
  const toggleView = useWorkspacePanelStore((state) => state.toggleView);
  const panelRef = useRef<HTMLElement>(null);
  const [resizing, setResizing] = useState(false);

  if (!visible) return null;

  const handleResizePointerDown = (event: PointerEvent<HTMLDivElement>): void => {
    const rightEdge = panelRef.current?.getBoundingClientRect().right;
    if (rightEdge === undefined) return;

    event.preventDefault();
    setResizing(true);
    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const handlePointerMove = (moveEvent: globalThis.PointerEvent): void => {
      setWidth(rightEdge - moveEvent.clientX);
    };

    const handlePointerUp = (): void => {
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;
      setResizing(false);
      window.removeEventListener("pointermove", handlePointerMove);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp, {once: true});
  };

  const handleSelectView = (nextView: WorkspaceView): void => {
    if (nextView !== view) toggleView(nextView);
  };

  return (
    <aside
      aria-label="Workspace panel"
      className={cn(
        "absolute inset-y-0 right-0 z-30 flex min-h-0 max-w-full shrink-0 flex-col border-l border-border-strong bg-surface-sidebar md:relative md:z-auto",
        !resizing && "transition-[width] duration-150 ease-out motion-reduce:transition-none"
      )}
      ref={panelRef}
      style={{width: "var(--workspace-panel-width)", "--workspace-panel-width": `${width}px`} as CSSProperties}
    >
      <div className="absolute inset-y-0 left-0 z-30 w-1 cursor-col-resize" onPointerDown={handleResizePointerDown} />
      <header className="flex h-12 shrink-0 items-center gap-1 border-b border-border-muted px-2">
        <WorkspaceViewTab active={view === "files"} label="Files" onSelect={() => handleSelectView("files")} shortcut="Cmd/Ctrl+Shift+F" />
        <WorkspaceViewTab active={view === "browser"} label="Browser" onSelect={() => handleSelectView("browser")} shortcut="Cmd/Ctrl+Shift+B" />
        <IconButton className="ml-auto size-7" label="Close workspace panel" onClick={closePanel} title="Close workspace panel">
          <Icon name="x" size="sm" />
        </IconButton>
      </header>

      {view === "browser" ? (
        <WorkspaceBrowserView appEnvironment={appEnvironment} />
      ) : target ? (
        <WorkspaceFilesView projectPath={target.projectPath} sessionId={target.sessionId} />
      ) : (
        <p className="px-3 py-3 text-xs text-ink-faint">Open a chat to browse its project files.</p>
      )}
    </aside>
  );
}
