import type {HarnessConfig, HarnessLibrary, HarnessProject} from "@supernova/contracts/harnesses/schemas";

export interface WorkspaceDraft {
  harness: HarnessConfig;
  projects: readonly HarnessProject[];
  revision: number;
}

/** Saves each changed owner with the acknowledged revision. A partial success stays saved if the next owner conflicts. */
export async function saveWorkspaceDraft(
  base: WorkspaceDraft,
  draft: WorkspaceDraft,
  writers: {
    harness: (input: {harness: HarnessConfig; expectedRevision: number}) => Promise<HarnessLibrary>;
    project: (input: {project: HarnessProject; expectedRevision: number}) => Promise<HarnessLibrary>;
  },
  onSaved: (saved: WorkspaceDraft) => void
) {
  let saved = base;
  if (JSON.stringify(draft.harness) !== JSON.stringify(base.harness)) {
    const library = await writers.harness({harness: draft.harness, expectedRevision: saved.revision});
    saved = {...saved, harness: draft.harness, revision: library.revision};
    onSaved(saved);
  }
  for (const project of draft.projects) {
    const previous = base.projects.find((item) => item.id === project.id);
    if (!previous || JSON.stringify(previous) === JSON.stringify(project)) continue;
    const library = await writers.project({project, expectedRevision: saved.revision});
    saved = {...saved, projects: saved.projects.map((item) => (item.id === project.id ? project : item)), revision: library.revision};
    onSaved(saved);
  }
  return saved;
}
