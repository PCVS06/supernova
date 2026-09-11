import {readdir, stat} from "node:fs/promises";
import {join, posix} from "node:path";
import {Effect} from "effect";
import {FolderEntriesListError} from "@supernova/contracts/folders/procedures";
import type {FolderEntry} from "@supernova/contracts/folders/procedures";
import {confineToProject} from "@supernova/agent-runtime/layers/folders/lib/project-paths";

/** Git's own directory is runtime state, not browsable project content. */
const excludedNames = new Set([".git"]);

/** Directories before files, each group ordered by name, so the tree reads the same as a file browser. */
function byDirectoryThenName(left: FolderEntry, right: FolderEntry): number {
  if (left.kind !== right.kind) return left.kind === "directory" ? -1 : 1;
  return left.name.localeCompare(right.name);
}

/** Lists the direct children of one project directory for the file tree. */
export function listFolderEntries(projectPath: string, path: string) {
  return Effect.tryPromise({
    try: async () => {
      const directory = await confineToProject(projectPath, path);
      const children = await readdir(directory.target, {withFileTypes: true});
      const entries = await Promise.all(
        children
          .filter((child) => !excludedNames.has(child.name))
          .map(async (child): Promise<FolderEntry> => {
            const stats = await stat(join(directory.target, child.name)).catch(() => undefined);
            const isDirectory = stats ? stats.isDirectory() : child.isDirectory();
            return {
              name: child.name,
              path: directory.path ? posix.join(directory.path, child.name) : child.name,
              kind: isDirectory ? "directory" : "file",
              size: isDirectory ? undefined : stats?.size,
              // The project's ignore rules are applied by fd while listing file references, which exposes no
              // per-entry ignore state, so the tree reports no entry as ignored.
              ignored: false,
            };
          })
      );

      return {path: directory.path, entries: entries.toSorted(byDirectoryThenName)};
    },
    catch: (cause) =>
      new FolderEntriesListError({
        cause,
        message: cause instanceof Error ? cause.message : "Failed to list folder entries.",
      }),
  });
}
