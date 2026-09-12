import {renderToStaticMarkup} from "react-dom/server";
import {beforeEach, describe, expect, it, vi} from "vitest";
import type {HarnessConfig, HarnessProject} from "@supernova/contracts/harnesses/schemas";
import ProjectConfigEditor from "@/features/harnesses/components/project-config-editor";

vi.mock("@/features/harnesses/hooks/api/use-project-documents", () => ({
  useProjectDocument: () => ({data: undefined, isPending: false, isError: true, isFetching: false, refetch: vi.fn()}),
  useSaveProjectDocument: () => ({mutate: vi.fn(), reset: vi.fn(), isPending: false, isSuccess: false, error: undefined}),
}));

const harness: HarnessConfig = {
  id: "science",
  name: "Science Pi",
  description: "Research",
  systemPrompt: "Shared rules",
  coordinatorProjectId: "head",
  agents: [{name: "reviewer", description: "Review evidence", systemPrompt: "Review", tools: ["read"]}],
  extensions: [],
  skills: [],
  context: {instructions: "", files: [], includeProjectInstructions: true, autoCompaction: true, reserveTokens: 1000, keepRecentTokens: 1000},
  graph: {steps: []},
  loop: {maxTurns: 10, timeoutSeconds: 60},
};
const head: HarnessProject = {
  id: "head",
  harnessId: "science",
  name: "Science Space",
  path: "/science",
  systemPrompt: "Central brief",
  contextInstructions: "Central context",
  agents: [],
  order: 2,
};
const lab: HarnessProject = {...head, id: "lab", name: "Robot Lab", path: "/robot", color: "#7dd3fc", order: 1, parentProjectId: "head", planningDocuments: ["PLAN.md"]};

const render = (project: HarnessProject | undefined, projects: readonly HarnessProject[] = [lab, head]) =>
  renderToStaticMarkup(
    <ProjectConfigEditor
      harness={harness}
      project={project}
      projects={projects}
      onChangeProject={vi.fn()}
      onSelect={vi.fn()}
      onOpenSpecialists={vi.fn()}
      onPersistPlanningDocuments={vi.fn(async () => undefined)}
      onRemoveProject={vi.fn(async () => undefined)}
    />
  );

describe("project planning workspace", () => {
  beforeEach(() => {
    vi.stubGlobal("window", {});
  });

  it("opens the plan of the selected project under the page header, without repeating the name", () => {
    const html = render(lab);
    expect(html).toContain('aria-label="Open Robot Lab"');
    expect(html).toContain('title="/robot"');
    expect(html).toContain('aria-label="Project editor tabs"');
    expect(html).toContain('data-testid="planning-workspace"');
    expect(html).not.toContain("<h2");
    expect(html).toContain('aria-label="Plan" aria-pressed="true"');
    expect(html).toContain('aria-label="Instructions" aria-pressed="false"');
    expect(html).toContain('aria-label="Setup" aria-pressed="false"');
    expect(html).toContain('aria-label="PLAN.md content"');
    // No agent hero and no uppercase role eyebrow on a project page.
    expect(html).not.toContain("agent-editor-portrait");
    expect(html).not.toContain("uppercase");
    expect(html).not.toContain("COORDINATING PROJECT");
  });

  it("puts the coordinating project first and flags a project whose folder is gone", () => {
    const missing = {...head, folderMissing: true};
    const html = render(missing, [lab, missing]);
    expect(html.indexOf('aria-label="Open Science Space"')).toBeLessThan(html.indexOf('aria-label="Open Robot Lab"'));
    expect(html).toContain("Folder missing");
    expect(html).toContain("folder is missing, so its documents cannot be read or saved.");
  });

  it("asks for a project before it shows any editor", () => {
    const html = render(undefined);
    expect(html).toContain("Select a project to plan its work.");
    expect(html).not.toContain('aria-label="Project editor tabs"');
  });

  it("keeps project context instructions off the page", () => {
    expect(render(lab)).not.toContain('aria-label="Project context instructions"');
    expect(render(head)).not.toContain("Central context");
  });
});
