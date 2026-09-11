import {renderToStaticMarkup} from "react-dom/server";
import {beforeEach, describe, expect, it, vi} from "vitest";
import type {HarnessAgent, HarnessConfig, HarnessExecution, HarnessWorkflow} from "@supernova/contracts/harnesses/schemas";
import WorkflowsEditor from "@/features/harnesses/components/workflows-editor";
import {createWorkflowStep, insertWorkflowStep, moveWorkflowStep, removeWorkflowStep, workflowsPatch} from "@/features/harnesses/lib/workflow-draft";

const controls = vi.hoisted(() => ({execution: undefined as {onChange: (value: HarnessExecution) => void} | undefined}));
vi.mock("@/features/harnesses/components/execution-editor", () => ({
  default: (props: NonNullable<typeof controls.execution>) => {
    controls.execution = props;
    return <div>Execution controls</div>;
  },
}));

const agents: HarnessAgent[] = [
  {name: "literature-scout", description: "Finds candidate sources", systemPrompt: "Scout", tools: ["read"]},
  {name: "source-verifier", description: "Checks each claim against its source", systemPrompt: "Verify", tools: ["read"]},
];
const workflow: HarnessWorkflow = {
  id: "review",
  name: "Evidence review",
  description: "Collect sources, then verify them",
  steps: [
    {
      id: "literature-scout",
      agent: "literature-scout",
      instructions: "Collect candidate sources.",
      reads: [],
      output: {fields: [{name: "sources", type: "string[]", required: true, description: "Candidate sources"}]},
      effects: "none",
    },
    {
      id: "source-verifier",
      agent: "source-verifier",
      instructions: "Verify every source.",
      reads: ["literature-scout"],
      output: {fields: [{name: "verdict", type: "string", required: true}]},
      effects: "external",
      execution: {effort: "high"},
    },
  ],
  limits: {maxWallClockSeconds: 1800},
};
// A stale legacy list, so a mirrored change cannot pass by copying it.
const harness: HarnessConfig = {
  id: "science",
  name: "Science Pi",
  description: "Research",
  systemPrompt: "Shared rules",
  agents,
  extensions: [],
  skills: [],
  context: {instructions: "", files: [], includeProjectInstructions: true, autoCompaction: true, reserveTokens: 1000, keepRecentTokens: 1000},
  graph: {steps: ["stale-agent"]},
  workflows: [workflow],
  loop: {maxTurns: 10, timeoutSeconds: 60},
};

describe("workflow graph", () => {
  beforeEach(() => {
    controls.execution = undefined;
  });
  const render = (config = harness) => {
    const onChange = vi.fn();
    const html = renderToStaticMarkup(<WorkflowsEditor harness={config} onChange={onChange} />);
    return {html, onChange};
  };
  it("draws one node per step with its agent, contract, effects and overrides", () => {
    const {html} = render();
    expect(html).toContain('aria-label="Workflow"');
    expect(html).toContain("Evidence review");
    expect(html).toContain('aria-label="Workflow steps"');
    expect(html).toContain('aria-label="Edit step literature-scout"');
    expect(html).toContain('aria-label="Edit step source-verifier"');
    expect(html).toContain("Literature scout");
    expect(html).toContain("Reads only");
    expect(html).toContain("External effects");
    expect(html).toContain("sources");
    expect(html).toContain("verdict");
    // The step-level override is visible on the node, not only inside the inspector.
    expect(html).toContain("high");
    expect(html).toContain("Task from the chat");
    expect(html).toContain("Result back to the chat");
  });
  it("labels each edge with the fields that travel along it and offers an insertion point", () => {
    const {html} = render();
    expect(html).toContain('aria-label="Fields into source-verifier"');
    expect(html).toContain("literature-scout → sources");
    expect(html).toContain('aria-label="Add a step before source-verifier"');
    expect(html).not.toContain('aria-label="Fields into literature-scout"');
    expect(html).not.toContain('aria-label="Add a step before literature-scout"');
  });
  it("opens the selected node in a side editor with reads limited to earlier steps", () => {
    const {html} = render();
    expect(html).toContain('aria-label="Edit step literature-scout" aria-pressed="true"');
    expect(html).toContain('aria-label="Edit step source-verifier" aria-pressed="false"');
    expect(html).toContain('aria-label="Agent for literature-scout"');
    expect(html).toContain('aria-label="Instructions for literature-scout"');
    expect(html).toContain('aria-label="literature-scout field 1 name"');
    expect(html).toContain('value="sources"');
    expect(html).toContain('aria-label="Effects of literature-scout"');
    expect(html).toContain('aria-label="Remove step literature-scout"');
    expect(html).toContain("Nothing runs before this step. It receives the task only.");
    expect(html).not.toContain('aria-label="Agent for source-verifier"');
    expect(html).not.toContain('aria-label="literature-scout reads');
  });
  it("mirrors the legacy handoff list onto the edited workflows", () => {
    const {onChange} = render();
    controls.execution!.onChange({effort: "low"});
    expect(onChange).toHaveBeenCalledWith({
      workflows: [{...workflow, steps: [{...workflow.steps[0], execution: {effort: "low"}}, workflow.steps[1]]}],
      graph: {steps: ["literature-scout", "source-verifier"]},
    });
  });
  it("invites the first workflow instead of editing a harness without one", () => {
    const {html} = render({...harness, workflows: []});
    expect(html).toContain("No workflow configured. Add one, then give each step an agent.");
    expect(html).not.toContain('aria-label="Workflow steps"');
    expect(html).not.toContain('aria-label="Edit step literature-scout"');
  });
  it("keeps the research graph note for an imported harness only", () => {
    expect(render().html).not.toContain("Your research graph stays separate");
    expect(render({...harness, source: {packagePath: "/pkg", rootPath: "/root"}}).html).toContain("Your research graph stays separate");
  });
});

describe("workflow drafts", () => {
  it("derives unique, non-empty step ids from the agent name", () => {
    const cases = [
      {name: "first_step", agent: "literature-scout", taken: [] as string[], id: "literature-scout"},
      {name: "suffix_on_repeat", agent: "literature-scout", taken: ["literature-scout"], id: "literature-scout-2"},
      {name: "suffix_keeps_climbing", agent: "literature-scout", taken: ["literature-scout", "literature-scout-2"], id: "literature-scout-3"},
      {name: "never_empty", agent: "   ", taken: [], id: "step"},
      {name: "identifier_safe", agent: "Review & Sign", taken: [], id: "Review-Sign"},
    ];
    for (const each of cases) {
      const steps = each.taken.map((id) => ({...workflow.steps[0]!, id}));
      expect(createWorkflowStep(each.agent, steps).id, each.name).toBe(each.id);
    }
  });
  it("reads the step before it so a new step receives the previous output", () => {
    expect(createWorkflowStep("source-verifier", workflow.steps).reads).toEqual(["source-verifier"]);
    expect(createWorkflowStep("source-verifier", []).reads).toEqual([]);
    expect(createWorkflowStep("source-verifier", []).output.fields).toHaveLength(1);
  });
  it("inserts a step between nodes reading the step it now follows", () => {
    const inserted = insertWorkflowStep(workflow.steps, 1, "literature-scout");
    expect(inserted.map((step) => step.id)).toEqual(["literature-scout", "literature-scout-2", "source-verifier"]);
    expect(inserted[1]!.reads).toEqual(["literature-scout"]);
    expect(insertWorkflowStep(workflow.steps, 0, "literature-scout")[0]!.reads).toEqual([]);
    expect(insertWorkflowStep(workflow.steps, 2, "literature-scout")[2]!.reads).toEqual(["source-verifier"]);
  });
  it("drops the reads of a removed step instead of waiting for output that cannot arrive", () => {
    const remaining = removeWorkflowStep(workflow.steps, "literature-scout");
    expect(remaining.map((step) => step.id)).toEqual(["source-verifier"]);
    expect(remaining[0]!.reads).toEqual([]);
  });
  it("prunes reads that would point forward after a move", () => {
    const moved = moveWorkflowStep(workflow.steps, 1, -1);
    expect(moved.map((step) => step.id)).toEqual(["source-verifier", "literature-scout"]);
    expect(moved[0]!.reads).toEqual([]);
    expect(moveWorkflowStep(workflow.steps, 0, -1)).toBe(workflow.steps);
    expect(moveWorkflowStep(workflow.steps, 1, 1)).toBe(workflow.steps);
  });
  it("mirrors only the first workflow in the legacy handoff list", () => {
    const second: HarnessWorkflow = {...workflow, id: "second", steps: [workflow.steps[1]!]};
    expect(workflowsPatch([workflow, second]).graph).toEqual({steps: ["literature-scout", "source-verifier"]});
    expect(workflowsPatch([second, workflow]).graph).toEqual({steps: ["source-verifier"]});
    expect(workflowsPatch([]).graph).toEqual({steps: []});
  });
});
