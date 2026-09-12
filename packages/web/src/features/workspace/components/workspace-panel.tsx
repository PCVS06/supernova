import type {CSSProperties, PointerEvent} from "react";
import {useRef, useState} from "react";
import Button from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import IconButton from "@/components/ui/icon-button";
import type {AppEnvironment} from "@/lib/app-environment";
import {cn} from "@/lib/cn";
import WorkspaceBrowserView from "@/features/workspace/components/workspace-browser-view";
import WorkspaceContextView from "@/features/workspace/components/workspace-context-view";
import WorkspaceFilesView from "@/features/workspace/components/workspace-files-view";
import WorkspaceTerminalView from "@/features/workspace/components/workspace-terminal-view";
import WorkspaceViewPicker from "@/features/workspace/components/workspace-view-picker";
import {WORKSPACE_VIEW_DEFINITIONS} from "@/features/workspace/lib/workspace-view-definitions";
import {useWorkspacePanelStore} from "@/features/workspace/stores/workspace-panel-store";

interface WorkspacePanelProps {
  readonly appEnvironment: AppEnvironment;
}

/** Animated right-hand workspace for project files, browsing, terminal access, and chat context. */
export default function WorkspacePanel(props: WorkspacePanelProps) {
  const {appEnvironment} = props;
  const target = useWorkspacePanelStore((state) => state.target);
  const view = useWorkspacePanelStore((state) => state.view);
  const pickerVisible = useWorkspacePanelStore((state) => state.pickerVisible);
  const visible = useWorkspacePanelStore((state) => state.visible);
  const width = useWorkspacePanelStore((state) => state.width);
  const closePanel = useWorkspacePanelStore((state) => state.closePanel);
  const setWidth = useWorkspacePanelStore((state) => state.setWidth);
  const showViewPicker = useWorkspacePanelStore((state) => state.showViewPicker);
  const panelRef = useRef<HTMLElement>(null);
  const [resizing, setResizing] = useState(false);
  const viewDefinition = WORKSPACE_VIEW_DEFINITIONS.find((item) => item.value === view) ?? WORKSPACE_VIEW_DEFINITIONS[0];

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

  const panelWidth = `min(${width}px, 100vw)`;

  return (
    <aside
      aria-hidden={!visible}
      aria-label="Workspace panel"
      className={cn(
        "absolute inset-y-0 right-0 z-30 shrink-0 overflow-hidden md:relative md:inset-auto md:z-auto",
        !resizing && "transition-[width] duration-250 ease-in-out motion-reduce:transition-none"
      )}
      inert={!visible}
      ref={panelRef}
      style={{width: visible ? panelWidth : "0px", "--workspace-panel-width": `${width}px`} as CSSProperties}
    >
      <div
        className={cn(
          "absolute inset-y-0 right-0 flex min-h-0 flex-col border-l border-border-strong bg-surface-sidebar transition-opacity duration-200 ease-out motion-reduce:transition-none",
          visible ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        style={{width: panelWidth}}
      >
        {visible && <div className="absolute inset-y-0 left-0 z-30 w-1 cursor-col-resize" onPointerDown={handleResizePointerDown} />}
        <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border-muted px-3">
          {pickerVisible ? (
            <span className="text-sm font-medium text-ink">Workspace</span>
          ) : (
            <Button
              aria-label="Switch workspace view"
              className="flex h-8 items-center gap-2 rounded-lg px-2 text-sm font-medium text-ink hover:bg-overlay-hover"
              onClick={showViewPicker}
              variant="ghost"
            >
              <Icon className="text-ink-muted" name={viewDefinition.icon} size="sm" />
              <span>{viewDefinition.label}</span>
              <Icon className="text-ink-faint" name="chevron-down" size="xs" />
            </Button>
          )}
          <IconButton className="ml-auto size-7" label="Close workspace panel" onClick={closePanel} title="Close workspace panel">
            <Icon name="x" size="sm" />
          </IconButton>
        </header>

        {pickerVisible && <WorkspaceViewPicker />}
        {!pickerVisible && view === "browser" && <WorkspaceBrowserView appEnvironment={appEnvironment} />}
        {!pickerVisible && view === "terminal" && <WorkspaceTerminalView />}
        {!pickerVisible &&
          view === "context" &&
          (target ? (
            <WorkspaceContextView active={visible && !pickerVisible} projectPath={target.projectPath} sessionId={target.sessionId} />
          ) : (
            <p className="px-3 py-3 text-xs text-ink-faint">Open a chat to inspect its context.</p>
          ))}
        {!pickerVisible &&
          view === "files" &&
          (target ? (
            <WorkspaceFilesView projectPath={target.projectPath} sessionId={target.sessionId} />
          ) : (
            <p className="px-3 py-3 text-xs text-ink-faint">Open a chat to browse its project files.</p>
          ))}
      </div>
    </aside>
  );
}
