import type {FolderFileReadResult} from "@supernova/contracts/folders/procedures";
import {renderToStaticMarkup} from "react-dom/server";
import {beforeEach, describe, expect, it, vi} from "vitest";
import WorkspaceFileViewer from "@/features/workspace/components/workspace-file-viewer";

const state = vi.hoisted(() => ({file: undefined as FolderFileReadResult | undefined, failing: false}));

vi.mock("@/features/workspace/hooks/api/use-folder-file", () => ({
  useFolderFile: () => ({data: state.file, error: state.failing ? new Error("unreadable") : null}),
}));

function file(input?: Partial<FolderFileReadResult>): FolderFileReadResult {
  return {
    binary: false,
    content: "first\nsecond",
    modifiedAt: "2026-01-01T00:00:00.000Z",
    path: "docs/plan.md",
    size: 12,
    truncated: false,
    ...input,
  };
}

describe("workspace file viewer", () => {
  beforeEach(() => {
    state.file = file();
    state.failing = false;
  });

  it("numbers the lines it shows", () => {
    const html = renderToStaticMarkup(<WorkspaceFileViewer path="docs/plan.md" projectPath="/workspace" sessionId="chat-1" />);

    expect(html).toContain("first");
    expect(html).toContain("second");
    expect(html).toMatch(/>1</);
    expect(html).toMatch(/>2</);
  });

  it("says when the server cut the file at its read limit", () => {
    state.file = file({size: 2_097_152, truncated: true});

    const html = renderToStaticMarkup(<WorkspaceFileViewer path="docs/plan.md" projectPath="/workspace" sessionId="chat-1" />);

    expect(html).toContain("Showing the start of this file only");
    expect(html).toContain("2.0 MB");
  });

  it("says when a file is binary instead of showing empty content", () => {
    state.file = file({binary: true, content: "", path: "assets/logo.png", size: 4_096});

    const html = renderToStaticMarkup(<WorkspaceFileViewer path="assets/logo.png" projectPath="/workspace" sessionId="chat-1" />);

    expect(html).toContain("This is a binary file");
    expect(html).toContain("4 KB");
    expect(html).not.toContain("<ol");
  });

  it("offers the file to the open chat and withholds the action without one", () => {
    const withChat = renderToStaticMarkup(<WorkspaceFileViewer path="docs/plan.md" projectPath="/workspace" sessionId="chat-1" />);
    const withoutChat = renderToStaticMarkup(<WorkspaceFileViewer path="docs/plan.md" projectPath="/workspace" sessionId={null} />);

    expect(withChat).toContain("Add to chat");
    expect(withChat).not.toContain('disabled=""');
    expect(withoutChat).toContain('disabled=""');
  });

  it("reports a file it cannot read", () => {
    state.file = undefined;
    state.failing = true;

    const html = renderToStaticMarkup(<WorkspaceFileViewer path="docs/plan.md" projectPath="/workspace" sessionId="chat-1" />);

    expect(html).toContain("This file could not be read.");
  });
});
