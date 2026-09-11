import {symlink} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {Effect} from "effect";
import {afterEach, describe, expect, it} from "vitest";
import {listFolderEntries} from "@supernova/agent-runtime/layers/folders/operations/list-folder-entries";
import {createProjectFixture} from "@tests/support/layers/folder-test-utils";
import {cleanupTempDirs} from "@tests/support/layers/test-utils";

describe("listing project directory entries", () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    cleanupTempDirs(tempDirs);
  });

  async function createTrackedProjectFixture(): Promise<string> {
    const tempDir = await createProjectFixture();
    tempDirs.push(tempDir);
    return tempDir;
  }

  it("lists direct children with directories first and never the git directory", async () => {
    const tempDir = await createTrackedProjectFixture();

    const result = await Effect.runPromise(listFolderEntries(tempDir, ""));

    expect(result.path).toBe("");
    expect(result.entries.map((entry) => entry.name)).toEqual([".config", "features", "src", ".env", ".gitignore", "ignored.ts"]);
    expect(result.entries.find((entry) => entry.name === ".config")).toEqual({name: ".config", path: ".config", kind: "directory", size: undefined, ignored: false});
    expect(result.entries.find((entry) => entry.name === ".env")).toEqual({name: ".env", path: ".env", kind: "file", size: 13, ignored: false});
  });

  it("lists a nested directory with project-relative paths", async () => {
    const tempDir = await createTrackedProjectFixture();

    const result = await Effect.runPromise(listFolderEntries(tempDir, "src"));

    expect(result.path).toBe("src");
    expect(result.entries).toEqual([
      {name: "components", path: "src/components", kind: "directory", size: undefined, ignored: false},
      {name: "session.ts", path: "src/session.ts", kind: "file", size: 28, ignored: false},
    ]);
  });

  it("refuses directories outside the project", async () => {
    const tempDir = await createTrackedProjectFixture();
    await symlink(tmpdir(), join(tempDir, "outside"));

    for (const path of ["..", "../", "src/../..", "outside"]) {
      await expect(Effect.runPromise(listFolderEntries(tempDir, path))).rejects.toThrow("escapes the project directory");
    }
    await expect(Effect.runPromise(listFolderEntries(tempDir, tmpdir()))).rejects.toThrow("must be relative");
  });
});
