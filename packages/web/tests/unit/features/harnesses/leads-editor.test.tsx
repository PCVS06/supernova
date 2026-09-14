import {renderToStaticMarkup} from "react-dom/server";
import {beforeEach, describe, expect, it, vi} from "vitest";
import type {HarnessConfig, HarnessExecution, HarnessProject} from "@supernova/contracts/harnesses/schemas";
import LeadsEditor from "@/features/harnesses/components/leads-editor";
import AgentsEditor from "@/features/harnesses/components/agents-editor";
import {saveWorkspaceDraft} from "@/features/harnesses/lib/save-workspace-draft";

const controls = vi.hoisted(() => ({execution: undefined as {value?: HarnessExecution; inherited?: HarnessExecution; onChange: (value: HarnessExecution) => void} | undefined}));
vi.mock("@/features/harnesses/components/execution-editor", () => ({
  default: (props: NonNullable<typeof controls.execution>) => {
    controls.execution = props;
    return <div>Execution controls</div>;
  },
}));
vi.mock("@/features/harnesses/components/skills-editor", () => ({default: () => <div>Skills</div>}));
vi.mock("@/features/harnesses/components/instruction-history", () => ({default: () => <div>History</div>}));

const harness: HarnessConfig = {
  id: "science",
  name: "Science Pi",
  description: "Research",
  systemPrompt: "Shared rules",
  orchestratorPrompt: "Coordinate labs",
  coordinatorProjectId: "head",
  execution: {model: {id: "shared-model", providerId: "test"}, effort: "medium"},
  agents: [{name: "reviewer", description: "Review evidence", systemPrompt: "Review", tools: ["read"]}],
  extensions: [],
  skills: [],
  context: {instructions: "", files: [], includeProjectInstructions: true, autoCompaction: true, reserveTokens: 1000, keepRecentTokens: 1000},
  graph: {steps: []},
  loop: {maxTurns: 10, timeoutSeconds: 60},
};
const head: HarnessProject = {id: "head", harnessId: "science", name: "Science Space", path: "/science", systemPrompt: "Science brief", contextInstructions: "", agents: []};
const lab: HarnessProject = {...head, id: "lab", name: "Robot Lab", path: "/robot", parentProjectId: "head", color: "#7dd3fc", execution: {effort: "high"}};

describe("project lead tab", () => {
  beforeEach(() => {
    controls.execution = undefined;
  });

  const render = (project: HarnessProject) => {
    const onChangeProject = vi.fn();
    const html = renderToStaticMarkup(<LeadsEditor harness={harness} project={project} onChangeProject={onChangeProject} onOpenSpecialists={vi.fn()} />);
    return {html, onChangeProject};
  };

  it("edits the lead role, its execution, its skills and its overrides in the project", () => {
    const {html} = render(lab);
    expect(html).toContain('aria-label="Lead role prompt"');
    expect(html).toContain("Execution controls");
    expect(html).toContain(">Skills<");
    expect(html).toContain("overridden specialists");
    expect(html).toContain('data-testid="project-detail-scroll"');
    // The lead is a facet of its project, so it carries no agent portrait and no project list of its own.
    expect(html).not.toContain("agent-editor-portrait");
    expect(html).not.toContain('aria-label="Search project leads"');
  });

  it("changes only the selected lead model and effort, never shared defaults", () => {
    const {onChangeProject} = render(lab);
    expect(controls.execution?.value).toEqual(lab.execution);
    expect(controls.execution?.inherited).toEqual(harness.execution);
    controls.execution!.onChange({effort: "low"});
    expect(onChangeProject).toHaveBeenCalledWith({execution: {effort: "low"}});
  });

  it("keeps the shared manual and the project brief off the lead tab", () => {
    const {html} = render(lab);
    expect(html).not.toContain('aria-label="Shared operating instructions"');
    expect(html).not.toContain('aria-label="Project system instructions"');
    expect(html).not.toContain('aria-label="Role color #ffffff"');
  });
});

describe("harness agents", () => {
  beforeEach(() => {
    controls.execution = undefined;
  });

  const render = (selectedName?: string, agents = harness.agents) =>
    renderToStaticMarkup(
      <AgentsEditor harness={{...harness, agents}} coordinatorName="Science Space" selectedName={selectedName} onSelect={vi.fn()} onChange={vi.fn()} onOpenPage={vi.fn()} />
    );

  it("lists the main orchestrator with the specialists and offers three panels", () => {
    const html = render();
    expect(html).toContain('aria-label="Configure Main orchestrator"');
    expect(html).toContain('aria-label="Configure Reviewer"');
    expect(html).toContain('aria-label="Agent editor tabs"');
    expect(html).toContain('aria-label="Settings" aria-pressed="true"');
    expect(html).toContain('aria-label="Instructions" aria-pressed="false"');
    expect(html).toContain('aria-label="Skills" aria-pressed="false"');
    expect(html).not.toContain('aria-label="Memory"');
    expect(html).toContain('data-constant="tau"');
  });

  it("sends the orchestrator's fields to the page that owns them", () => {
    expect(render()).toContain("Open Overview");
    expect(render()).toContain("Science Space runs the coordinating chats.");
    expect(render()).not.toContain('aria-label="Shared operating instructions"');
    expect(render()).not.toContain("Execution controls");
  });

  it("edits the selected specialist and keeps execution within it", () => {
    const html = render("reviewer");
    expect(html).toContain('aria-label="Reviewer specialist identity"');
    expect(html).toContain('aria-label="Agent identifier"');
    expect(html).toContain('aria-label="Agent role"');
    expect(html).toContain('aria-label="Allowed tools"');
    expect(html).toContain("Execution controls");
    expect(controls.execution?.inherited).toEqual(harness.execution);
  });

  it("keeps agent creation accessible when the specialist list is empty", () => {
    const html = render(undefined, []);
    expect(html).toContain('aria-label="Add agent"');
    expect(html).toContain('aria-label="Configure Main orchestrator"');
  });
});

describe("workspace draft saves", () => {
  const base = {harness, projects: [head, lab], revision: 7};
  const draft = {
    ...base,
    harness: {...harness, systemPrompt: "Updated shared rules"},
    projects: [
      {...head, systemPrompt: "Updated central brief"},
      {...lab, systemPrompt: "Updated lab brief"},
    ],
  };
  const library = {revision: 8, harnesses: [draft.harness], projects: draft.projects};

  it("saves the harness and every changed project, each with the acknowledged revision", async () => {
    const writers = {
      harness: vi.fn().mockResolvedValue(library),
      project: vi
        .fn()
        .mockResolvedValueOnce({...library, revision: 9})
        .mockResolvedValueOnce({...library, revision: 10}),
    };
    const onSaved = vi.fn();
    const saved = await saveWorkspaceDraft(base, draft, writers, onSaved);
    expect(writers.harness).toHaveBeenCalledWith({harness: draft.harness, expectedRevision: 7});
    expect(writers.project).toHaveBeenNthCalledWith(1, {project: draft.projects[0], expectedRevision: 8});
    expect(writers.project).toHaveBeenNthCalledWith(2, {project: draft.projects[1], expectedRevision: 9});
    expect(saved).toEqual({...draft, revision: 10});
    expect(onSaved).toHaveBeenCalledTimes(3);
  });

  it("acknowledges the saved owners if a later project fails, then retries only the unsaved one", async () => {
    const writers = {
      harness: vi.fn().mockResolvedValue(library),
      project: vi
        .fn()
        .mockResolvedValueOnce({...library, revision: 9})
        .mockRejectedValueOnce(new Error("Revision conflict"))
        .mockResolvedValue({...library, revision: 10}),
    };
    const onSaved = vi.fn();
    await expect(saveWorkspaceDraft(base, draft, writers, onSaved)).rejects.toThrow("Revision conflict");
    const acknowledged = onSaved.mock.calls[1]![0];
    expect(acknowledged).toEqual({harness: draft.harness, projects: [draft.projects[0], lab], revision: 9});
    await saveWorkspaceDraft(acknowledged, draft, writers, onSaved);
    expect(writers.harness).toHaveBeenCalledTimes(1);
    expect(writers.project).toHaveBeenCalledTimes(3);
  });

  it("does not touch the harness or an unchanged project when one brief changes", async () => {
    const writers = {harness: vi.fn(), project: vi.fn().mockResolvedValue(library)};
    await saveWorkspaceDraft(base, {...base, projects: [head, draft.projects[1]!]}, writers, vi.fn());
    expect(writers.harness).not.toHaveBeenCalled();
    expect(writers.project).toHaveBeenCalledTimes(1);
    expect(writers.project).toHaveBeenCalledWith({project: draft.projects[1], expectedRevision: 7});
  });
});
