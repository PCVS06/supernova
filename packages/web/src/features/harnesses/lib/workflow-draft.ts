import type {HarnessConfig, HarnessWorkflow, WorkflowStep, WorkflowStepEffects} from "@supernova/contracts/harnesses/schemas";

/** How a step's effects read in the graph. External effects are never retried automatically, so they stay visible. */
export const workflowEffectsLabels: Record<WorkflowStepEffects, string> = {
  none: "Reads only",
  workspace: "Writes files",
  external: "External effects",
};

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

/** Inserts a step at `index`. Its id stays unique across the whole workflow and it reads the step it now follows. */
export function insertWorkflowStep(steps: readonly WorkflowStep[], index: number, agent: string): readonly WorkflowStep[] {
  const earlier = steps.slice(0, index);
  const previous = earlier.at(-1);
  const created = createWorkflowStep(agent, steps);
  return [...earlier, {...created, reads: previous ? [previous.id] : []}, ...steps.slice(index)];
}

/** Removes a step and drops every read that pointed at it, so no step waits for output that can no longer arrive. */
export function removeWorkflowStep(steps: readonly WorkflowStep[], id: string): readonly WorkflowStep[] {
  return steps.filter((step) => step.id !== id).map((step) => (step.reads.includes(id) ? {...step, reads: step.reads.filter((read) => read !== id)} : step));
}

/** Moves a step one position and prunes reads that would otherwise point forward, which the runtime rejects. */
export function moveWorkflowStep(steps: readonly WorkflowStep[], index: number, offset: number): readonly WorkflowStep[] {
  const target = index + offset;
  if (index < 0 || target < 0 || index >= steps.length || target >= steps.length) return steps;
  const reordered = [...steps];
  [reordered[index], reordered[target]] = [reordered[target]!, reordered[index]!];
  return reordered.map((step, position) => {
    const allowed = new Set(reordered.slice(0, position).map((earlier) => earlier.id));
    const reads = step.reads.filter((read) => allowed.has(read));
    return reads.length === step.reads.length ? step : {...step, reads};
  });
}
