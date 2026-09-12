import type {CurationEvidence, CurationTarget, HarnessConfig, HarnessProject} from "@supernova/contracts/harnesses/schemas";
import type {HarnessRunStore} from "@supernova/agent-runtime/layers/harnesses/internal/harness-run-store";
import {maxInstructionChars} from "@supernova/agent-runtime/layers/harnesses/lib/harness-config";
import {latestMemoryRecords, readMemoryEvents} from "@supernova/agent-runtime/layers/curator/lib/memory-ledger";
import {targetLabel} from "@supernova/agent-runtime/layers/curator/lib/curator-targets";
import {instructionVersionKey} from "@supernova/agent-runtime/layers/harnesses/internal/harness-store";

/** The ref a proposal cites when its evidence is the instruction text itself, as for a duplicate or a contradiction. */
export function instructionRef(target: CurationTarget): string {
  return `instructions:${instructionVersionKey(target)}`;
}

/** How much of one instruction piece the curator is shown. A proposal may only quote text it has actually seen. */
const maxShownChars = 60000;
/** Receipts, steers and records one read returns. The curator reads evidence, not a corpus. */
const maxRows = 50;
const maxLedgerRows = 200;

export interface InstructionPiece {
  readonly target: CurationTarget;
  /** What a proposal cites to use this text as evidence; the quote must then occur in the text. */
  readonly ref: string;
  readonly label: string;
  readonly chars: number;
  readonly text: string;
  readonly truncated?: boolean;
}

function piece(target: CurationTarget, text: string): InstructionPiece {
  return {
    target,
    ref: instructionRef(target),
    label: targetLabel(target),
    chars: text.length,
    text: text.slice(0, maxShownChars),
    ...(text.length > maxShownChars ? {truncated: true} : {}),
  };
}

/** The assembled size the configuration store caps: shared text, context rules and the longest role, per project. */
export function assembledInstructionChars(harness: HarnessConfig, projects: readonly HarnessProject[]): number {
  const sizes = (projects.length ? projects : [undefined]).map((project) => {
    const shared = harness.systemPrompt.length + (project?.systemPrompt.length ?? 0);
    const context = harness.context.instructions.length + (project?.contextInstructions.length ?? 0);
    const roles = new Map(harness.agents.map((agent) => [agent.name, agent.systemPrompt.length]));
    for (const agent of project?.agents ?? []) roles.set(agent.name, agent.systemPrompt.length);
    return shared + context + Math.max(0, ...roles.values());
  });
  return Math.max(0, ...sizes);
}

/** How full the instruction budget is. Above 80 the curator is told to propose only removals and merges. */
export function instructionBudgetPercent(harness: HarnessConfig, projects: readonly HarnessProject[]): number {
  return Math.round((assembledInstructionChars(harness, projects) / maxInstructionChars) * 100);
}

/** Every instruction layer in scope, with its size and the budget it shares. */
export function instructionReport(harness: HarnessConfig, projects: readonly HarnessProject[]) {
  const pieces = [piece({kind: "harness", harnessId: harness.id}, harness.systemPrompt), piece({kind: "context", harnessId: harness.id}, harness.context.instructions)];
  for (const agent of harness.agents) pieces.push(piece({kind: "role", harnessId: harness.id, agentName: agent.name}, agent.systemPrompt));
  for (const project of projects) {
    pieces.push(piece({kind: "project", harnessId: harness.id, projectId: project.id}, project.systemPrompt));
    for (const agent of project.agents) pieces.push(piece({kind: "role", harnessId: harness.id, projectId: project.id, agentName: agent.name}, agent.systemPrompt));
  }
  return {
    budget: {
      assembledChars: assembledInstructionChars(harness, projects),
      maxChars: maxInstructionChars,
      percent: instructionBudgetPercent(harness, projects),
    },
    planningDocuments: projects.map((project) => ({projectId: project.id, documents: project.planningDocuments ?? []})),
    pieces,
  };
}

export interface ReceiptRow {
  readonly ref: string;
  readonly chatId: string;
  readonly projectId: string;
  readonly agent: string;
  readonly status: string;
  readonly startedAt: string;
  readonly revision?: number;
  readonly failureKind?: string;
  readonly error?: string;
  readonly events?: readonly string[];
}

/** Receipts as evidence rows: what ran, under which instruction revision, and how it failed. */
export async function receiptReport(runs: HarnessRunStore, input: {projectId?: string; failedOnly?: boolean}): Promise<ReceiptRow[]> {
  const summaries = await runs.listRecentRuns({projectId: input.projectId, failedOnly: input.failedOnly, limit: maxRows});
  const failureKinds = new Map<string, Map<string, string>>();
  const rows: ReceiptRow[] = [];
  for (const summary of summaries) {
    if (!failureKinds.has(summary.chatId)) failureKinds.set(summary.chatId, await runs.workflowFailureKinds(summary.chatId).catch(() => new Map<string, string>()));
    const receipt = await runs.get(summary.chatId, summary.id).catch(() => undefined);
    const failureKind = failureKinds.get(summary.chatId)?.get(summary.id);
    rows.push({
      ref: summary.id,
      chatId: summary.chatId,
      projectId: summary.projectId,
      agent: summary.agentName,
      status: summary.status,
      startedAt: summary.startedAt,
      ...(receipt ? {revision: receipt.revision} : {}),
      ...(failureKind ? {failureKind} : {}),
      ...(receipt?.error ? {error: receipt.error.slice(0, 1000)} : {}),
      ...(receipt?.events.length ? {events: receipt.events.slice(-5).map((event) => `${event.at} ${event.message}`)} : {}),
    });
  }
  return rows;
}

/** Steers as evidence rows. The ref is what a proposal has to cite. */
export async function steerReport(runs: HarnessRunStore, project?: HarnessProject) {
  const steers = project ? await runs.listSteersForProject({id: project.id, path: project.path}) : [];
  return steers.slice(0, maxRows).map((steer) => ({ref: `${steer.chatId}@${steer.at}`, chatId: steer.chatId, at: steer.at, text: steer.text.slice(0, 2000)}));
}

/** The latest state of every memory record of a project, which is what duplicates and stale records show up in. */
export async function ledgerReport(project: HarnessProject, state?: string) {
  const records = [...latestMemoryRecords(await readMemoryEvents(project.path)).values()].map((item) => item.record);
  return records
    .filter((record) => !state || record.epistemicState === state)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .slice(0, maxLedgerRows)
    .map((record) => ({
      ref: record.recordId,
      kind: record.kind,
      state: record.epistemicState,
      statement: record.statement.slice(0, 2000),
      updatedAt: record.updatedAt,
      ...(record.supersededBy ? {supersededBy: record.supersededBy} : {}),
      evidence: record.evidence.slice(0, 10).map((item) => `${item.kind}:${item.ref}`),
    }));
}

export interface EvidenceIndex {
  readonly runs: ReadonlySet<string>;
  readonly steers: ReadonlySet<string>;
  readonly records: ReadonlySet<string>;
  readonly documents: ReadonlySet<string>;
  /** Instruction text by citation ref; a quote from it is evidence only if it actually occurs there. */
  readonly instructions: ReadonlyMap<string, string>;
}

/** Everything a proposal may cite. A ref outside this index is not evidence, whatever the curator says about it. */
export async function buildEvidenceIndex(input: {
  readonly harness?: HarnessConfig;
  readonly projects: readonly HarnessProject[];
  readonly runs: HarnessRunStore;
}): Promise<EvidenceIndex> {
  const runs = new Set<string>();
  const steers = new Set<string>();
  const records = new Set<string>();
  const documents = new Set<string>();
  const instructions = new Map<string, string>();
  if (input.harness) for (const item of instructionReport(input.harness, input.projects).pieces) instructions.set(item.ref, item.text);
  const projectIds = new Set(input.projects.map((project) => project.id));
  for (const run of await input.runs.listRecentRuns({limit: 1000})) {
    if (projectIds.has(run.projectId)) runs.add(run.id);
  }
  for (const project of input.projects) {
    for (const steer of await input.runs.listSteersForProject({id: project.id, path: project.path})) steers.add(`${steer.chatId}@${steer.at}`);
    for (const recordId of latestMemoryRecords(await readMemoryEvents(project.path)).keys()) records.add(recordId);
    for (const document of project.planningDocuments ?? []) documents.add(document);
  }
  return {runs, steers, records, documents, instructions};
}

/** The cited refs that do not resolve, so the curator is told which citation is not evidence. */
export function unresolvedEvidence(index: EvidenceIndex, evidence: readonly CurationEvidence[]): string[] {
  const pools: Record<CurationEvidence["kind"], ReadonlySet<string>> = {run: index.runs, steer: index.steers, record: index.records, document: index.documents};
  return evidence
    .filter((item) => {
      if (item.kind === "document" && item.ref.startsWith("instructions:")) {
        const text = index.instructions.get(item.ref);
        // Quoting instruction text is evidence of a duplicate or a contradiction only when the quote is really there.
        return text === undefined || !item.quote.trim() || !text.includes(item.quote.trim());
      }
      return !pools[item.kind].has(item.ref);
    })
    .map((item) => `${item.kind} ${item.ref}`);
}
