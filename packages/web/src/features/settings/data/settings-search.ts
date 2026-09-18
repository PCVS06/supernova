import type {HarnessConfig, HarnessProject} from "@supernova/contracts/harnesses/schemas";
import {agentLabel} from "@/features/harnesses/lib/agent-identity";
import {harnessPages} from "@/features/harnesses/lib/harness-sections";
import type {HarnessPageId, HarnessPageSearch} from "@/features/harnesses/lib/harness-sections";
import {settingsAppPages} from "@/features/settings/data/settings-tree";
import type {SettingsSectionId} from "@/features/settings/data/settings-tree";

export type SettingsSearchTarget = {kind: "app"; sectionId: SettingsSectionId} | {kind: "harness"; page: HarnessPageId; search?: HarnessPageSearch};

export interface SettingsSearchEntry {
  /** The setting or entry as it is named on its page. */
  label: string;
  /** The page it is found on. */
  where: string;
  /** Other words someone might type for it. */
  keywords?: string;
  target: SettingsSearchTarget;
}

const app = (sectionId: SettingsSectionId, label: string, keywords?: string): SettingsSearchEntry => ({
  label,
  where: settingsAppPages.find((page) => page.id === sectionId)!.label,
  keywords,
  target: {kind: "app", sectionId},
});

const harness = (page: HarnessPageId, label: string, keywords?: string): SettingsSearchEntry => ({
  label,
  where: harnessPages.find((candidate) => candidate.id === page)!.label,
  keywords,
  target: {kind: "harness", page},
});

/** Every setting by the name on its page. Kept beside the tree so a moved field is corrected in one place. */
export const settingsSearchIndex: readonly SettingsSearchEntry[] = [
  app("general", "Capture workspace checkpoints", "git snapshot restore undo"),
  app("general", "Ask before discarding changes", "checkpoint confirm"),
  app("general", "Orbital motion", "animation planets"),
  app("general", "Orbit detail", "density compact"),
  app("general", "Detailed sidebar activity", "counts roles"),
  app("appearance", "Color palette", "theme"),
  app("appearance", "Color mode", "dark light system theme"),
  app("appearance", "UI font", "typography typeface"),
  app("appearance", "Code font", "monospace typography"),
  app("appearance", "Font smoothing", "antialiasing"),
  app("appearance", "White glow", "light"),
  app("appearance", "Mathematical motion", "animation reduce"),
  app("appearance", "Translucent sidebar", "glass vibrancy"),
  app("providers", "AI providers", "model login connect openai anthropic openrouter account sign in"),
  app("providers", "Tool keys", "api key credentials connector secret token search"),
  app("about", "Version", "release"),
  app("about", "Updates", "upgrade download install channel nightly"),
  app("about", "Server endpoint", "api url connection"),
  app("about", "Data folder", "storage chats location"),
  app("harnesses", "Create a harness", "new add"),
  app("harnesses", "Import Science Pi", "science import"),
  harness("overview", "Harness name", "rename title"),
  harness("overview", "Description"),
  harness("overview", "Default model", "llm provider"),
  harness("overview", "Reasoning effort", "thinking level"),
  harness("overview", "Coordinating project", "orchestrator head lead"),
  harness("overview", "Maximum turns", "run limits loop"),
  harness("overview", "Timeout", "run limits seconds"),
  harness("instructions", "Shared instructions", "system prompt manual rules"),
  harness("instructions", "Lead role", "orchestrator coordination prompt"),
  harness("instructions", "Context rules", "context instructions"),
  harness("instructions", "Context files", "paths documents"),
  harness("instructions", "Include project AGENTS.md", "agents.md claude.md"),
  harness("instructions", "Automatic compaction", "summarize context window"),
  harness("instructions", "Reserved tokens", "context budget"),
  harness("instructions", "Recent tokens to keep", "context budget"),
  harness("agents", "Agents", "specialists add agent team"),
  harness("skills", "Skills", "enable disable capability"),
  harness("skills", "Registered tools", "extensions mcp"),
  harness("workflows", "Workflows", "steps graph pipeline"),
  harness("projects", "Projects", "folder plan memory lead"),
  harness("curator", "Curator", "review background proposals"),
  harness("curator", "Review now", "curator run"),
  harness("curator", "Auto-apply", "memory hygiene plan log"),
  harness("curator", "Daily sweep", "schedule time"),
  harness("curator", "Quiet hours", "schedule"),
  harness("curator", "Spend limits", "cost usd budget"),
];

/** The agents, projects and workflows of the open harness, so a name typed into search opens its page. */
export function harnessEntrySearchIndex(harnessConfig: HarnessConfig | undefined, projects: readonly HarnessProject[]): SettingsSearchEntry[] {
  if (!harnessConfig) return [];
  return [
    ...harnessConfig.agents.map((agent) => ({
      label: agentLabel(agent.name),
      where: "Agents",
      keywords: `${agent.name} ${agent.description}`,
      target: {kind: "harness" as const, page: "agents" as const, search: {agent: agent.name}},
    })),
    ...projects.map((project) => ({
      label: agentLabel(project.name),
      where: "Projects",
      keywords: project.path,
      target: {kind: "harness" as const, page: "projects" as const, search: {project: project.id}},
    })),
    ...(harnessConfig.workflows ?? []).map((workflow) => ({
      label: workflow.name,
      where: "Workflows",
      keywords: workflow.description,
      target: {kind: "harness" as const, page: "workflows" as const, search: {workflow: workflow.id}},
    })),
  ];
}

/** Entries whose name, page or keywords contain every word of the query, best name match first. */
export function searchSettings(entries: readonly SettingsSearchEntry[], query: string, limit = 12): SettingsSearchEntry[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const phrase = words.join(" ");
  // A hit in the name outranks a hit in the page name or the keywords.
  const rank = (entry: SettingsSearchEntry): number => {
    const label = entry.label.toLowerCase();
    return label.startsWith(phrase) ? 3 : label.includes(phrase) ? 2 : words.every((word) => label.includes(word)) ? 1 : 0;
  };
  return entries
    .filter((entry) => {
      const haystack = `${entry.label} ${entry.where} ${entry.keywords ?? ""}`.toLowerCase();
      return words.every((word) => haystack.includes(word));
    })
    .toSorted((a, b) => rank(b) - rank(a))
    .slice(0, limit);
}
