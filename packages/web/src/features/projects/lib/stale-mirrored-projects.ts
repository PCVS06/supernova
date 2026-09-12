import type {HarnessLibrary} from "@supernova/contracts/harnesses/schemas";
import type {StoredProject} from "@/features/projects/stores/projects-store";

/**
 * Stored rows the harness library no longer backs. A row mirrored from a harness leaves with its
 * project; so does any folder inside an imported workspace, which was never opened by hand.
 */
export function staleMirroredProjects(stored: readonly StoredProject[], library: Pick<HarnessLibrary, "harnesses" | "projects">): StoredProject[] {
  const linked = new Set(library.projects.map((project) => project.path));
  const workspaceRoots = library.harnesses.flatMap((harness) => (harness.source ? [harness.source.rootPath] : []));
  return stored.filter((project) => !linked.has(project.path) && (project.managedBy !== undefined || workspaceRoots.some((root) => project.path.startsWith(`${root}/`))));
}
