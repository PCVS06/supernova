import type {HarnessConfig, HarnessLibrary, HarnessProject} from "@supernova/contracts/harnesses/schemas";

interface WorkspaceDraft {
  harness: HarnessConfig;
  project: HarnessProject | undefined;
  revision: number;
}

/** Saves each owner with its revision. A partial success remains acknowledged if the next owner conflicts. */
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
  if (draft.project && JSON.stringify(draft.project) !== JSON.stringify(base.project)) {
    const library = await writers.project({project: draft.project, expectedRevision: saved.revision});
    saved = {...saved, project: draft.project, revision: library.revision};
    onSaved(saved);
  }
  return saved;
}
