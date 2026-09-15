import {open} from "node:fs/promises";
import {Effect} from "effect";
import {FolderFileReadError} from "@supernova/contracts/folders/procedures";
import {confineToProject} from "@supernova/agent-runtime/layers/folders/lib/project-paths";

/** Largest slice of a file handed to the editor; anything past it is reported as truncated. */
const maxReadBytes = 512 * 1024;
/** A NUL byte in the first 8 KiB is the usual signal that a file is not text. */
const binarySniffBytes = 8 * 1024;

/** Reads a confined project file as bounded UTF-8 text without decoding binaries. */
export function readFolderFile(projectPath: string, path: string) {
  return Effect.tryPromise({
    try: async () => {
      const file = await confineToProject(projectPath, path);
      const handle = await open(file.target, "r");

      try {
        const stats = await handle.stat();
        if (stats.isDirectory()) throw new Error("That path is a directory, not a file.");

        const buffer = Buffer.alloc(Math.min(stats.size, maxReadBytes));
        await handle.read(buffer, 0, buffer.length, 0);
        const binary = buffer.subarray(0, binarySniffBytes).includes(0);

        return {
          path: file.path,
          content: binary ? "" : buffer.toString("utf8"),
          size: stats.size,
          truncated: stats.size > maxReadBytes,
          binary,
          modifiedAt: stats.mtime.toISOString(),
        };
      } finally {
        await handle.close();
      }
    },
    catch: (cause) =>
      new FolderFileReadError({
        cause,
        message: cause instanceof Error ? cause.message : "Failed to read file.",
      }),
  });
}
