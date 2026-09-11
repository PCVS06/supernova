import {randomUUID} from "node:crypto";
import {mkdir, rename, rm, stat, writeFile} from "node:fs/promises";
import {dirname, extname} from "node:path";
import {Effect} from "effect";
import {FolderFileWriteError} from "@supernova/contracts/folders/procedures";
import {confineToProject} from "@supernova/agent-runtime/layers/folders/lib/project-paths";

/** The editor writes plans, goals and roadmaps only, never code or configuration. */
const writableExtensions = new Set([".md", ".markdown"]);

/** Writes a confined Markdown file atomically, refusing one that changed on disk since the client read it. */
export function writeFolderFile(projectPath: string, path: string, content: string, expectedModifiedAt?: string) {
  return Effect.tryPromise({
    try: async () => {
      if (!writableExtensions.has(extname(path).toLowerCase())) throw new Error("Only Markdown files can be written.");

      const file = await confineToProject(projectPath, path);
      const current = await stat(file.target).catch(() => undefined);
      if (expectedModifiedAt !== undefined && current?.mtime.toISOString() !== expectedModifiedAt)
        throw new Error("This file changed on disk after it was opened. Reload it before saving.");

      await mkdir(dirname(file.target), {recursive: true});
      // A sibling temporary file keeps an interrupted write from leaving a half-saved document in its place.
      const temporaryPath = `${file.target}.${randomUUID()}.tmp`;
      try {
        await writeFile(temporaryPath, content, "utf8");
        await rename(temporaryPath, file.target);
      } catch (cause) {
        await rm(temporaryPath, {force: true});
        throw cause;
      }

      const written = await stat(file.target);
      return {path: file.path, size: written.size, modifiedAt: written.mtime.toISOString()};
    },
    catch: (cause) =>
      new FolderFileWriteError({
        cause,
        message: cause instanceof Error ? cause.message : "Failed to write file.",
      }),
  });
}
