import type {HarnessConfig, HarnessLibrary, HarnessProject, HarnessSnapshot, HarnessWorkflow} from "@supernova/contracts/harnesses/schemas";

/** Adds the existing Science workspace's explicit head/lab relationship without changing imported prompts. */
const identifier = /^[a-zA-Z0-9_-]{1,80}$/;
const fieldName = /^[a-zA-Z_][a-zA-Z0-9_]{0,63}$/;
/** Upper bound on shared, context and one role prompt together, before context files. Roughly 100k tokens. */
export const maxInstructionChars = 400000;
export const maxWorkflowSteps = 12;

/** Turns a pre-workflow handoff list into one sequential workflow with a single string handoff per step. */
export function migrateLegacyGraph(harness: HarnessConfig): HarnessWorkflow[] {
  if (harness.workflows) return [...harness.workflows];
  if (!harness.graph.steps.length) return [];
  return [
    {
      id: "handoff",
      name: "Handoff",
      description: "Migrated from the legacy handoff list. Each step receives the previous step's result.",
      steps: harness.graph.steps.map((agent, index) => ({
        id: `step-${index + 1}`,
        agent,
        instructions: "",
        reads: index === 0 ? [] : [`step-${index}`],
        output: {fields: [{name: "result", type: "string", required: true, description: "This step's result for the next agent."}]},
        effects: "workspace",
      })),
      limits: {maxWallClockSeconds: Math.min(86400, harness.loop.timeoutSeconds * Math.max(1, harness.graph.steps.length))},
    },
  ];
}

export function normalizeHarnessHierarchy(library: HarnessLibrary): HarnessLibrary {
  const harnesses = library.harnesses.map((harness) => {
    const workflows = migrateLegacyGraph(harness);
    const coordinatorProjectId =
      harness.coordinatorProjectId ?? library.projects.find((project) => project.harnessId === harness.id && project.path === harness.source?.rootPath)?.id;
    return {
      ...harness,
      workflows,
      // The legacy list mirrors the first workflow so older readers keep showing the same order.
      graph: {steps: workflows[0]?.steps.map((step) => step.agent) ?? []},
      coordinatorProjectId,
      orchestratorPrompt:
        harness.orchestratorPrompt ??
        (coordinatorProjectId
          ? "You are the Science Space head orchestrator. Coordinate the labs below you, maintain the cross-lab research picture, and delegate lab-scoped work explicitly with lab_agent. Do not bypass experiment or evidence approval gates."
          : undefined),
    };
  });
  const projects = library.projects.map((project) => {
    const head = harnesses.find((harness) => harness.id === project.harnessId)?.coordinatorProjectId;
    const parentProjectId = head && head !== project.id ? head : undefined;
    return {
      ...project,
      parentProjectId,
      orchestratorPrompt:
        project.orchestratorPrompt ??
        (parentProjectId
          ? "You are this lab's orchestrator. Work inside this lab, use its specialist team, and report results and uncertainties to Science Space. Do not assume authority over other labs."
          : undefined),
    };
  });
  return {...library, harnesses, projects};
}

/** Creates an independent, minimal harness without inherited extension packages. */
export function createDefaultHarness(id = "coding", name = "Coding"): HarnessConfig {
  return {
    id,
    name,
    description: "A minimal Pi harness. Add your own instructions and specialists.",
    systemPrompt: "",
    agents: [],
    extensions: [],
    skills: [],
    context: {instructions: "", files: [], includeProjectInstructions: true, autoCompaction: true, reserveTokens: 16384, keepRecentTokens: 20000},
    graph: {steps: []},
    workflows: [],
    loop: {maxTurns: 40, timeoutSeconds: 900},
  };
}

/** Validates executable configuration, including references and bounded execution. */
export function validateHarness(harness: HarnessConfig): void {
  if (!/^[a-zA-Z0-9_-]{1,80}$/.test(harness.id) || !harness.name.trim()) throw new Error("A harness needs a valid ID and a name.");
  if (harness.systemPrompt.length > 200000 || harness.agents.length > 64) throw new Error("Harness configuration is too large.");
  const names = new Set<string>();
  for (const agent of harness.agents) {
    if (!/^[a-zA-Z0-9_-]{1,80}$/.test(agent.name) || names.has(agent.name))
      throw new Error("Agent names must be unique and contain only letters, numbers, hyphens, or underscores.");
    names.add(agent.name);
    if (!agent.systemPrompt.trim() || agent.systemPrompt.length > 200000) throw new Error(`Agent ${agent.name} needs a system prompt (up to 200,000 characters).`);
    if (agent.tools.some((tool) => ["subagent", "harness_workflow", "lab_agent", "manage_lab_view"].includes(tool)))
      throw new Error("Specialists cannot recursively delegate or manage lab views.");
    if (agent.color && !/^#[0-9a-fA-F]{6}$/.test(agent.color)) throw new Error("Choose a valid agent color.");
  }
  if (harness.graph.steps.length > maxWorkflowSteps || harness.graph.steps.some((name) => !names.has(name)))
    throw new Error("A workflow supports up to 12 steps referencing defined agents.");
  if (harness.context.instructions.length > 200000) throw new Error("Additional context rules are too long (up to 200,000 characters).");
  const longestRole = Math.max(0, ...harness.agents.map((agent) => agent.systemPrompt.length));
  if (harness.systemPrompt.length + harness.context.instructions.length + longestRole > maxInstructionChars)
    throw new Error(`Shared instructions, context rules and the longest agent prompt together exceed ${maxInstructionChars.toLocaleString()} characters.`);
  validateWorkflows(harness.workflows ?? [], names);
  for (const [label, value, min, max] of [
    ["Max turns", harness.loop.maxTurns, 1, 100],
    ["Timeout", harness.loop.timeoutSeconds, 10, 3600],
    ["Reserved tokens", harness.context.reserveTokens, 1024, 100000],
    ["Recent tokens", harness.context.keepRecentTokens, 1024, 100000],
  ] as const) {
    if (!Number.isInteger(value) || value < min || value > max) throw new Error(`${label} must be an integer between ${min} and ${max}.`);
  }
  if (harness.context.files.length > 20) throw new Error("Choose at most 20 context files.");
  for (const execution of [harness.execution, ...harness.agents.map((agent) => agent.execution)]) {
    if (execution?.effort && !["off", "minimal", "low", "medium", "high", "xhigh", "max"].includes(execution.effort)) throw new Error("Unsupported reasoning effort.");
  }
}

/** Validates named workflows: references resolve, every read precedes its reader, and contracts are well formed. */
export function validateWorkflows(workflows: readonly HarnessWorkflow[], agentNames: ReadonlySet<string>): void {
  if (workflows.length > 12) throw new Error("A harness supports up to 12 workflows.");
  const workflowIds = new Set<string>();
  for (const workflow of workflows) {
    if (!identifier.test(workflow.id) || workflowIds.has(workflow.id)) throw new Error("Workflow IDs must be unique and contain only letters, numbers, hyphens, or underscores.");
    workflowIds.add(workflow.id);
    if (!workflow.name.trim()) throw new Error(`Workflow ${workflow.id} needs a name.`);
    if (workflow.steps.length < 1 || workflow.steps.length > maxWorkflowSteps) throw new Error(`Workflow ${workflow.name} needs between 1 and ${maxWorkflowSteps} steps.`);
    if (!Number.isInteger(workflow.limits.maxWallClockSeconds) || workflow.limits.maxWallClockSeconds < 10 || workflow.limits.maxWallClockSeconds > 86400)
      throw new Error(`Workflow ${workflow.name} wall-clock limit must be between 10 and 86,400 seconds.`);
    if (workflow.limits.maxCostUsd !== undefined && !(workflow.limits.maxCostUsd > 0 && workflow.limits.maxCostUsd <= 1000))
      throw new Error(`Workflow ${workflow.name} cost limit must be between 0 and 1,000 USD.`);
    const seen = new Set<string>();
    for (const step of workflow.steps) {
      if (!identifier.test(step.id) || seen.has(step.id)) throw new Error(`Workflow ${workflow.name} has a duplicate or invalid step ID.`);
      if (!agentNames.has(step.agent)) throw new Error(`Workflow ${workflow.name} step ${step.id} references an agent that is not defined.`);
      if (step.instructions.length > 20000) throw new Error(`Workflow ${workflow.name} step ${step.id} instructions are too long (up to 20,000 characters).`);
      // Sequential execution: a read is satisfiable only when its producer already ran on every path, which means it precedes the reader.
      for (const read of step.reads) if (!seen.has(read)) throw new Error(`Workflow ${workflow.name} step ${step.id} reads ${read}, which does not run before it.`);
      if (step.output.fields.length < 1 || step.output.fields.length > 20) throw new Error(`Workflow ${workflow.name} step ${step.id} needs between 1 and 20 output fields.`);
      const fields = new Set<string>();
      for (const field of step.output.fields) {
        if (!fieldName.test(field.name) || fields.has(field.name)) throw new Error(`Workflow ${workflow.name} step ${step.id} has a duplicate or invalid output field name.`);
        fields.add(field.name);
      }
      for (const [label, value, min, max] of [
        ["turn limit", step.limits?.maxTurns, 1, 100],
        ["timeout", step.limits?.timeoutSeconds, 10, 3600],
      ] as const) {
        if (value !== undefined && (!Number.isInteger(value) || value < min || value > max))
          throw new Error(`Workflow ${workflow.name} step ${step.id} ${label} must be an integer between ${min} and ${max}.`);
      }
      if (step.limits?.maxCostUsd !== undefined && !(step.limits.maxCostUsd > 0 && step.limits.maxCostUsd <= 1000))
        throw new Error(`Workflow ${workflow.name} step ${step.id} cost limit must be between 0 and 1,000 USD.`);
      if (step.execution?.effort && !["off", "minimal", "low", "medium", "high", "xhigh", "max"].includes(step.execution.effort))
        throw new Error(`Workflow ${workflow.name} step ${step.id} uses an unsupported reasoning effort.`);
      seen.add(step.id);
    }
  }
}

/** Resolves project overrides without mutating the shared harness. */
export function resolveHarnessProject(harness: HarnessConfig, project: HarnessProject, revision: number): HarnessSnapshot {
  if (project.color && !/^#[0-9a-fA-F]{6}$/.test(project.color)) throw new Error("Choose a valid project color.");
  if (project.order !== undefined && (!Number.isInteger(project.order) || project.order < 0)) throw new Error("Project order must be a non-negative integer.");
  const agents = new Map(harness.agents.map((agent) => [agent.name, agent]));
  for (const agent of project.agents) agents.set(agent.name, agent);
  const resolved = {
    ...harness,
    systemPrompt: [harness.systemPrompt, project.systemPrompt].filter(Boolean).join("\n\n"),
    execution: {...harness.execution, ...project.execution},
    enabledSkills: project.enabledSkills ?? harness.enabledSkills,
    agents: [...agents.values()],
    context: {...harness.context, instructions: [harness.context.instructions, project.contextInstructions].filter(Boolean).join("\n\n")},
  };
  validateHarness(resolved);
  return {revision, harness: resolved, project, sharedInstructions: harness.systemPrompt};
}
