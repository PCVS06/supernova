import {open} from "node:fs/promises";
import {extname} from "node:path";
import {Effect} from "effect";
import {FolderFileReadError} from "@supernova/contracts/folders/procedures";
import {confineToProject} from "@supernova/agent-runtime/layers/folders/lib/project-paths";

/** Largest slice of a file handed to the editor; anything past it is reported as truncated. */
const maxReadBytes = 512 * 1024;
/** A NUL byte in the first 8 KiB is the usual signal that a file is not text. */
const binarySniffBytes = 8 * 1024;
const maxImageBytes = 5 * 1024 * 1024;
const imageMediaTypes: Readonly<Record<string, string>> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".avif": "image/avif",
};

/** Reads a confined project file as bounded UTF-8 text without decoding binaries. */
export function readFolderFile(projectPath: string, path: string, imagePreview = false) {
  return Effect.tryPromise({
    try: async () => {
      const file = await confineToProject(projectPath, path);
      const handle = await open(file.target, "r");

      try {
        const stats = await handle.stat();
        if (!stats.isFile()) throw new Error("That path is not a regular file.");

        if (imagePreview) {
          const mediaType = imageMediaTypes[extname(file.path).toLowerCase()];
          if (!mediaType) throw new Error("This image format cannot be previewed.");
          if (stats.size > maxImageBytes) throw new Error("Image previews are limited to 5 MB.");
          const buffer = Buffer.alloc(stats.size);
          let offset = 0;
          while (offset < buffer.length) {
            const {bytesRead} = await handle.read(buffer, offset, buffer.length - offset, offset);
            if (bytesRead === 0) throw new Error("The image changed while it was being read. Try again.");
            offset += bytesRead;
          }
          return {
            path: file.path,
            content: "",
            size: stats.size,
            truncated: false,
            binary: true,
            modifiedAt: stats.mtime.toISOString(),
            image: {mediaType, base64: buffer.toString("base64")},
          };
        }

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
