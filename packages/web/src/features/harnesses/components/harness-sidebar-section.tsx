import {useState} from "react";
import {Link} from "@tanstack/react-router";
import type {HarnessConfig, HarnessProject} from "@supernova/contracts/harnesses/schemas";
import Button from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import IconButton from "@/components/ui/icon-button";
import {useHarnessNavigationStore} from "@/features/harnesses/stores/harness-navigation-store";
import SortableProjectList from "@/features/projects/components/project-list/sortable-project-list";
import type {ProjectListProject} from "@/features/projects/types/project-list";
import {cn} from "@/lib/cn";

/** Navigation contains places and their chats. Workers belong underneath actual chats. */
export default function HarnessSidebarSection(props: {
  harness: HarnessConfig;
  projects: ProjectListProject[];
  configuredProjects: readonly HarnessProject[];
  activeSessionId: string;
  expandedProjectIds: Set<string>;
  onToggleProject: (id: string) => void;
  onAddProject: (harnessId: string) => void;
}) {
  const {harness, projects, configuredProjects, activeSessionId, expandedProjectIds, onToggleProject, onAddProject} = props;
  const selectHarness = useHarnessNavigationStore((state) => state.selectHarness);
  const [open, setOpen] = useState(true);
  // A project whose folder vanished cannot start chats; the row has to say so before it is clicked.
  const missingFolderProjectIds = new Set(configuredProjects.filter((project) => project.folderMissing).map((project) => project.id));
  const head = projects.find((project) => project.isCoordinator);
  const labs = projects.filter((project) => !project.isCoordinator).toSorted((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const pinnedLabs = labs.filter((project) => project.pinned);
  const restLabs = labs.filter((project) => !project.pinned);
  const list = (items: ProjectListProject[]) => (
    <SortableProjectList
      activeSessionId={activeSessionId}
      expandedProjectIds={expandedProjectIds}
      missingFolderProjectIds={missingFolderProjectIds}
      onToggleProject={onToggleProject}
      projects={items}
    />
  );

  return (
    <section className="pb-1" aria-label={`${harness.name} harness`}>
      <div className="group/harness sticky top-0 z-10 flex h-8 items-center gap-0.5 bg-surface-sidebar">
        <Button
          aria-expanded={open}
          className="flex h-7 min-w-0 flex-1 items-center gap-1.5 rounded-md px-2 text-left text-[10px] font-semibold uppercase tracking-[0.09em] text-ink-faint hover:text-ink"
          onClick={() => setOpen(!open)}
        >
          <Icon name="chevron-down" className={cn("transition-transform duration-150", !open && "-rotate-90")} size="xs" />
          <span className="truncate">{harness.name}</span>
        </Button>
        <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover/harness:opacity-100 group-focus-within/harness:opacity-100">
          <IconButton
            className="size-6 rounded-md text-ink-faint hover:bg-overlay-hover hover:text-ink"
            label={`New project in ${harness.name}`}
            onClick={() => onAddProject(harness.id)}
          >
            <Icon name="plus" size="xs" />
          </IconButton>
          <Link
            aria-label={`Harness settings for ${harness.name}`}
            className="grid size-6 place-items-center rounded-md text-ink-faint hover:bg-overlay-hover hover:text-ink"
            onClick={() => selectHarness(harness.id)}
            params={{harnessId: harness.id}}
            title={`Harness settings for ${harness.name}`}
            to="/settings/harness/$harnessId"
          >
            <Icon name="sliders" size="xs" />
          </Link>
        </div>
      </div>
      {open && (
        <div className="space-y-px">
          {head && list([head])}
          {labs.length > 0 && (
            // Labs read as work inside the lead, so they sit behind one guide line.
            <div className={cn("space-y-px", head && "ml-3.5 border-l border-border-muted pl-1.5")}>
              {pinnedLabs.length > 0 && list(pinnedLabs)}
              {restLabs.length > 0 && list(restLabs)}
            </div>
          )}
          {projects.length === 0 && (
            <Button
              className="flex h-9 w-full items-center gap-2 rounded-md border border-dashed border-border px-2 text-xs text-ink-faint hover:border-border-strong hover:text-ink"
              onClick={() => onAddProject(harness.id)}
            >
              <Icon name="plus" size="xs" />
              Add a project
            </Button>
          )}
        </div>
      )}
    </section>
  );
}
