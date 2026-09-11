import {useState} from "react";
import {Link} from "@tanstack/react-router";
import type {HarnessConfig, HarnessProject} from "@supernova/contracts/harnesses/schemas";
import Button from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import IconButton from "@/components/ui/icon-button";
import PiOrb from "@/components/brand/pi-orb";
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
  const {harness, projects, activeSessionId, expandedProjectIds, onToggleProject, onAddProject} = props;
  const selectHarness = useHarnessNavigationStore((state) => state.selectHarness);
  const [open, setOpen] = useState(true);
  const head = projects.find((project) => project.isCoordinator);
  const labs = projects.filter((project) => !project.isCoordinator).toSorted((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const list = (items: ProjectListProject[]) => (
    <SortableProjectList activeSessionId={activeSessionId} expandedProjectIds={expandedProjectIds} onToggleProject={onToggleProject} projects={items} />
  );
  return (
    <section className="mb-3" aria-label={`${harness.name} harness`}>
      <div className="group/harness sticky top-0 z-10 flex items-center gap-1 rounded-lg bg-surface-sidebar py-1">
        <Button aria-label={`${open ? "Collapse" : "Expand"} ${harness.name}`} aria-expanded={open} className="p-1 text-ink-faint" onClick={() => setOpen(!open)}>
          <Icon name="chevron-down" className={cn("transition-transform", !open && "-rotate-90")} size="xs" />
        </Button>
        <Link
          className="flex min-w-0 flex-1 items-center gap-2 rounded-md py-1 text-sm font-medium hover:text-ink-strong"
          to="/settings/harness/$harnessId"
          params={{harnessId: harness.id}}
          onClick={() => selectHarness(harness.id)}
        >
          <PiOrb className="size-7" state="still" />
          <span className="truncate">{harness.name}</span>
        </Link>
        <IconButton className="size-7 text-ink-muted" label={`New project in ${harness.name}`} onClick={() => onAddProject(harness.id)}>
          <Icon name="plus" size="xs" />
        </IconButton>
      </div>
      {open && (
        <div className="ml-3 border-l border-border pl-2">
          {head && list([head])}
          <p className="px-2 pb-1 pt-2 text-[10px] font-medium uppercase tracking-wider text-ink-faint">
            {head ? "Labs" : "Projects"} · {labs.length}
          </p>
          {labs.some((project) => project.pinned) && (
            <>
              <p className="px-2 py-1 text-[10px] text-ink-faint">Pinned</p>
              {list(labs.filter((project) => project.pinned))}
            </>
          )}
          {list(labs.filter((project) => !project.pinned))}
          {projects.length === 0 && (
            <Button className="px-2 py-2 text-xs text-ink-muted" onClick={() => onAddProject(harness.id)}>
              Add your first project
            </Button>
          )}
        </div>
      )}
    </section>
  );
}
