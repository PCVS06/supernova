import {renderToStaticMarkup} from "react-dom/server";
import {beforeEach, describe, expect, it, vi} from "vitest";
import type {HarnessConfig, HarnessProject} from "@supernova/contracts/harnesses/schemas";
import ProjectConfigEditor from "@/features/harnesses/components/project-config-editor";
import type {ProjectSection} from "@/features/harnesses/components/project-config-editor";

vi.mock("@/features/harnesses/hooks/api/use-project-documents", () => ({
  useProjectDocument: () => ({data: undefined, isPending: false, isError: true, isFetching: false, refetch: vi.fn()}),
  useSaveProjectDocument: () => ({mutate: vi.fn(), reset: vi.fn(), isPending: false, isSuccess: false, error: undefined}),
}));
vi.mock("@/features/harnesses/hooks/api/use-harness-resources", () => ({
  useHarnessMemory: () => ({
    data: {projectName: "Robot Lab", available: false, total: 0, rejected: 0, records: []},
    isError: false,
    isPending: false,
    isFetching: false,
    refetch: vi.fn(),
  }),
}));
vi.mock("@/features/harnesses/components/execution-editor", () => ({default: () => <div>Execution controls</div>}));
vi.mock("@/features/harnesses/components/skills-editor", () => ({default: () => <div>Skills</div>}));
vi.mock("@/features/harnesses/components/instruction-history", () => ({default: () => <div>History</div>}));

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

const render = (project: HarnessProject | undefined, section: ProjectSection = "setup", projects: readonly HarnessProject[] = [lab, head]) =>
  renderToStaticMarkup(
    <ProjectConfigEditor
      harness={harness}
      project={project}
      projects={projects}
      section={section}
      onSectionChange={vi.fn()}
      onChangeProject={vi.fn()}
      onSelect={vi.fn()}
      onOpenAgents={vi.fn()}
      onPersistPlanningDocuments={vi.fn(async () => undefined)}
      onRemoveProject={vi.fn(async () => undefined)}
    />
  );

describe("project workspace", () => {
  beforeEach(() => {
    vi.stubGlobal("window", {});
  });

  it("opens the selected project on five tabs, without repeating its name", () => {
    const html = render(lab);
    expect(html).toContain('aria-label="Open Robot Lab"');
    expect(html).toContain('title="/robot"');
    expect(html).toContain('aria-label="Project editor tabs"');
    expect(html).toContain('aria-label="Setup" aria-pressed="true"');
    expect(html).toContain('aria-label="Lead" aria-pressed="false"');
    expect(html).toContain('aria-label="Instructions" aria-pressed="false"');
    expect(html).toContain('aria-label="Plan" aria-pressed="false"');
    expect(html).toContain('aria-label="Memory" aria-pressed="false"');
    expect(html).not.toContain("Robot Lab</h2>");
    expect(html).not.toContain("agent-editor-portrait");
  });

  it("gives the coordinating project no lead tab and points at the main orchestrator", () => {
    const html = render(head);
    expect(html).not.toContain('aria-label="Lead"');
    expect(html).toContain("Open Main orchestrator");
    expect(html).toContain("Coordination role");
    expect(render(lab)).not.toContain("Open Main orchestrator");
  });

  it("puts the lead role, the briefs, the plan and the ledger each on one tab", () => {
    expect(render(lab, "lead")).toContain('aria-label="Lead role prompt"');
    expect(render(lab, "instructions")).toContain('aria-label="Project system instructions"');
    expect(render(lab, "instructions")).toContain('aria-label="Project context instructions"');
    expect(render(lab, "plan")).toContain('data-testid="planning-workspace"');
    expect(render(lab, "plan")).toContain('aria-label="PLAN.md content"');
    expect(render(lab, "memory")).toContain("Memory · read-only");
  });

  it("says which tabs act at once and which are read-only", () => {
    expect(render(lab, "plan")).toContain("Plan changes save at once");
    expect(render(lab, "memory")).toContain(">Read-only<");
    expect(render(lab, "setup")).not.toContain("save at once");
  });

  it("puts the coordinating project first and flags a project whose folder is gone", () => {
    const missing = {...head, folderMissing: true};
    const html = render(missing, "setup", [lab, missing]);
    expect(html.indexOf('aria-label="Open Science Space"')).toBeLessThan(html.indexOf('aria-label="Open Robot Lab"'));
    expect(html).toContain("Folder missing");
    expect(html).toContain("This folder no longer exists on the server.");
  });

  it("asks for a project before it shows any editor", () => {
    const html = render(undefined);
    expect(html).toContain("Select a project to configure it.");
    expect(html).not.toContain('aria-label="Project editor tabs"');
  });
});
