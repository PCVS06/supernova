import {useState} from "react";
import ConstantOrb from "@/components/brand/constant-orb";
import {Link} from "@tanstack/react-router";
import type {HarnessConfig, HarnessProject} from "@supernova/contracts/harnesses/schemas";
import Button from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import IconButton from "@/components/ui/icon-button";
import {useWorkspaceOverview} from "@/features/workspace/hooks/use-workspace-overview";
import {useHarnessNavigationStore} from "@/features/harnesses/stores/harness-navigation-store";
import SortableProjectList from "@/features/projects/components/project-list/sortable-project-list";
import type {ProjectListProject} from "@/features/projects/types/project-list";
import {cn} from "@/lib/cn";
import {ledgerDisclosureClassName, ledgerMarkClassName, ledgerPrimaryClassName} from "@/features/sidebar/lib/ledger-styles";

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
  const overview = useWorkspaceOverview();
  const [open, setOpen] = useState(projects.length > 0);
  const working = !overview.error && !overview.data?.errors.length && overview.model.items.some((item) => item.harnessId === harness.id && item.active);
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
    <section data-sidebar-level="harness" aria-label={`${harness.name} harness`}>
      <div className="group/harness flex min-h-10 items-center">
        <Button
          aria-expanded={open}
          className={cn(ledgerPrimaryClassName, "gap-1 py-0 text-xs font-medium uppercase tracking-wide text-ink-muted hover:bg-overlay-hover hover:text-ink")}
          onClick={() => setOpen(!open)}
        >
          <Icon name="chevron-down" className={cn(ledgerDisclosureClassName, "sidebar-harness-disclosure", !open && "-rotate-90")} size="xs" />
          <span className={ledgerMarkClassName}>
            <ConstantOrb constant="pi" className="size-10" state={working ? "working" : "idle"} />
          </span>
          <span className="min-w-0 truncate">{harness.name}</span>
          <span className="sr-only">
            {projects.length} {projects.length === 1 ? "project" : "projects"}
          </span>
        </Button>
        <div className="sidebar-row-actions flex w-14 shrink-0 items-center justify-end gap-0.5 pr-1 group-hover/harness:opacity-100 group-focus-within/harness:opacity-100">
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
            params={{harnessId: harness.id, page: "overview"}}
            title={`Harness settings for ${harness.name}`}
            to="/settings/harness/$harnessId/$page"
          >
            <Icon name="sliders" size="xs" />
          </Link>
        </div>
      </div>
      {open && (
        <div className="space-y-0.5 pl-3">
          {head && list([head])}
          {labs.length > 0 && (
            // Projects share one visual level; their lead relationship is identified in the row.
            <div className="space-y-1">
              {pinnedLabs.length > 0 && list(pinnedLabs)}
              {restLabs.length > 0 && list(restLabs)}
            </div>
          )}
          {projects.length === 0 && (
            <Button
              className="ml-2 flex h-9 items-center gap-2 rounded-lg px-2 text-xs text-ink-faint transition-colors hover:bg-overlay-hover hover:text-ink"
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
