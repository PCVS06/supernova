import {renderToStaticMarkup} from "react-dom/server";
import {beforeEach, describe, expect, it, vi} from "vitest";
import type {HarnessAgent, HarnessConfig, HarnessExecution, HarnessWorkflow} from "@supernova/contracts/harnesses/schemas";
import WorkflowsEditor from "@/features/harnesses/components/workflows-editor";
import {createWorkflowStep, workflowsPatch} from "@/features/harnesses/lib/workflow-draft";

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

describe("workflow configuration", () => {
  beforeEach(() => {
    controls.execution = undefined;
  });
  const render = (config = harness) => {
    const onChange = vi.fn();
    const html = renderToStaticMarkup(<WorkflowsEditor harness={config} onChange={onChange} />);
    return {html, onChange};
  };
  it("shows the selected workflow with each step's agent, contract and effects", () => {
    const {html} = render();
    expect(html).toContain("Evidence review");
    expect(html).toContain('aria-label="Workflow"');
    expect(html).toContain('aria-label="Agent for step 1"');
    expect(html).toContain("Finds candidate sources");
    expect(html).toContain("Checks each claim against its source");
    expect(html).toContain('aria-label="Step 1 field 1 name" value="sources"');
    expect(html).toContain('aria-label="Step 2 field 1 type"');
    expect(html).toContain('aria-label="Effects of step 2"');
    expect(html).toContain("External effects are never retried automatically");
    expect(html).not.toContain("Agent handoff graph");
  });
  it("offers only earlier steps as reads", () => {
    const {html} = render();
    expect(html).toContain('aria-label="Step 2 reads literature-scout"');
    expect(html).not.toContain('aria-label="Step 1 reads');
    expect(html).toContain("Nothing runs before this step. It receives the task only.");
  });
  it("mirrors the legacy handoff list onto the edited workflows", () => {
    const {onChange} = render();
    controls.execution!.onChange({effort: "low"});
    expect(onChange).toHaveBeenCalledWith({
      workflows: [{...workflow, steps: [workflow.steps[0], {...workflow.steps[1], execution: {effort: "low"}}]}],
      graph: {steps: ["literature-scout", "source-verifier"]},
    });
  });
  it("invites the first workflow instead of editing a harness without one", () => {
    const {html} = render({...harness, workflows: []});
    expect(html).toContain("No workflow configured. Add one, then give each step an agent.");
    expect(html).not.toContain('aria-label="Agent for step 1"');
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
  it("mirrors only the first workflow in the legacy handoff list", () => {
    const second: HarnessWorkflow = {...workflow, id: "second", steps: [workflow.steps[1]!]};
    expect(workflowsPatch([workflow, second]).graph).toEqual({steps: ["literature-scout", "source-verifier"]});
    expect(workflowsPatch([second, workflow]).graph).toEqual({steps: ["source-verifier"]});
    expect(workflowsPatch([]).graph).toEqual({steps: []});
  });
});
