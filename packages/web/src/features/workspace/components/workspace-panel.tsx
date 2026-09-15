import {Link} from "@tanstack/react-router";
import {useSession} from "@/features/sessions/hooks/api/use-session";
import type {WorkspaceTarget} from "@/features/workspace/stores/workspace-panel-store";
import type {CSSProperties, PointerEvent} from "react";
import {useRef, useState} from "react";
import {useAppearanceStore} from "@/features/settings/stores/appearance-store";
import type {AppEnvironment} from "@/lib/app-environment";
import {cn} from "@/lib/cn";
import WorkspaceBrowserView from "@/features/workspace/components/workspace-browser-view";
import WorkspaceContextView from "@/features/workspace/components/workspace-context-view";
import WorkspaceFilesView from "@/features/workspace/components/workspace-files-view";
import WorkspacePanelHeader from "@/features/workspace/components/workspace-panel-header";
import WorkspaceTerminalView from "@/features/workspace/components/workspace-terminal-view";
import WorkspaceViewPicker from "@/features/workspace/components/workspace-view-picker";
import {useWorkspacePanelStore} from "@/features/workspace/stores/workspace-panel-store";

interface WorkspaceOwnerProps {
  readonly target: WorkspaceTarget;
}

function WorkspaceOwner({target}: WorkspaceOwnerProps) {
  const {data: session} = useSession(target.sessionId);
  return (
    <div aria-label="Workspace owner" className="shrink-0 border-b border-border-muted px-3 py-2 text-xs">
      <Link className="block truncate text-ink-muted hover:text-ink" to="/session/$sessionId" params={{sessionId: target.sessionId}}>
        Chat · {session?.title ?? "Loading…"}
      </Link>
      <p className="truncate text-ink-faint" title={target.projectPath}>
        {target.projectPath}
      </p>
    </div>
  );
}

interface WorkspacePanelProps {
  readonly appEnvironment: AppEnvironment;
}

/** Animated right-hand workspace for project files, browsing, terminal access, and chat context. */
export default function WorkspacePanel(props: WorkspacePanelProps) {
  const {appEnvironment} = props;
  const target = useWorkspacePanelStore((state) => state.target);
  const activeView = useWorkspacePanelStore((state) => state.activeView);
  const pickerVisible = useWorkspacePanelStore((state) => state.pickerVisible);
  const visible = useWorkspacePanelStore((state) => state.visible);
  const width = useWorkspacePanelStore((state) => state.width);
  const setWidth = useWorkspacePanelStore((state) => state.setWidth);
  const translucentSidebar = useAppearanceStore((state) => state.translucentSidebar);
  const panelRef = useRef<HTMLElement>(null);
  const [resizing, setResizing] = useState(false);
  const glassChrome = translucentSidebar;

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
        "absolute inset-y-0 right-0 z-30 shrink-0 overflow-hidden will-change-[width] md:relative md:inset-auto md:z-auto",
        !resizing && "transition-[width] duration-250 ease-in-out motion-reduce:transition-none"
      )}
      inert={!visible}
      ref={panelRef}
      style={{width: visible ? panelWidth : "0px", "--workspace-panel-width": `${width}px`} as CSSProperties}
    >
      <div
        className={cn(
          "workspace-panel-seam absolute inset-y-0 right-0 flex min-h-0 flex-col transition-opacity duration-200 ease-out motion-reduce:transition-none",
          glassChrome ? "app-glass-chrome bg-surface-sidebar-translucent" : "bg-surface-sidebar",
          visible ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        style={{width: panelWidth}}
      >
        {visible && <div className="workspace-sidebar-resizer absolute bottom-3 left-0 top-3 z-30 w-1 cursor-col-resize" onPointerDown={handleResizePointerDown} />}
        <WorkspacePanelHeader />
        {visible && target && <WorkspaceOwner target={target} />}

        {pickerVisible && <WorkspaceViewPicker />}
        {visible && !pickerVisible && activeView === "browser" && <WorkspaceBrowserView appEnvironment={appEnvironment} />}
        {!pickerVisible && activeView === "terminal" && <WorkspaceTerminalView />}
        {!pickerVisible &&
          activeView === "context" &&
          (target ? (
            <WorkspaceContextView active={visible && !pickerVisible} projectPath={target.projectPath} sessionId={target.sessionId} />
          ) : (
            <p className="px-3 py-3 text-xs text-ink-faint">Open a chat to inspect its context.</p>
          ))}
        {!pickerVisible &&
          activeView === "files" &&
          (target ? (
            <WorkspaceFilesView projectPath={target.projectPath} sessionId={target.sessionId} />
          ) : (
            <p className="px-3 py-3 text-xs text-ink-faint">Open a chat to browse its project files.</p>
          ))}
      </div>
    </aside>
  );
}
