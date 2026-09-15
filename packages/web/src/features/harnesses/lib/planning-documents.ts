/** Documents a project can create in one click, because almost every long-running project wants them. */
export const quickPlanningDocuments = ["PLAN.md", "GOALS.md", "ROADMAP.md"] as const;

const conflictPattern = /conflict|changed|modified|stale|newer/i;

const templates: Record<string, string> = {
  PLAN: "# Plan\n\n## Where this project is going\n\n## Current phase\n\n## Next steps\n\n## Open decisions\n",
  GOALS: "# Goals\n\n## Outcome\n\n## Success criteria\n\n## Out of scope\n",
  ROADMAP: "# Roadmap\n\n## Now\n\n## Next\n\n## Later\n",
};

/** Starting text for a document that does not exist on disk yet, so the first save creates something agents can use. */
export function planningDocumentTemplate(path: string): string {
  const name = (path.split("/").pop() ?? path).replace(/\.md$/i, "");
  return templates[name.toUpperCase()] ?? `# ${name}\n\n`;
}

interface PlanningDocumentWriteInput {
  projectPath: string;
  path: string;
  content: string;
  /** The document as it was loaded, or undefined when it does not exist on disk yet. */
  loaded?: {modifiedAt: string};
}

interface PlanningDocumentWrite {
  projectPath: string;
  path: string;
  content: string;
  expectedModifiedAt?: string;
}

/** Project-relative Markdown path: no leading slash, no `./`, always a `.md` file. */
export function normalizePlanningPath(input: string): string {
  const trimmed = input.trim().replace(/^\.?\/+/, "");
  if (!trimmed) return "";
  return /\.md$/i.test(trimmed) ? trimmed : `${trimmed}.md`;
}

/** Appends a document unless the path is unusable or already listed. Order is the order agents read them in. */
export function addPlanningDocument(documents: readonly string[], path: string): readonly string[] {
  const normalized = normalizePlanningPath(path);
  if (!normalized || documents.includes(normalized)) return documents;
  return [...documents, normalized];
}

/** The write payload. The loaded modification time travels back so the server can refuse a stale overwrite. */
export function planningDocumentWrite(input: PlanningDocumentWriteInput): PlanningDocumentWrite {
  const {projectPath, path, content, loaded} = input;
  return {projectPath, path: normalizePlanningPath(path), content, expectedModifiedAt: loaded?.modifiedAt};
}

/** True when a refused write was refused because the document changed after the editor loaded it. */
export function isPlanningDocumentConflict(error: unknown, expectedModifiedAt?: string): boolean {
  if (!error || !expectedModifiedAt) return false;
  const message = typeof error === "object" && error !== null && "message" in error ? String((error as {message: unknown}).message) : String(error);
  return conflictPattern.test(message);
}
