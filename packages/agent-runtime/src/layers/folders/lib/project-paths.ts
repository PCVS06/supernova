import {realpath} from "node:fs/promises";
import {dirname, isAbsolute, relative, resolve, sep} from "node:path";
import {normalizePathForDisplay} from "@supernova/agent-runtime/layers/folders/lib/folder-paths";

export interface ConfinedProjectPath {
  /** Project-relative path using forward slashes; empty for the project root. */
  readonly path: string;
  readonly projectRoot: string;
  readonly target: string;
}

/** Resolves the deepest existing ancestor, so a file that does not exist yet is still checked against the project. */
async function realExistingAncestor(target: string): Promise<string> {
  let candidate = target;

  for (;;) {
    const resolved = await realpath(candidate).catch(() => undefined);
    if (resolved) return resolved;

    const parent = dirname(candidate);
    if (parent === candidate) return candidate;
    candidate = parent;
  }
}

/**
 * Resolves a project-relative path into an absolute path inside the project.
 *
 * Follows the harness context-file rule: absolute input is refused, the project root and the deepest
 * existing ancestor pass through realpath, and a path that leaves the project after symlink
 * resolution is refused instead of being listed, read, or written.
 */
export async function confineToProject(projectPath: string, path: string): Promise<ConfinedProjectPath> {
  if (isAbsolute(path)) throw new Error("Project paths must be relative.");

  const projectRoot = await realpath(projectPath);
  const target = resolve(projectRoot, path);
  const escapesProject = (candidate: string) => {
    const rel = relative(projectRoot, candidate);
    return rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel);
  };

  if (escapesProject(target) || escapesProject(await realExistingAncestor(target))) throw new Error("Path escapes the project directory.");
  return {path: normalizePathForDisplay(relative(projectRoot, target)), projectRoot, target};
}
