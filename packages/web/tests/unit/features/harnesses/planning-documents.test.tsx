import {renderToStaticMarkup} from "react-dom/server";
import {beforeEach, describe, expect, it, vi} from "vitest";
import type {FolderFileReadResult} from "@supernova/contracts/folders/procedures";
import PlanningDocumentsEditor from "@/features/harnesses/components/planning-documents-editor";
import {addPlanningDocument, isPlanningDocumentConflict, normalizePlanningPath, planningDocumentWrite} from "@/features/harnesses/lib/planning-documents";

const loaded: FolderFileReadResult = {
  path: "PLAN.md",
  content: "# Plan\n\nShip the graph editor.",
  size: 32,
  truncated: false,
  binary: false,
  modifiedAt: "2026-09-11T12:00:00Z",
};

const rpc = vi.hoisted(() => ({
  read: {data: undefined, isPending: false, isError: false, isFetching: false, refetch: vi.fn()} as Record<string, unknown>,
  save: {mutate: vi.fn(), reset: vi.fn(), isPending: false, isSuccess: false, error: undefined} as Record<string, unknown>,
  scope: vi.fn(),
}));
vi.mock("@/features/harnesses/hooks/api/use-project-documents", () => ({
  useProjectDocument: (projectPath: string, path: string) => {
    rpc.scope(projectPath, path);
    return rpc.read;
  },
  useSaveProjectDocument: () => rpc.save,
}));

describe("planning documents editor", () => {
  beforeEach(() => {
    rpc.scope.mockClear();
    rpc.read = {data: loaded, isPending: false, isError: false, isFetching: false, refetch: vi.fn()};
    rpc.save = {mutate: vi.fn(), reset: vi.fn(), isPending: false, isSuccess: false, error: undefined};
  });
  const render = (documents: readonly string[] = ["PLAN.md"], disabled?: boolean) =>
    renderToStaticMarkup(<PlanningDocumentsEditor disabled={disabled} documents={documents} projectPath="/robot" onChange={vi.fn()} />);

  it("explains the purpose and opens the first document beside the list", () => {
    const html = render();
    expect(html).toContain("Every chat in this project reads these files after the project instructions.");
    expect(html).toContain('aria-label="Edit PLAN.md" aria-pressed="true"');
    expect(html).toContain('aria-label="Remove PLAN.md from the plan"');
    expect(html).toContain("Saved · ");
    expect(html).toContain('aria-label="PLAN.md content"');
    expect(html).toContain("Ship the graph editor.");
    expect(html).toContain("Save</button>");
    expect(html).toContain("Revert</button>");
    expect(rpc.scope).toHaveBeenCalledWith("/robot", "PLAN.md");
  });

  it("starts an empty plan from the usual documents and suggests the rest afterwards", () => {
    const empty = render([]);
    expect(empty).toContain("No plan yet");
    expect(empty).toContain("Keep the long-term plan, goals and open decisions here");
    expect(empty).toContain("Start PLAN.md");
    expect(empty).toContain("Start GOALS.md");
    expect(empty).toContain("Start ROADMAP.md");
    expect(empty).toContain("Add an existing Markdown file instead");
    const started = render(["PLAN.md"]);
    expect(started).toContain("+ GOALS.md");
    expect(started).toContain("+ ROADMAP.md");
    expect(started).not.toContain("+ PLAN.md");
  });

  it("opens a listed file that is not on disk yet with a starting structure that the first save creates", () => {
    rpc.read = {data: undefined, isPending: false, isError: true, isFetching: false, refetch: vi.fn()};
    const html = render(["GOALS.md"]);
    expect(html).toContain("New file · Save creates it");
    expect(html).toContain("## Success criteria");
    expect(html).not.toMatch(/disabled=""[^>]*>Save</);
  });

  it("stops editing and says why when the project folder is missing", () => {
    const html = render(["PLAN.md"], true);
    expect(html).toContain("folder is missing, so its documents cannot be read or saved.");
    expect(html).toMatch(/aria-label="PLAN.md content"[^>]*disabled=""/);
  });

  it("reports a refused write as a conflict without losing the edit", () => {
    rpc.save = {mutate: vi.fn(), reset: vi.fn(), isPending: false, isSuccess: false, error: {message: "PLAN.md changed on disk"}};
    const html = render();
    expect(html).toContain("PLAN.md changed on disk after it was loaded");
    expect(html).toContain("Your text is still here.");
    expect(html).toContain("Ship the graph editor.");
  });

  it("reports any other refusal as a save failure, not a conflict", () => {
    rpc.save = {mutate: vi.fn(), reset: vi.fn(), isPending: false, isSuccess: false, error: {message: "Writing PLAN.md is not available yet."}};
    const html = render();
    expect(html).toContain("Could not save PLAN.md.");
    expect(html).not.toContain("changed on disk after it was loaded");
  });
});

describe("planning document writes", () => {
  it("sends the loaded modification time so a concurrent edit is refused", () => {
    const cases = [
      {name: "existing_document", loaded, expectedModifiedAt: "2026-09-11T12:00:00Z"},
      {name: "document_not_on_disk_yet", loaded: undefined, expectedModifiedAt: undefined},
    ];
    for (const each of cases) {
      const write = planningDocumentWrite({content: "# Plan", loaded: each.loaded, path: "PLAN.md", projectPath: "/robot"});
      expect(write, each.name).toEqual({content: "# Plan", expectedModifiedAt: each.expectedModifiedAt, path: "PLAN.md", projectPath: "/robot"});
    }
  });

  it("normalizes a project-relative Markdown path", () => {
    const cases = [
      {name: "plain", input: "PLAN.md", path: "PLAN.md"},
      {name: "adds_extension", input: "docs/roadmap", path: "docs/roadmap.md"},
      {name: "strips_leading_slash", input: "/docs/roadmap.md", path: "docs/roadmap.md"},
      {name: "strips_dot_slash", input: "./PLAN.md", path: "PLAN.md"},
      {name: "blank", input: "   ", path: ""},
    ];
    for (const each of cases) expect(normalizePlanningPath(each.input), each.name).toBe(each.path);
  });

  it("adds a document once and keeps the list unchanged for a useless path", () => {
    expect(addPlanningDocument(["PLAN.md"], "GOALS")).toEqual(["PLAN.md", "GOALS.md"]);
    const documents = ["PLAN.md"];
    expect(addPlanningDocument(documents, "PLAN.md")).toBe(documents);
    expect(addPlanningDocument(documents, "  ")).toBe(documents);
  });

  it("treats a refusal as a conflict only when a modification time was sent", () => {
    expect(isPlanningDocumentConflict({message: "File was modified"}, "2026-09-11T12:00:00Z")).toBe(true);
    expect(isPlanningDocumentConflict({message: "File was modified"}, undefined)).toBe(false);
    expect(isPlanningDocumentConflict({message: "Permission denied"}, "2026-09-11T12:00:00Z")).toBe(false);
    expect(isPlanningDocumentConflict(undefined, "2026-09-11T12:00:00Z")).toBe(false);
  });
});
