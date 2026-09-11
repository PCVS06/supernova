import {useState} from "react";
import {Link, useLocation} from "@tanstack/react-router";
import PiBrand from "@/components/brand/pi-brand";
import Button from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import {showToast} from "@/components/ui/toast-manager";
import OpenProjectDialog from "@/features/projects/components/open-project-dialog";
import SearchSessionsDialog from "@/features/projects/components/search-sessions-dialog";
import {useProjectList} from "@/features/projects/hooks/use-project-list";
import {useProjectsStore} from "@/features/projects/stores/projects-store";
import {useSidebarSections} from "@/features/sidebar/hooks/use-sidebar-sections";
import HarnessSidebarSection from "@/features/harnesses/components/harness-sidebar-section";
import {useHarnessLibrary, useSaveHarnessProject} from "@/features/harnesses/hooks/api/use-harnesses";
import {useHarnessNavigationStore} from "@/features/harnesses/stores/harness-navigation-store";

export default function Sidebar() {
  const {collapseAllProjects, expandProject, expandedProjects, toggleProject} = useSidebarSections();
  const location = useLocation();
  const projects = useProjectList();
  const library = useHarnessLibrary();
  const selectHarness = useHarnessNavigationStore((state) => state.selectHarness);
  const saveProject = useSaveHarnessProject();
  const addProject = useProjectsStore((state) => state.addProject);
  const [addingToHarness, setAddingToHarness] = useState<string>();
  const [searchOpen, setSearchOpen] = useState(false);
  const activeSessionId = location.pathname.startsWith("/session/") && location.pathname !== "/session/new" ? location.pathname.slice("/session/".length) : "";

  const handleOpenProject = (projectPath: string): void => {
    if (!library.data || !addingToHarness) return;
    const existing = library.data.projects.find((project) => project.path === projectPath);
    if (existing) {
      selectHarness(existing.harnessId);
      const project = addProject(existing.path);
      if (project) expandProject(project.id);
      setAddingToHarness(undefined);
      if (existing.harnessId !== addingToHarness) showToast("Project already linked", "This folder belongs to another harness; its setup was kept.");
      return;
    }
    saveProject.mutate(
      {
        expectedRevision: library.data.revision,
        project: {
          id: crypto.randomUUID(),
          harnessId: addingToHarness,
          name: projectPath.split("/").filter(Boolean).at(-1) ?? "Project",
          path: projectPath,
          systemPrompt: "",
          contextInstructions: "",
          agents: [],
        },
      },
      {
        onSuccess: () => {
          selectHarness(addingToHarness);
          const project = addProject(projectPath);
          if (project) expandProject(project.id);
          setAddingToHarness(undefined);
        },
        onError: (error) => showToast("Could not link project", String(error)),
      }
    );
  };

  return (
    <aside className="flex h-full w-full shrink-0 flex-col">
      <PiBrand />
      <div className="px-3 pb-3">
        <Button className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-ink-muted hover:bg-overlay-hover" onClick={() => setSearchOpen(true)}>
          <Icon name="search" size="sm" />
          Search chats
        </Button>
      </div>
      <div className="flex items-center justify-between px-5 pb-2 text-[10px] uppercase tracking-wider text-ink-faint">
        <span>Harnesses</span>
        <Button aria-label="Collapse all project chats" className="normal-case tracking-normal hover:text-ink" onClick={collapseAllProjects}>
          Collapse chats
        </Button>
      </div>
      <nav aria-label="Harness workspaces" className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-3" data-testid="harness-sidebar-scroll">
        {library.data?.harnesses.map((harness) => (
          <HarnessSidebarSection
            key={harness.id}
            harness={harness}
            projects={projects.filter((project) => project.harnessId === harness.id)}
            configuredProjects={library.data.projects.filter((project) => project.harnessId === harness.id)}
            activeSessionId={activeSessionId}
            expandedProjectIds={expandedProjects}
            onToggleProject={toggleProject}
            onAddProject={setAddingToHarness}
          />
        ))}
        {library.isPending && <p className="px-2 py-3 text-xs text-ink-muted">Loading harnesses…</p>}
        {library.isError && (
          <p className="px-2 text-xs text-danger-ink">
            Harnesses unavailable.{" "}
            <Button
              onClick={() => {
                void library.refetch();
              }}
            >
              Retry
            </Button>
          </p>
        )}
        <Link to="/harnesses" className="mt-2 flex items-center gap-2 rounded-lg px-2 py-2 text-xs text-ink-muted hover:bg-overlay-hover">
          <Icon name="plus" size="xs" />
          Manage harnesses
        </Link>
      </nav>
      <div className="border-t border-border px-3 py-2">
        <Link className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs text-ink-muted hover:bg-overlay-hover hover:text-ink" to="/settings">
          <Icon name="settings" size="sm" />
          <span>App settings</span>
          {window.desktopApi?.nightly && <span className="text-xs text-ink-faint">Nightly</span>}
        </Link>
      </div>
      <OpenProjectDialog onClose={() => setAddingToHarness(undefined)} onOpenProject={handleOpenProject} open={!!addingToHarness} />
      <SearchSessionsDialog onClose={() => setSearchOpen(false)} open={searchOpen} />
    </aside>
  );
}
