import type {WorkflowStep, WorkflowRun, WorkflowStepSummary} from "@supernova/contracts/harnesses/schemas/workflow";

/** All prerequisites, keeping data handoffs distinct from ordering-only edges. */
export function workflowDependencies(step: Pick<WorkflowStep, "reads" | "dependsOn">): readonly string[] {
  return [...new Set([...step.reads, ...(step.dependsOn ?? [])])];
}

/** Validates and layers a DAG without relying on the order of its definitions. */
export function workflowLayers(steps: readonly Pick<WorkflowStep, "id" | "reads" | "dependsOn">[]): readonly (readonly string[])[] {
  const ids = new Set(steps.map((step) => step.id));
  if (ids.size !== steps.length) throw new Error("Workflow step IDs must be unique.");
  const remaining = new Map<string, number>();
  const dependents = new Map<string, string[]>();
  const order = new Map(steps.map((step, index) => [step.id, index]));
  for (const step of steps) {
    const dependencies = workflowDependencies(step);
    remaining.set(step.id, dependencies.length);
    for (const dependency of dependencies) {
      if (!ids.has(dependency)) throw new Error(`Step ${step.id} references missing prerequisite ${dependency}.`);
      if (dependency === step.id) throw new Error(`Step ${step.id} cannot depend on itself.`);
      const children = dependents.get(dependency) ?? [];
      children.push(step.id);
      dependents.set(dependency, children);
    }
  }
  let ready = steps.filter((step) => remaining.get(step.id) === 0).map((step) => step.id);
  let visited = 0;
  const layers: string[][] = [];
  while (ready.length) {
    layers.push(ready);
    visited += ready.length;
    const next: string[] = [];
    for (const id of ready)
      for (const child of dependents.get(id) ?? []) {
        const count = remaining.get(child)! - 1;
        remaining.set(child, count);
        if (count === 0) next.push(child);
      }
    // Preserve definition order within a layer, independently of which parent unlocks it.
    ready = next.sort((a, b) => order.get(a)! - order.get(b)!);
  }
  if (visited !== steps.length) throw new Error("Workflow dependencies contain a cycle. Remove the circular connection before starting.");
  return layers;
}

/** Counts distinct readers of each output once, without treating ordering edges as data consumers. */
export function workflowOutputConsumers(steps: readonly Pick<WorkflowStep, "reads">[]): ReadonlyMap<string, number> {
  const consumers = new Map<string, number>();
  for (const step of steps) for (const source of new Set(step.reads)) consumers.set(source, (consumers.get(source) ?? 0) + 1);
  return consumers;
}

/** Projects one persisted run into a compact graph with no transcript or instruction text. */
export function workflowStepSummaries(run: Pick<WorkflowRun, "workflow" | "steps">): readonly WorkflowStepSummary[] {
  const definitions = new Map(run.workflow.steps.map((step) => [step.id, step]));
  return run.steps.map((record) => {
    const step = definitions.get(record.stepId);
    return {
      stepId: record.stepId,
      agent: record.agent,
      reads: step?.reads ?? [],
      dependsOn: step?.dependsOn ?? [],
      status: record.status,
      waitReason: record.waitReason ?? record.error,
      attempt: record.attempt,
      startedAt: record.startedAt,
      finishedAt: record.finishedAt,
      runId: record.runId,
      usage: record.usage,
    };
  });
}
