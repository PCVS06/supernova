import {renderToStaticMarkup} from "react-dom/server";
import {beforeEach, describe, expect, it, vi} from "vitest";
import type {HarnessConfig, HarnessExecution, HarnessProject} from "@supernova/contracts/harnesses/schemas";
import LeadsEditor from "@/features/harnesses/components/leads-editor";
import AgentsEditor from "@/features/harnesses/components/agents-editor";
import AgentRoleMap from "@/features/harnesses/components/agent-role-map";
import {saveWorkspaceDraft} from "@/features/harnesses/lib/save-workspace-draft";

const controls = vi.hoisted(() => ({execution: undefined as {value?: HarnessExecution; inherited?: HarnessExecution; onChange: (value: HarnessExecution) => void} | undefined}));
vi.mock("@/features/harnesses/components/execution-editor", () => ({
  default: (props: NonNullable<typeof controls.execution>) => {
    controls.execution = props;
    return <div>Execution controls</div>;
  },
}));
vi.mock("@/features/harnesses/components/skills-editor", () => ({default: () => <div>Skills</div>}));

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

describe("lead workbench", () => {
  beforeEach(() => {
    controls.execution = undefined;
  });
  const render = (project?: HarnessProject, initialSection: "settings" | "prompt" = "settings") => {
    const onChangeProject = vi.fn();
    const onChangeHarness = vi.fn();
    const html = renderToStaticMarkup(
      <LeadsEditor
        harness={harness}
        initialSection={initialSection}
        project={project}
        projects={[lab, head]}
        onChangeProject={onChangeProject}
        onChangeHarness={onChangeHarness}
        onSelect={vi.fn()}
        onOpenSpecialists={vi.fn()}
      />
    );
    return {html, onChangeProject, onChangeHarness};
  };
  it("gives the main orchestrator its own portrait without a project list", () => {
    const {html} = render(head);
    expect(html).toContain('aria-label="Science Space lead identity"');
    expect(html).toContain("Cross-lab coordinator");
    expect(html).toContain("1 labs");
    expect(html).not.toContain('aria-label="Configure Science Space lead"');
    expect(html).not.toContain('aria-label="Configure Robot Lab lead"');
    expect(html).toContain('aria-label="Lead editor tabs"');
    expect(html).not.toContain("lead-list-scroll");
    expect(html).toContain("lead-detail-scroll");
    expect(html).not.toContain('data-state="working"');
  });
  it("distinguishes project accountability from specialists and uses its project color", () => {
    const {html} = render(lab);
    expect(html).toContain('aria-label="Robot Lab lead identity"');
    expect(html).toContain('aria-label="Configure Robot Lab lead"');
    expect(html).not.toContain('aria-label="Configure Science Space lead"');
    expect(html).toContain("lead-list-scroll");
    expect(html).toContain('style="color:#7dd3fc"');
    expect(html).toContain("Reports to Science Space");
    expect(html).toContain('data-kind="specialist"');
    expect(html).toContain('aria-label="Lead color #7dd3fc" aria-pressed="true"');
  });
  it("changes only the selected lead model and effort, never shared defaults", () => {
    const {onChangeProject, onChangeHarness} = render(lab);
    expect(controls.execution?.value).toEqual(lab.execution);
    expect(controls.execution?.inherited).toEqual(harness.execution);
    controls.execution!.onChange({effort: "low"});
    expect(onChangeProject).toHaveBeenCalledWith({execution: {effort: "low"}});
    expect(onChangeHarness).not.toHaveBeenCalled();
  });
  it("keeps the head lead execution override project-scoped too", () => {
    const {onChangeProject, onChangeHarness} = render(head);
    expect(controls.execution?.value).toBeUndefined();
    controls.execution!.onChange({effort: "high"});
    expect(onChangeProject).toHaveBeenCalledWith({execution: {effort: "high"}});
    expect(onChangeHarness).not.toHaveBeenCalled();
  });
  it("places the shared manual with the main orchestrator and keeps each brief local", () => {
    const main = render(head, "prompt").html;
    const project = render(lab, "prompt").html;
    expect(main).toContain('aria-label="Shared operating instructions"');
    expect(main).toContain('aria-label="Project instructions"');
    expect(main).toContain("Coordination role · main orchestrator only");
    expect(project).not.toContain('aria-label="Shared operating instructions"');
    expect(project).toContain("Shared operating manual · inherited");
    expect(project).toContain('aria-label="Project instructions"');
    expect(project).toContain('aria-label="Lead role prompt"');
  });
  it("offers the three role levels and no memory entry of its own", () => {
    const html = renderToStaticMarkup(<AgentRoleMap harness={harness} project={lab} projects={[head, lab]} section="leads" onSelect={vi.fn()} />);
    expect(html).toContain('aria-label="Main orchestrator" aria-pressed="false"');
    expect(html).toContain('aria-label="Project leads" aria-pressed="true"');
    expect(html).toContain('aria-label="Specialists" aria-pressed="false"');
    expect(html).not.toContain('aria-label="Memory"');
    const specialists = renderToStaticMarkup(<AgentRoleMap harness={harness} project={lab} projects={[head, lab]} section="specialists" onSelect={vi.fn()} />);
    expect(specialists).toContain('aria-label="Specialists" aria-pressed="true"');
    expect(specialists).toContain('aria-label="Project leads" aria-pressed="false"');
  });
  it("uses the same portrait, editor navigation and settings order for all three roles", () => {
    const specialist = renderToStaticMarkup(<AgentsEditor agents={harness.agents} harness={harness} onChange={vi.fn()} />);
    for (const html of [render(head).html, render(lab).html, specialist]) {
      expect(html).toContain('data-testid="agent-editor-detail"');
      expect(html).toContain("agent-editor-portrait size-24");
      expect(html).toContain('aria-label="Settings" aria-pressed="true"');
      expect(html).toContain('aria-label="Instructions" aria-pressed="false"');
      expect(html).toContain('aria-label="Skills" aria-pressed="false"');
      expect(html).toContain('aria-label="Memory" aria-pressed="false"');
      expect(html.indexOf("Execution controls")).toBeLessThan(html.indexOf(">Identity<"));
      expect(html.indexOf(">Identity<")).toBeLessThan(html.indexOf(">Responsibilities<"));
      expect(html).not.toContain('data-state="working"');
    }
    expect(specialist).toContain('aria-label="Reviewer specialist identity"');
    expect(specialist).toContain('aria-label="Search specialists"');
    expect(render(lab).html).toContain('aria-label="Search project leads"');
  });
  it("keeps specialist execution edits within the selected agent", () => {
    const onChange = vi.fn();
    const other = {...harness.agents[0]!, name: "writer"};
    renderToStaticMarkup(<AgentsEditor agents={[...harness.agents, other]} harness={harness} onChange={onChange} />);
    controls.execution!.onChange({effort: "low"});
    expect(onChange).toHaveBeenCalledWith([{...harness.agents[0], execution: {effort: "low"}}, other]);
  });
  it("keeps agent creation accessible when the specialist list is empty", () => {
    const html = renderToStaticMarkup(<AgentsEditor agents={[]} harness={harness} onChange={vi.fn()} />);
    expect(html).toContain('aria-label="Add agent"');
    expect(html).toContain("Add an agent to configure");
    expect(html).not.toContain("agent-editor-portrait");
  });
});

describe("instruction owner saves", () => {
  const base = {harness, project: head, revision: 7};
  const draft = {...base, harness: {...harness, systemPrompt: "Updated shared rules"}, project: {...head, systemPrompt: "Updated central brief"}};
  const library = {revision: 8, harnesses: [draft.harness], projects: [head, lab]};
  it("saves both changed owners sequentially using the acknowledged revision", async () => {
    const writers = {harness: vi.fn().mockResolvedValue(library), project: vi.fn().mockResolvedValue({...library, revision: 9})};
    const onSaved = vi.fn();
    const saved = await saveWorkspaceDraft(base, draft, writers, onSaved);
    expect(writers.harness).toHaveBeenCalledWith({harness: draft.harness, expectedRevision: 7});
    expect(writers.project).toHaveBeenCalledWith({project: draft.project, expectedRevision: 8});
    expect(saved).toEqual({...draft, revision: 9});
    expect(onSaved).toHaveBeenCalledTimes(2);
  });
  it("acknowledges a shared save if the project save fails, then retries only the unsaved owner", async () => {
    const writers = {
      harness: vi.fn().mockResolvedValue(library),
      project: vi
        .fn()
        .mockRejectedValueOnce(new Error("Revision conflict"))
        .mockResolvedValue({...library, revision: 9}),
    };
    const onSaved = vi.fn();
    await expect(saveWorkspaceDraft(base, draft, writers, onSaved)).rejects.toThrow("Revision conflict");
    const acknowledged = onSaved.mock.calls[0]![0];
    expect(acknowledged).toEqual({...base, harness: draft.harness, revision: 8});
    await saveWorkspaceDraft(acknowledged, draft, writers, onSaved);
    expect(writers.harness).toHaveBeenCalledTimes(1);
    expect(writers.project).toHaveBeenCalledTimes(2);
  });
  it("does not touch shared instructions when only a project brief changes", async () => {
    const writers = {harness: vi.fn(), project: vi.fn().mockResolvedValue(library)};
    await saveWorkspaceDraft(base, {...base, project: draft.project}, writers, vi.fn());
    expect(writers.harness).not.toHaveBeenCalled();
    expect(writers.project).toHaveBeenCalledWith({project: draft.project, expectedRevision: 7});
  });
});
