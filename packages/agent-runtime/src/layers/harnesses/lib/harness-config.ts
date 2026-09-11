import type {HarnessConfig, HarnessLibrary, HarnessProject, HarnessSnapshot} from "@supernova/contracts/harnesses/schemas";

/** Adds the existing Science workspace's explicit head/lab relationship without changing imported prompts. */
export function normalizeHarnessHierarchy(library: HarnessLibrary): HarnessLibrary {
  const harnesses = library.harnesses.map((harness) => {
    const coordinatorProjectId =
      harness.coordinatorProjectId ?? library.projects.find((project) => project.harnessId === harness.id && project.path === harness.source?.rootPath)?.id;
    return {
      ...harness,
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
  if (harness.graph.steps.length > 12 || harness.graph.steps.some((name) => !names.has(name))) throw new Error("A workflow supports up to 12 steps referencing defined agents.");
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
