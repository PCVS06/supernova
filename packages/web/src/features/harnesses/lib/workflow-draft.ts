import type {HarnessConfig, HarnessWorkflow, WorkflowStep} from "@supernova/contracts/harnesses/schemas";

/** Wall-clock budget a newly added workflow starts with, in seconds. */
const defaultWallClockSeconds = 1800;

/** Appends a numeric suffix until the identifier is unused. Never returns an empty id, whatever the agent is called. */
function uniqueId(base: string, taken: ReadonlySet<string>, fallback: string): string {
  const root =
    base
      .replace(/[^a-zA-Z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 72) || fallback;
  let id = root;
  for (let suffix = 2; taken.has(id); suffix += 1) id = `${root}-${suffix}`;
  return id;
}

/** A step with the smallest contract the runtime accepts, reading the step before it. */
export function createWorkflowStep(agent: string, steps: readonly WorkflowStep[]): WorkflowStep {
  const previous = steps.at(-1);
  return {
    id: uniqueId(agent, new Set(steps.map((step) => step.id)), "step"),
    agent,
    instructions: "",
    reads: previous ? [previous.id] : [],
    output: {fields: [{name: "result", type: "string", required: true, description: "This step's result for the next agent."}]},
    effects: "workspace",
  };
}

/** A named workflow, seeded with its first step because the runtime rejects a workflow without one. */
export function createWorkflow(workflows: readonly HarnessWorkflow[], agent?: string): HarnessWorkflow {
  return {
    id: uniqueId(`workflow-${workflows.length + 1}`, new Set(workflows.map((item) => item.id)), "workflow"),
    name: `Workflow ${workflows.length + 1}`,
    description: "",
    steps: agent ? [createWorkflowStep(agent, [])] : [],
    limits: {maxWallClockSeconds: defaultWallClockSeconds},
  };
}

/** Keeps the legacy handoff list mirroring the first workflow, because that is the field the server still validates. */
export function workflowsPatch(workflows: readonly HarnessWorkflow[]): Pick<HarnessConfig, "graph" | "workflows"> {
  return {workflows, graph: {steps: workflows[0]?.steps.map((step) => step.agent) ?? []}};
}
