import {readFile, readdir, stat, symlink, utimes} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {Effect} from "effect";
import {afterEach, describe, expect, it} from "vitest";
import {writeFolderFile} from "@supernova/agent-runtime/layers/folders/operations/write-folder-file";
import {createProjectFixture} from "@tests/support/layers/folder-test-utils";
import {cleanupTempDirs} from "@tests/support/layers/test-utils";

describe("writing project Markdown files", () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    cleanupTempDirs(tempDirs);
  });

  async function createTrackedProjectFixture(): Promise<string> {
    const tempDir = await createProjectFixture();
    tempDirs.push(tempDir);
    return tempDir;
  }

  it("creates missing parent directories and leaves no partial file behind", async () => {
    const tempDir = await createTrackedProjectFixture();

    const result = await Effect.runPromise(writeFolderFile(tempDir, "docs/plans/roadmap.md", "# Roadmap\n"));

    const written = join(tempDir, "docs", "plans", "roadmap.md");
    expect(result).toEqual({path: "docs/plans/roadmap.md", size: 10, modifiedAt: (await stat(written)).mtime.toISOString()});
    expect(await readFile(written, "utf8")).toBe("# Roadmap\n");
    expect(await readdir(join(tempDir, "docs", "plans"))).toEqual(["roadmap.md"]);
  });

  it("refuses files that are not Markdown", async () => {
    const tempDir = await createTrackedProjectFixture();

    for (const path of ["notes.txt", "src/session.ts", "plan", "plan.md.bak"]) {
      await expect(Effect.runPromise(writeFolderFile(tempDir, path, "content"))).rejects.toThrow("Only Markdown files can be written");
    }
  });

  it("refuses paths that escape the project", async () => {
    const tempDir = await createTrackedProjectFixture();
    await symlink(tmpdir(), join(tempDir, "outside"));

    for (const path of ["../escape.md", "src/../../escape.md", "outside/escape.md"]) {
      await expect(Effect.runPromise(writeFolderFile(tempDir, path, "# Escape"))).rejects.toThrow("escapes the project directory");
    }
    await expect(Effect.runPromise(writeFolderFile(tempDir, join(tmpdir(), "escape.md"), "# Escape"))).rejects.toThrow("must be relative");
  });

  it("refuses a stale expected modification time and keeps the file on disk", async () => {
    const tempDir = await createTrackedProjectFixture();
    const target = join(tempDir, "plan.md");
    const first = await Effect.runPromise(writeFolderFile(tempDir, "plan.md", "# Plan"));
    await utimes(target, new Date(), new Date(Date.now() + 60_000));

    await expect(Effect.runPromise(writeFolderFile(tempDir, "plan.md", "# Stale", first.modifiedAt))).rejects.toThrow("changed on disk");
    expect(await readFile(target, "utf8")).toBe("# Plan");

    const current = await stat(target);
    const second = await Effect.runPromise(writeFolderFile(tempDir, "plan.md", "# Fresh", current.mtime.toISOString()));

    expect(second.size).toBe(7);
    expect(await readFile(target, "utf8")).toBe("# Fresh");
  });
});
