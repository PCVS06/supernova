import {useProjectsStore} from "@/features/projects/stores/projects-store";
import type {ProjectListProject} from "@/features/projects/types/project-list";
import {useEffect} from "react";
import {useHarnessLibrary} from "@/features/harnesses/hooks/api/use-harnesses";
import {staleMirroredProjects} from "@/features/projects/lib/stale-mirrored-projects";

export function useProjectList(): ProjectListProject[] {
  const storedProjects = useProjectsStore((state) => state.projects);
  const addProject = useProjectsStore((state) => state.addProject);
  const removeProject = useProjectsStore((state) => state.removeProject);
  const library = useHarnessLibrary();
  useEffect(() => {
    if (!library.data) return;
    for (const project of library.data.projects) addProject(project.path, project.harnessId);
    for (const stale of staleMirroredProjects(useProjectsStore.getState().projects, library.data)) removeProject(stale.id);
  }, [library.data, addProject, removeProject]);

  return storedProjects.map((project) => {
    const configured = library.data?.projects.find((item) => item.path === project.path);
    return {
      id: project.id,
      name: configured?.name ?? project.name,
      harnessId: configured?.harnessId ?? "coding",
      harnessProjectId: configured?.id,
      isCoordinator: !!configured && library.data?.harnesses.some((harness) => harness.coordinatorProjectId === configured.id),
      parentProjectId: configured?.parentProjectId,
      color: configured?.color,
      order: configured?.order,
      path: project.path,
      pinned: project.pinned === true,
      pinnedSessionIds: project.pinnedSessionIds ?? [],
    };
  });
}
