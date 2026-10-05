import type {HarnessAgent, HarnessSnapshot, HarnessWorkflow, WorkflowStep} from "@supernova/contracts/harnesses/schemas";

export const collaborationReadTools = ["read", "grep", "find", "ls", "web_fetch"] as const;
export const collaborationWorkflowId = "radian-collaboration";

/** Compiles bounded read-only collaboration to the existing, receipted workflow runner. */
export function compileCollaborationPreset(snapshot: HarnessSnapshot): HarnessSnapshot {
  const mode = snapshot.selection?.mode ?? "solo";
  if (mode === "solo") return snapshot;
  const roles = mode === "advisor" ? ["advisor"] : mode === "compare" ? ["proposal-a", "proposal-b"] : ["proposal-a", "proposal-b", "critic", "synthesizer"];
  const instructions: Record<string, string> = {
    advisor:
      "Give one independent evidence-based assessment. State your recommendation, strongest objection, assumptions, uncertainty, and a check that could change your conclusion.",
    "proposal-a": "Independently propose the simplest effective solution. State evidence, assumptions, tradeoffs and unresolved questions. You have not seen another candidate.",
    "proposal-b":
      "Independently explore an alternative solution and challenge likely assumptions. State evidence, tradeoffs and unresolved questions. You have not seen another candidate.",
    critic: "Compare both proposals. Identify unsupported claims, conflicts, and complementary parts. Keep disagreements explicit and require evidence for any resolution.",
    synthesizer:
      "Create a new document or plan from both proposals and the critique. Attribute each adopted contribution to proposal-a or proposal-b. Preserve unresolved disagreements. Do not fuse code changes or claim tests ran.",
  };
  const agents: HarnessAgent[] = roles.map((name) => ({
    name: `radian-${name}`,
    description: instructions[name]!,
    systemPrompt: instructions[name]!,
    tools: [...collaborationReadTools],
  }));
  const steps: WorkflowStep[] = roles.map((name) => ({
    id: name,
    agent: `radian-${name}`,
    instructions: instructions[name]!,
    reads: name === "critic" ? ["proposal-a", "proposal-b"] : name === "synthesizer" ? ["proposal-a", "proposal-b", "critic"] : [],
    effects: "none",
    output: {
      fields: [
        {name: "result", type: "string", required: true},
        {name: "evidence", type: "string[]", required: true},
        {name: "uncertainties", type: "string[]", required: true},
        ...(name === "synthesizer"
          ? [
              {name: "from_proposal_a", type: "string[]" as const, required: true, description: "Contributions adopted from proposal-a; empty if none."},
              {name: "from_proposal_b", type: "string[]" as const, required: true, description: "Contributions adopted from proposal-b; empty if none."},
              {name: "unresolved_conflicts", type: "string[]" as const, required: true},
            ]
          : []),
      ],
    },
    limits: {maxTurns: Math.min(snapshot.harness.loop.maxTurns, 6), timeoutSeconds: Math.min(snapshot.harness.loop.timeoutSeconds, 90), maxCostUsd: 0.75},
  }));
  const workflow: HarnessWorkflow = {
    id: collaborationWorkflowId,
    name: mode === "advisor" ? "Advisor" : mode === "compare" ? "Compare" : "Document Fuse",
    description: "Bounded read-only collaboration with independently recorded candidates and validated handoffs.",
    steps,
    maxParallel: 2,
    limits: {maxWallClockSeconds: 300, maxCostUsd: 3},
  };
  const leadRole = `Selected collaboration: ${workflow.name}. The runtime runs the fixed workflow before your answer. Use its recorded results as fallible evidence. ${mode === "compare" ? "Keep both alternatives separate for the user to compare." : mode === "fuse" ? "Present the synthesized document and its contribution lineage, with unresolved disagreements." : "Present the advisor's recommendation and objections."} This is a read-only turn. Return documents in the chat; switch to Solo for implementation. Do not claim worker findings are independently verified or start another team.`;
  return {
    ...snapshot,
    delegation: undefined,
    project: {...snapshot.project, orchestratorPrompt: leadRole, parentProjectId: undefined},
    harness: {
      ...snapshot.harness,
      agents,
      workflows: [workflow],
      graph: {steps: roles.map((name) => `radian-${name}`)},
      // These modes use core read tools only; imported extensions cannot enlarge their tool surface.
      extensions: [],
      execution: undefined,
      coordinatorProjectId: undefined,
      orchestratorPrompt: leadRole,
    },
  };
}
