export const agentColors = ["#7dd3fc", "#a5b4fc", "#c4b5fd", "#f0abfc", "#f9a8d4", "#fda4af", "#fdba74", "#fcd34d", "#d9f99d", "#86efac", "#6ee7b7", "#5eead4", "#67e8f9"] as const;
/** One role-to-symbol mapping shared by navigation, portraits, and activity. */
export const agentMarks = {
  lead: {constant: "phi", label: "Project lead"},
  specialist: {constant: "e", label: "Specialist worker"},
  orchestrator: {constant: "tau", label: "Lead orchestrator"},
  curator: {constant: "i", label: "Curator"},
} as const;

const scienceRoles = [
  "academic-editor",
  "data-steward",
  "falsification-reviewer",
  "literature-scout",
  "methodologist",
  "quantitative-analyst",
  "reproducibility-auditor",
  "research-architect",
  "scientific-synthesizer",
  "screening-assistant",
  "source-verifier",
  "statistician",
  "supervisor-review",
];

/** Stable identity across the team editor, sidebar, workflow, and chat tools. */
export function agentColor(name: string, color?: string): string {
  if (color) return color;
  const roleIndex = scienceRoles.indexOf(name);
  if (roleIndex !== -1) return agentColors[roleIndex]!;
  let hash = 0;
  for (const character of name) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return agentColors[hash % agentColors.length]!;
}

/** Human-readable role name; the exact identifier stays in tooltips and configuration. */
export function agentLabel(name: string): string {
  const label = name.replace(/-Lab$/, "").replace(/[-_]/g, " ");
  return label.charAt(0).toUpperCase() + label.slice(1);
}
