import {Effect} from "effect";
import type {HarnessLibrary, HarnessProject} from "@supernova/contracts/harnesses/schemas";
import {readFolderFile} from "@supernova/agent-runtime/layers/folders/operations/read-folder-file";
import {writeFolderFile} from "@supernova/agent-runtime/layers/folders/operations/write-folder-file";
import type {HarnessStore} from "@supernova/agent-runtime/layers/harnesses/internal/harness-store";

/** The heading the curator owns in a planning document. Everything above and below it is the user's text. */
export const curatorLogHeading = "## Curator log";
/** The document the curator creates when a project has no plan of its own to write into. */
export const curatorLogDocument = "CURATOR.md";
const maxLineChars = 200;

function failure(error: unknown, fallback: string): Error {
  return new Error(error instanceof Error && error.message ? error.message : fallback);
}

/** One dated entry. The separator makes a curator line recognisable in a document the user also edits. */
export function curatorLogEntry(line: string, at = new Date()): string {
  const text = line.trim();
  if (!text || text.length > maxLineChars) throw new Error(`A log line needs between 1 and ${maxLineChars} characters.`);
  if (/[\r\n]/.test(text)) throw new Error("A log line is a single line.");
  return `- ${at.toISOString().slice(0, 10)} · ${text}`;
}

function isHeading(line: string): boolean {
  return /^#{1,2}\s/.test(line);
}

/** Puts the entry at the end of the curator log section, creating that section at the end of the document. */
export function withLogEntry(contents: string, entry: string): string {
  const lines = contents.split("\n");
  const heading = lines.findIndex((line) => line.trim().toLowerCase() === curatorLogHeading.toLowerCase());
  if (heading < 0) {
    const body = contents.replace(/\s+$/, "");
    return `${body ? `${body}\n\n` : ""}${curatorLogHeading}\n\n${entry}\n`;
  }
  let end = lines.length;
  for (let index = heading + 1; index < lines.length; index += 1) {
    if (isHeading(lines[index] ?? "")) {
      end = index;
      break;
    }
  }
  const section = lines.slice(heading + 1, end);
  while (section.length && !section[section.length - 1]!.trim()) section.pop();
  const rest = lines.slice(end);
  const tail = rest.length ? ["", ...rest] : [""];
  return [...lines.slice(0, heading + 1), ...section, entry, ...tail].join("\n");
}

/** Removes one entry the curator appended, by its exact text or, if the date was edited, by its line. */
export function withoutLogEntry(contents: string, entry: string): string | undefined {
  const lines = contents.split("\n");
  const exact = lines.indexOf(entry);
  const suffix = entry.slice(entry.indexOf("·"));
  const index = exact >= 0 ? exact : lines.findIndex((line) => line.startsWith("- ") && line.endsWith(suffix));
  if (index < 0) return undefined;
  return [...lines.slice(0, index), ...lines.slice(index + 1)].join("\n");
}

async function readDocument(projectPath: string, path: string): Promise<{contents: string; modifiedAt?: string}> {
  try {
    const file = await Effect.runPromise(readFolderFile(projectPath, path));
    if (file.binary || file.truncated) throw new Error("This planning document cannot be curated as text.");
    return {contents: file.content, modifiedAt: file.modifiedAt};
  } catch (error) {
    // A configured plan that is gone is written fresh rather than failing the log.
    if ((error as {cause?: NodeJS.ErrnoException}).cause?.code === "ENOENT") return {contents: ""};
    throw failure(error, "Could not read the planning document.");
  }
}

async function writeDocument(projectPath: string, path: string, contents: string, modifiedAt?: string): Promise<void> {
  try {
    await Effect.runPromise(writeFolderFile(projectPath, path, contents, modifiedAt));
  } catch (error) {
    throw failure(error, "Could not write the planning document.");
  }
}

export interface CuratorLogResult {
  readonly path: string;
  readonly entry: string;
  readonly library: HarnessLibrary;
}

/**
 * Appends one dated line to the project's plan log: the first planning document, or a `CURATOR.md` the curator
 * creates and registers when the project has no plan at all. The write refuses a document that changed on disk
 * since it was read, so the user's own edit is never overwritten.
 */
export async function appendCuratorLog(input: {
  readonly store: HarnessStore;
  readonly library: HarnessLibrary;
  readonly project: HarnessProject;
  readonly line: string;
  readonly at?: Date;
}): Promise<CuratorLogResult> {
  const entry = curatorLogEntry(input.line, input.at);
  const documents = input.project.planningDocuments ?? [];
  const path = documents[0] ?? curatorLogDocument;
  const {contents, modifiedAt} = await readDocument(input.project.path, path);
  await writeDocument(input.project.path, path, withLogEntry(contents, entry), modifiedAt);
  if (documents.length) return {path, entry, library: input.library};
  // The plan log only reaches agents once the document is part of the project's instructions.
  const library = await input.store.saveProject({...input.project, planningDocuments: [path]}, input.library.revision);
  return {path, entry, library};
}

/** Takes one appended line back out of the plan log. */
export async function removeCuratorLog(input: {readonly project: HarnessProject; readonly path: string; readonly entry: string}): Promise<void> {
  const {contents, modifiedAt} = await readDocument(input.project.path, input.path);
  const next = withoutLogEntry(contents, input.entry);
  if (next === undefined) throw new Error("That log line is no longer in the planning document; nothing was changed.");
  await writeDocument(input.project.path, input.path, next, modifiedAt);
}
