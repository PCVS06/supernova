import {useProjectsStore, toProjectId} from "@/features/projects/stores/projects-store";
import type {ProjectListProject} from "@/features/projects/types/project-list";
import {useHarnessLibrary} from "@/features/harnesses/hooks/api/use-harnesses";

/** Derives configured places immediately; polling never removes a routed project through a mirror effect. */
export function useProjectList(): ProjectListProject[] {
  const stored = useProjectsStore((state) => state.projects);
  const library = useHarnessLibrary();
  const configured = library.data?.projects ?? [];
  const places = [
    ...configured.map((project) => ({path: project.path, name: project.name})),
    ...stored.filter((project) => !configured.some((item) => item.path === project.path) && (!project.managedBy || !library.data)),
  ];
  return places.map((place) => {
    const local = stored.find((project) => project.path === place.path);
    const project = configured.find((item) => item.path === place.path);
    return {
      id: local?.id ?? toProjectId(place.path),
      name: project?.name ?? place.name,
      path: place.path,
      harnessId: project?.harnessId ?? "coding",
      harnessProjectId: project?.id,
      isCoordinator: !!project && library.data?.harnesses.some((harness) => harness.coordinatorProjectId === project.id),
      parentProjectId: project?.parentProjectId,
      color: project?.color,
      order: project?.order,
      pinned: local?.pinned === true,
      pinnedSessionIds: local?.pinnedSessionIds ?? [],
    };
  });
}
