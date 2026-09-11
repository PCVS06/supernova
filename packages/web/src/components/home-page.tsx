import {useRouter, useRouterState, useCanGoBack} from "@tanstack/react-router";
import type {ReactNode} from "react";
import type {AppEnvironment} from "@/lib/app-environment";
import {isDesktopEnvironment} from "@/lib/app-environment";
import Icon from "@/components/ui/icon";
import IconButton from "@/components/ui/icon-button";
import SidebarLayout from "@/features/sidebar/components/sidebar-layout";
import Sidebar from "@/features/sidebar/components/sidebar";
import SessionPane from "@/features/sessions/components/session-pane";
import {useSplitViewStore} from "@/features/sessions/stores/split-view-store";
import UpdateButton from "@/features/updates/components/update-button";
import WorkspacePanel from "@/features/workspace/components/workspace-panel";
import {useWorkspaceShortcuts} from "@/features/workspace/hooks/use-workspace-shortcuts";
import {useWorkspacePanelStore} from "@/features/workspace/stores/workspace-panel-store";
import {useSidebarVisibility} from "@/features/sidebar/hooks/use-sidebar-visibility";
import {useSidebarSectionsStore} from "@/features/sidebar/stores/sidebar-store";
import {cn} from "@/lib/cn";

interface HomePageProps {
  appEnvironment: AppEnvironment;
  children: ReactNode;
}

export default function HomePage(props: HomePageProps) {
  const {appEnvironment, children} = props;
  const {sidebarVisible, toggleSidebar} = useSidebarVisibility();
  const sidebarWidth = useSidebarSectionsStore((state) => state.sidebarWidth);
  const setSidebarWidth = useSidebarSectionsStore((state) => state.setSidebarWidth);
  const panes = useSplitViewStore((state) => state.panes);
  const workspaceView = useWorkspacePanelStore((state) => state.view);
  const workspaceVisible = useWorkspacePanelStore((state) => state.visible);
  const toggleWorkspaceView = useWorkspacePanelStore((state) => state.toggleView);
  const router = useRouter();

  useWorkspaceShortcuts();

  useRouterState({
    select: (state) => state.location.href,
  });

  const canGoBack = useCanGoBack();

  // TanStack Router does not expose canGoForward. This is good enough for desktop chrome,
  // where navigation stays inside the Electron shell and we do not want extra state.
  const currentIndex = router.history.location.state.__TSR_index ?? 0;
  const canGoForward = currentIndex < router.history.length - 1;
  const navigationVisible = isDesktopEnvironment(appEnvironment);
  const filesActive = workspaceVisible && workspaceView === "files";
  const browserActive = workspaceVisible && workspaceView === "browser";

  const handleGoBack = (): void => {
    router.history.back();
  };

  const handleGoForward = (): void => {
    router.history.forward();
  };

  const titlebarActions = (
    <>
      <IconButton className="size-7" label="Toggle sidebar" onClick={toggleSidebar}>
        <Icon name="panel-left" size="sm" />
      </IconButton>
      {navigationVisible && (
        <>
          <IconButton className="size-7" disabled={!canGoBack} label="Go back" onClick={handleGoBack}>
            <Icon name="arrow-left" size="sm" />
          </IconButton>
          <IconButton className="size-7" disabled={!canGoForward} label="Go forward" onClick={handleGoForward}>
            <Icon name="arrow-right" size="sm" />
          </IconButton>
        </>
      )}
      <IconButton
        aria-pressed={filesActive}
        className={cn("size-7", filesActive && "text-ink-strong")}
        label="Toggle project files"
        onClick={() => toggleWorkspaceView("files")}
        title="Project files (Cmd/Ctrl+Shift+F)"
      >
        <Icon name="panel-right" size="sm" />
      </IconButton>
      <IconButton
        aria-pressed={browserActive}
        className={cn("size-7", browserActive && "text-ink-strong")}
        label="Toggle browser"
        onClick={() => toggleWorkspaceView("browser")}
        title="Browser (Cmd/Ctrl+Shift+B)"
      >
        <Icon name="globe" size="sm" />
      </IconButton>
      {sidebarVisible && <UpdateButton className="ml-auto" />}
    </>
  );

  return (
    <SidebarLayout
      appEnvironment={appEnvironment}
      onSidebarWidthChange={setSidebarWidth}
      sidebar={<Sidebar />}
      sidebarVisible={sidebarVisible}
      sidebarWidth={sidebarWidth}
      titlebarActions={titlebarActions}
    >
      <div className="flex h-full min-h-0 min-w-0 flex-1">
        <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col">{children}</div>
        {panes.map((pane) => (
          <SessionPane appEnvironment={appEnvironment} key={pane.sessionId} pane={pane} />
        ))}
        <WorkspacePanel appEnvironment={appEnvironment} />
      </div>
    </SidebarLayout>
  );
}
