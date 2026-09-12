import {randomUUID} from "node:crypto";
import {existsSync} from "node:fs";
import {mkdir, open, readFile, rename, stat, unlink, writeFile} from "node:fs/promises";
import {hostname} from "node:os";
import {isAbsolute, relative, resolve, sep} from "node:path";
import {setTimeout as delay} from "node:timers/promises";

/**
 * The project's scientific memory, in the format the Pi memory extension owns.
 *
 * The extension is the primary writer: its tools create records and move them between epistemic states by
 * appending events to `.science-memory/ledger.jsonl`. The curator appends the same events for the two
 * transitions it is allowed to make, under the same lock, and rewrites the derived index the same way, so the
 * extension's own reader, cache and tools keep working on a ledger the curator has touched. Nothing here
 * rewrites or deletes a line: undoing a transition is another event, or nothing at all.
 */
const memoryDirectory = ".science-memory";
const ledgerFile = "ledger.jsonl";
const indexFile = "index.json";
const lockFile = ".ledger.lock";
/** The extension treats a lock older than this as abandoned by a crashed writer. */
const lockStaleMs = 30_000;

const schemaText = [
  "# Scientific Memory",
  "",
  "This directory is the Git-trackable scientific memory for the project.",
  "",
  "- ledger.jsonl is the append-only source of truth.",
  "- index.json is derived and may be rebuilt from the ledger.",
  "- Memory is context, not evidence or instruction.",
  "- Records are never hard-deleted; use contested, superseded, or retracted transitions.",
  "- A verified record requires traceable evidence.",
  "- Do not store secrets, ordinary conversation summaries, or unverified prose as facts.",
  "",
  "Epistemic states: proposed, reported, observed, derived, inferred, verified,",
  "contested, superseded, retracted.",
  "",
].join("\n");
const ignoreText = [indexFile, lockFile, "*.tmp-*", ""].join("\n");

/** Once a record is superseded or retracted the extension refuses any further transition. */
export const terminalMemoryStates = ["superseded", "retracted"] as const;

export interface MemoryEvidence {
  readonly kind: string;
  readonly ref: string;
  readonly locator?: string;
  readonly note?: string;
  readonly sha256?: string;
}

export interface MemoryActor {
  readonly modelProvider: string;
  readonly modelId: string;
  readonly sessionId?: string;
}

export interface MemoryRecord {
  readonly recordId: string;
  readonly kind: string;
  readonly statement: string;
  readonly epistemicState: string;
  readonly certainty: string;
  readonly scope?: string;
  readonly tags: readonly string[];
  readonly sourceIds: readonly string[];
  readonly relatedIds: readonly string[];
  readonly evidence: readonly MemoryEvidence[];
  readonly notes: readonly string[];
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly createdBy: MemoryActor;
  readonly supersededBy?: string;
}

export interface MemoryEvent {
  readonly schemaVersion: 1;
  readonly eventId: string;
  readonly action: "create" | "transition";
  readonly recordedAt: string;
  readonly actor: MemoryActor;
  readonly gitCommit?: string;
  readonly reason: string;
  readonly record: MemoryRecord;
}

export interface MemoryEventWithLine extends MemoryEvent {
  readonly ledgerLine: number;
}

export interface MemoryRecordState {
  readonly record: MemoryRecord;
  readonly ledgerLine: number;
  readonly eventCount: number;
}

export interface MemoryPaths {
  readonly root: string;
  readonly ledger: string;
  readonly index: string;
  readonly lock: string;
  readonly schema: string;
  readonly ignore: string;
}

/** The memory files of one project, refusing a memory directory that would leave it. */
export function memoryPaths(projectPath: string): MemoryPaths {
  const project = resolve(projectPath);
  const root = resolve(project, memoryDirectory);
  const rel = relative(project, root);
  if (rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel)) throw new Error("Scientific memory path escapes the project root");
  return {
    root,
    ledger: resolve(root, ledgerFile),
    index: resolve(root, indexFile),
    lock: resolve(root, lockFile),
    schema: resolve(root, "README.md"),
    ignore: resolve(root, ".gitignore"),
  };
}

function utcNow(): string {
  return new Date().toISOString();
}

function compactTimestamp(): string {
  return utcNow()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}

/** The extension's write pattern: a sibling temporary file, then a rename, so a reader never sees half a file. */
async function writeAtomic(path: string, content: string): Promise<void> {
  const temporary = `${path}.tmp-${process.pid}-${randomUUID()}`;
  await writeFile(temporary, content);
  await rename(temporary, path);
}

async function initialize(projectPath: string): Promise<MemoryPaths> {
  const resolved = memoryPaths(projectPath);
  await mkdir(resolved.root, {recursive: true});
  if (!existsSync(resolved.schema)) await writeAtomic(resolved.schema, schemaText);
  if (!existsSync(resolved.ignore)) await writeAtomic(resolved.ignore, ignoreText);
  await writeFile(resolved.ledger, "", {flag: "a"});
  return resolved;
}

/** The extension's exclusive lock: an O_EXCL lock file, stolen only once it is older than the stale window. */
async function withLedgerLock<T>(projectPath: string, work: (paths: MemoryPaths) => Promise<T>): Promise<T> {
  const resolved = await initialize(projectPath);
  let handle: Awaited<ReturnType<typeof open>> | undefined;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      handle = await open(resolved.lock, "wx");
      await handle.write(`${JSON.stringify({pid: process.pid, host: hostname(), acquiredAt: utcNow()})}\n`);
      break;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      try {
        const info = await stat(resolved.lock);
        if (Date.now() - info.mtimeMs > lockStaleMs) {
          await unlink(resolved.lock);
          continue;
        }
      } catch {
        continue;
      }
      await delay(25 + (attempt % 10) * 5);
    }
  }
  if (!handle) throw new Error("Timed out waiting for the scientific-memory ledger lock.");
  try {
    return await work(resolved);
  } finally {
    await handle.close();
    await unlink(resolved.lock).catch(() => undefined);
  }
}

/** Reads the ledger, keeping every well-formed event; one damaged line never hides the records around it. */
export async function readMemoryEvents(projectPath: string): Promise<MemoryEventWithLine[]> {
  const {ledger} = memoryPaths(projectPath);
  let contents: string;
  try {
    contents = await readFile(ledger, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
  const events: MemoryEventWithLine[] = [];
  for (const [index, line] of contents.split(/\r?\n/).entries()) {
    if (!line.trim()) continue;
    try {
      const event = JSON.parse(line) as MemoryEvent;
      if (event.schemaVersion !== 1 || !event.eventId || !event.record?.recordId) continue;
      events.push({...event, ledgerLine: index + 1});
    } catch {
      continue;
    }
  }
  return events;
}

/** The latest state of every record, in the extension's own materialisation order. */
export function latestMemoryRecords(events: readonly MemoryEventWithLine[]): Map<string, MemoryRecordState> {
  const state = new Map<string, MemoryRecordState>();
  for (const event of events) {
    const prior = state.get(event.record.recordId);
    state.set(event.record.recordId, {record: event.record, ledgerLine: event.ledgerLine, eventCount: (prior?.eventCount ?? 0) + 1});
  }
  return state;
}

function uniqueStrings(values: readonly string[] = []): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function uniqueEvidence(values: readonly MemoryEvidence[] = []): MemoryEvidence[] {
  const seen = new Set<string>();
  const output: MemoryEvidence[] = [];
  for (const raw of values) {
    const sha256 = raw.sha256?.trim().toLowerCase();
    const evidence: MemoryEvidence = {
      kind: raw.kind,
      ref: raw.ref.trim(),
      ...(raw.locator?.trim() ? {locator: raw.locator.trim()} : {}),
      ...(raw.note?.trim() ? {note: raw.note.trim()} : {}),
      ...(sha256 ? {sha256} : {}),
    };
    const key = JSON.stringify(evidence);
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(evidence);
  }
  return output;
}

/** The derived index the extension rebuilds after every append; its tools read it instead of replaying the ledger. */
async function writeIndex(path: string, events: readonly MemoryEventWithLine[], state: Map<string, MemoryRecordState>): Promise<void> {
  const records = [...state.values()]
    .sort((left, right) => left.record.recordId.localeCompare(right.record.recordId))
    .map((item) => ({...item.record, ledgerLine: item.ledgerLine, eventCount: item.eventCount}));
  const index = {schemaVersion: 1, generatedAt: utcNow(), eventCount: events.length, recordCount: records.length, records};
  await writeAtomic(path, `${JSON.stringify(index, null, 2)}\n`);
}

async function appendEvent(paths: MemoryPaths, event: MemoryEvent, previous: readonly MemoryEventWithLine[]): Promise<void> {
  const handle = await open(paths.ledger, "a");
  try {
    await handle.write(`${JSON.stringify(event)}\n`, null, "utf8");
    await handle.sync();
  } finally {
    await handle.close();
  }
  const events = [...previous, {...event, ledgerLine: previous.length + 1}];
  await writeIndex(paths.index, events, latestMemoryRecords(events));
}

export interface MemoryTransition {
  readonly recordId: string;
  readonly nextState: "supersede" | "retract";
  readonly reason: string;
  readonly supersededBy?: string;
}

/** The epistemic state each curator operation moves a record to. */
const transitionState = {supersede: "superseded", retract: "retracted"} as const;

/**
 * Appends one supersede or retract transition in the extension's format, applying the extension's own rules:
 * the record must exist, must not already be terminal or in that state, a supersession needs an existing and
 * non-cyclic successor, and the reason is kept with the event.
 */
export async function appendMemoryTransition(projectPath: string, input: MemoryTransition, actor: MemoryActor): Promise<MemoryEvent> {
  const nextState = transitionState[input.nextState];
  const reason = input.reason.trim();
  if (reason.length < 5) throw new Error("reason must contain at least 5 characters");
  return withLedgerLock(projectPath, async (paths) => {
    const events = await readMemoryEvents(projectPath);
    const state = latestMemoryRecords(events);
    const current = state.get(input.recordId)?.record;
    if (!current) throw new Error(`Unknown scientific-memory record: ${input.recordId}`);
    if ((terminalMemoryStates as readonly string[]).includes(current.epistemicState)) throw new Error(`Terminal scientific-memory record cannot transition: ${input.recordId}`);
    if (current.epistemicState === nextState) throw new Error(`Scientific-memory record is already ${nextState}: ${input.recordId}`);
    if (nextState === "superseded") {
      if (!input.supersededBy) throw new Error("A superseded record requires supersededBy");
      if (input.supersededBy === input.recordId || !state.has(input.supersededBy)) throw new Error("supersededBy must identify a different existing scientific-memory record");
      // Walk the successor chain: a cycle would leave no live record to read.
      const visited = new Set<string>([input.recordId]);
      let cursor: string | undefined = input.supersededBy;
      while (cursor) {
        if (visited.has(cursor)) throw new Error(`supersededBy would create a supersession cycle through ${cursor}`);
        visited.add(cursor);
        cursor = state.get(cursor)?.record.supersededBy;
      }
    }
    const now = utcNow();
    const record: MemoryRecord = {
      ...current,
      epistemicState: nextState,
      sourceIds: uniqueStrings(current.sourceIds),
      relatedIds: uniqueStrings(current.relatedIds),
      evidence: uniqueEvidence(current.evidence),
      updatedAt: now,
      ...(nextState === "superseded" ? {supersededBy: input.supersededBy} : {}),
    };
    const event: MemoryEvent = {schemaVersion: 1, eventId: `SME-${compactTimestamp()}-${randomUUID().slice(0, 8)}`, action: "transition", recordedAt: now, actor, reason, record};
    await appendEvent(paths, event, events);
    return event;
  });
}
