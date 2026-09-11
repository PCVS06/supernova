import type {HarnessAgent, HarnessPromptLayer, HarnessSnapshot} from "@supernova/contracts/harnesses/schemas";

/** Preserves the exact shared/project split for previously captured combined prompts. */
function sharedInstructions(snapshot: HarnessSnapshot): string {
  if (snapshot.sharedInstructions !== undefined) return snapshot.sharedInstructions;
  const combined = snapshot.harness.systemPrompt;
  const project = snapshot.project.systemPrompt;
  if (!project) return combined;
  if (combined === project) return "";
  const suffix = "\n\n" + project;
  return combined.endsWith(suffix) ? combined.slice(0, -suffix.length) : combined;
}

/** Explains who owns each instruction layer using the same text the runtime loads. */
export function harnessPromptLayers(snapshot: HarnessSnapshot, agent?: Pick<HarnessAgent, "name" | "systemPrompt">): HarnessPromptLayer[] {
  const {harness, project} = snapshot;
  const head = project.id === harness.coordinatorProjectId;
  const role =
    agent?.systemPrompt ??
    project.orchestratorPrompt ??
    (head
      ? (harness.orchestratorPrompt ?? "Coordinate research across the labs in Science Space. Delegate lab tasks explicitly; do not bypass approval gates.")
      : project.parentProjectId
        ? "Lead this project's chats. Carry out work, delegate bounded tasks to specialists, review their results, and report to Science Space. You own this lab, not other labs."
        : (harness.orchestratorPrompt ?? "Lead this project's work and review any delegated results."));
  return [
    {kind: "shared", label: harness.id === "science" ? "Science Space instructions" : "Shared harness instructions", owner: harness.name, content: sharedInstructions(snapshot)},
    {kind: "project", label: "Project instructions", owner: project.name, content: project.systemPrompt},
    {kind: "role", label: "Agent role", owner: agent?.name ?? (head ? "Science Space lead" : "Project lead"), content: role},
    ...(harness.context.instructions ? [{kind: "context" as const, label: "Additional context rules", owner: project.name, content: harness.context.instructions}] : []),
  ];
}
