import type {IconName} from "@/components/ui/icon";

/** The pages of one harness. The settings sidebar lists them flat; a page carries at most one tab row. */
export type HarnessPageId = "overview" | "instructions" | "agents" | "skills" | "workflows" | "projects" | "curator";

export interface HarnessPage {
  id: HarnessPageId;
  label: string;
  icon: IconName;
  /** One sentence under the page title, in the words of someone using the harness. */
  description: string;
}

export const harnessPages: readonly HarnessPage[] = [
  {id: "overview", label: "General", icon: "sliders", description: "What this harness is, which model it uses, and which project coordinates the others."},
  {id: "instructions", label: "Instructions", icon: "file", description: "What every agent of this harness is told before a chat starts."},
  {id: "agents", label: "Agents", icon: "user", description: "Specialists a project's lead can hand bounded tasks to."},
  {id: "skills", label: "Skills & tools", icon: "skill", description: "What the agents of this harness may use."},
  {id: "workflows", label: "Workflows", icon: "workflow", description: "Multi-step procedures a lead runs when you ask for them by name."},
  {id: "projects", label: "Projects", icon: "folder", description: "The folders this harness works in. Each has its own instructions, lead, plan and memory."},
  {id: "curator", label: "Curator", icon: "shield", description: "A background reviewer that proposes fixes to instructions, plans and memory."},
];

export const defaultHarnessPage: HarnessPageId = "overview";

/** Scope of a harness page, always visible in the URL. A collection page without a scope shows its list. */
export interface HarnessPageSearch {
  agent?: string;
  project?: string;
  workflow?: string;
}

/** Every `?section=` value and every tab used before the tree existed, mapped to the page that owns it now. */
const legacyPages: Record<string, HarnessPageId> = {
  // The coordinating role has no agent entry any more; its prompt lives with the other instructions.
  Chats: "instructions",
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
  orchestrator: "instructions",
  projects: "projects",
  resources: "skills",
  skills: "skills",
  specialists: "agents",
  tools: "skills",
  workflows: "workflows",
};

/** Old values that opened the inbox, which now lives outside settings. */
const legacyInbox = new Set(["inbox"]);

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
  const search: HarnessPageSearch = {};
  if (page === "agents" && legacy.agentName) search.agent = legacy.agentName;
  if (page === "projects" && legacy.projectId) search.project = legacy.projectId;
  return {page, search};
}
