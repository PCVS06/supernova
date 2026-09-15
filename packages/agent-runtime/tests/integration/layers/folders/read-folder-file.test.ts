import {stat, symlink, writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {Effect} from "effect";
import {afterEach, describe, expect, it} from "vitest";
import {readFolderFile} from "@supernova/agent-runtime/layers/folders/operations/read-folder-file";
import {createProjectFixture} from "@tests/support/layers/folder-test-utils";
import {cleanupTempDirs} from "@tests/support/layers/test-utils";

const maxReadBytes = 512 * 1024;

describe("reading project files", () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    cleanupTempDirs(tempDirs);
  });

  async function createTrackedProjectFixture(): Promise<string> {
    const tempDir = await createProjectFixture();
    tempDirs.push(tempDir);
    return tempDir;
  }

  it("reads text with its size and modification time", async () => {
    const tempDir = await createTrackedProjectFixture();

    const result = await Effect.runPromise(readFolderFile(tempDir, "src/session.ts"));

    expect(result).toEqual({
      path: "src/session.ts",
      content: "export const session = null;",
      size: 28,
      truncated: false,
      binary: false,
      modifiedAt: (await stat(join(tempDir, "src", "session.ts"))).mtime.toISOString(),
    });
  });

  it("cuts a file at the read limit and reports the full size", async () => {
    const tempDir = await createTrackedProjectFixture();
    await writeFile(join(tempDir, "long.md"), "x".repeat(maxReadBytes + 2048));

    const result = await Effect.runPromise(readFolderFile(tempDir, "long.md"));

    expect(result.content.length).toBe(maxReadBytes);
    expect(result).toMatchObject({size: maxReadBytes + 2048, truncated: true, binary: false});
  });

  it("reports a binary file instead of decoding it", async () => {
    const tempDir = await createTrackedProjectFixture();
    await writeFile(join(tempDir, "logo.png"), Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00, 0x0d, 0x0a, 0x1a]));

    const result = await Effect.runPromise(readFolderFile(tempDir, "logo.png"));

    expect(result).toMatchObject({binary: true, content: "", size: 8, truncated: false});
  });

  it("refuses files outside the project", async () => {
    const tempDir = await createTrackedProjectFixture();
    await symlink(tmpdir(), join(tempDir, "outside"));

    for (const path of ["../secrets.md", "outside/secrets.md", "src/../../secrets.md"]) {
      await expect(Effect.runPromise(readFolderFile(tempDir, path))).rejects.toThrow("escapes the project directory");
    }
  });
});
