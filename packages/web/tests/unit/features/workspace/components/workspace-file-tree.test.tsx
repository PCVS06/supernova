import type {FolderEntry} from "@supernova/contracts/folders/procedures";
import {renderToStaticMarkup} from "react-dom/server";
import {beforeEach, describe, expect, it, vi} from "vitest";
import WorkspaceFileTree from "@/features/workspace/components/workspace-file-tree";

const state = vi.hoisted(() => ({entriesByPath: new Map<string, readonly FolderEntry[]>(), failing: false}));

vi.mock("@/features/workspace/hooks/api/use-folder-entries", () => ({
  useFolderEntries: (input: {path: string}) => ({
    data: state.entriesByPath.has(input.path) ? {entries: state.entriesByPath.get(input.path), path: input.path} : undefined,
    error: state.failing ? new Error("unreadable") : null,
  }),
}));

function entry(input: Partial<FolderEntry> & {name: string; path: string}): FolderEntry {
  return {ignored: false, kind: "file", ...input};
}

function treeMarkup(input?: {readonly expandedPaths?: readonly string[]; readonly openFilePath?: string}): string {
  return renderToStaticMarkup(
    <WorkspaceFileTree
      expandedPaths={input?.expandedPaths ?? []}
      onOpenFile={vi.fn()}
      onToggleDirectory={vi.fn()}
      openFilePath={input?.openFilePath ?? null}
      path=""
      projectPath="/workspace"
    />
  );
}

describe("workspace file tree", () => {
  beforeEach(() => {
    state.entriesByPath = new Map<string, readonly FolderEntry[]>([
      [
        "",
        [
          entry({name: "readme.md", path: "readme.md", size: 120}),
          entry({kind: "directory", name: "src", path: "src"}),
          entry({ignored: true, kind: "directory", name: "node_modules", path: "node_modules"}),
        ],
      ],
      ["src", [entry({name: "main.ts", path: "src/main.ts", size: 64})]],
    ]);
    state.failing = false;
  });

  it("lists a directory with folders before files", () => {
    const html = treeMarkup();

    expect(html).toContain("readme.md");
    expect(html).toContain("node_modules");
    expect(html.indexOf("src")).toBeLessThan(html.indexOf("readme.md"));
    expect(html).toContain('aria-label="Project files"');
  });

  it("loads the level below a revealed directory only", () => {
    const collapsed = treeMarkup();
    expect(collapsed).not.toContain("main.ts");

    const expanded = treeMarkup({expandedPaths: ["src"]});

    expect(expanded).toContain("main.ts");
    expect(expanded).toContain('aria-expanded="true"');
  });

  it("marks the open file and waits for directories it has not read", () => {
    const html = treeMarkup({expandedPaths: ["src"], openFilePath: "src/main.ts"});
    expect(html).toContain("bg-overlay-pressed");

    state.entriesByPath.delete("src");

    expect(treeMarkup({expandedPaths: ["src"]})).toContain("Loading files…");
  });

  it("reports a folder it cannot read", () => {
    state.failing = true;

    const html = treeMarkup();

    expect(html).toContain("This folder could not be read.");
  });
});
