import {useProjectsStore} from "@/features/projects/stores/projects-store";
import type {ProjectListProject} from "@/features/projects/types/project-list";
import {useEffect} from "react";
import {useHarnessLibrary} from "@/features/harnesses/hooks/api/use-harnesses";

export function useProjectList(): ProjectListProject[] {
  const storedProjects = useProjectsStore((state) => state.projects);
  const addProject = useProjectsStore((state) => state.addProject);
  const library = useHarnessLibrary();
  useEffect(() => {
    for (const project of library.data?.projects ?? []) addProject(project.path);
  }, [library.data?.projects, addProject]);

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
