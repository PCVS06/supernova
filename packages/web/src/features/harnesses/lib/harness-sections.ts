/** The pages of one harness. The settings sidebar is the tree; a page carries at most one tab row. */
export type HarnessPageId = "overview" | "instructions" | "agents" | "skills" | "workflows" | "projects" | "curator";

export interface HarnessPage {
  id: HarnessPageId;
  label: string;
}

export const harnessPages: readonly HarnessPage[] = [
  {id: "overview", label: "Overview"},
  {id: "instructions", label: "Instructions"},
  {id: "agents", label: "Agents"},
  {id: "skills", label: "Skills & tools"},
  {id: "workflows", label: "Workflows"},
  {id: "projects", label: "Projects"},
  {id: "curator", label: "Curator"},
];

export const defaultHarnessPage: HarnessPageId = "overview";

/** The coordinating role in the Agents list. Specialists are addressed by their own name. */
export const mainOrchestratorAgent = "main";

/** Scope of a harness page, always visible in the URL. */
export interface HarnessPageSearch {
  agent?: string;
  project?: string;
  workflow?: string;
}

/** Every `?section=` value and every tab used before the tree existed, mapped to the page that owns it now. */
const legacyPages: Record<string, HarnessPageId> = {
  Chats: "agents",
  Context: "instructions",
  Graph: "workflows",
  Memory: "projects",
  Overview: "overview",
  Prompts: "instructions",
  "Run limits": "overview",
  Skills: "skills",
  Team: "agents",
  Workflow: "workflows",
  agents: "agents",
  connectors: "skills",
  context: "instructions",
  curator: "curator",
  leads: "projects",
  limits: "overview",
  memory: "projects",
  orchestrator: "agents",
  projects: "projects",
  resources: "skills",
  skills: "skills",
  specialists: "agents",
  tools: "skills",
  workflows: "workflows",
};

/** Old values that opened the inbox, which now lives outside settings. */
const legacyInbox = new Set(["inbox"]);

/** Old values that named the coordinating role rather than a specialist. */
const legacyMainOrchestrator = new Set(["Chats", "orchestrator"]);

/** Resolves a page id from the URL, falling back to the first page for unknown values. */
export function resolveHarnessPage(page?: string): HarnessPage {
  return harnessPages.find((candidate) => candidate.id === page) ?? harnessPages[0]!;
}

export function harnessPageLabel(page: HarnessPageId): string {
  return resolveHarnessPage(page).label;
}

export interface LegacyHarnessRoute {
  /** The settings page that owns the old URL. */
  page: HarnessPageId;
  search: HarnessPageSearch;
  /** The inbox left settings, so these links go to the home layout instead of to a page. */
  inbox?: true;
}

/** Maps one old harness URL onto the page and search that replaced it. */
export function legacyHarnessRoute(legacy: {section?: string; projectId?: string; agentName?: string}): LegacyHarnessRoute {
  if (legacy.section && legacyInbox.has(legacy.section)) return {page: defaultHarnessPage, search: {}, inbox: true};
  const page = (legacy.section ? legacyPages[legacy.section] : undefined) ?? defaultHarnessPage;
  const agent = legacy.agentName ?? (legacy.section && legacyMainOrchestrator.has(legacy.section) ? mainOrchestratorAgent : undefined);
  const search: HarnessPageSearch = {};
  if (page === "agents" && agent) search.agent = agent;
  if (page === "projects" && legacy.projectId) search.project = legacy.projectId;
  return {page, search};
}
