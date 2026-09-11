/** Top-level areas of harness configuration. One tab bar, one URL section per panel. */
export type HarnessTabId = "agents" | "resources" | "workflows" | "projects";

export type HarnessSectionId = "orchestrator" | "leads" | "specialists" | "memory" | "skills" | "tools" | "connectors" | "context" | "workflows" | "limits" | "projects";

export interface HarnessSection {
  id: HarnessSectionId;
  label: string;
  tab: HarnessTabId;
}

export interface HarnessTab {
  id: HarnessTabId;
  label: string;
  sections: readonly HarnessSection[];
}

function tab(id: HarnessTabId, label: string, sections: readonly [HarnessSectionId, string][]): HarnessTab {
  return {id, label, sections: sections.map(([sectionId, sectionLabel]) => ({id: sectionId, label: sectionLabel, tab: id}))};
}

export const harnessTabs: readonly HarnessTab[] = [
  tab("agents", "Agents", [
    ["orchestrator", "Main orchestrator"],
    ["leads", "Project leads"],
    ["specialists", "Specialists"],
    ["memory", "Memory"],
  ]),
  tab("resources", "Resources", [
    ["skills", "Skills"],
    ["tools", "Tools"],
    ["connectors", "Connectors"],
    ["context", "Context"],
  ]),
  tab("workflows", "Workflows", [
    ["workflows", "Workflows"],
    ["limits", "Run limits"],
  ]),
  tab("projects", "Projects", [["projects", "Projects"]]),
];

const harnessSections: readonly HarnessSection[] = harnessTabs.flatMap((item) => item.sections);

/** Section names links used before configuration moved into settings, so an old link still lands on the right panel. */
const legacySections: Record<string, HarnessSectionId> = {
  Chats: "orchestrator",
  Context: "context",
  Graph: "workflows",
  Memory: "memory",
  Overview: "orchestrator",
  Prompts: "orchestrator",
  "Run limits": "limits",
  Skills: "skills",
  Team: "specialists",
  Workflow: "workflows",
};

export const defaultHarnessSection: HarnessSectionId = "orchestrator";

/** Resolves a URL section to its panel and owning tab, falling back to the first panel for unknown values. */
export function resolveHarnessSection(section?: string): {section: HarnessSection; tab: HarnessTab} {
  const id = section && (legacySections[section] ?? section);
  const resolved = harnessSections.find((candidate) => candidate.id === id) ?? harnessSections[0]!;
  return {section: resolved, tab: harnessTabs.find((candidate) => candidate.id === resolved.tab)!};
}
