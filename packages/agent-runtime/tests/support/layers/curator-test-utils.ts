import {randomUUID} from "node:crypto";
import {mkdir, mkdtemp, realpath, rm, writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import type {CuratorAutoApply, HarnessRun} from "@supernova/contracts/harnesses/schemas";
import {HarnessRunStore} from "@supernova/agent-runtime/layers/harnesses/internal/harness-run-store";
import {HarnessStore} from "@supernova/agent-runtime/layers/harnesses/internal/harness-store";
import {createDefaultHarness, defaultCuratorConfig} from "@supernova/agent-runtime/layers/harnesses/lib/harness-config";
import {CuratorStore} from "@supernova/agent-runtime/layers/curator/curator-store";

export interface CuratorFixtureOptions {
  readonly autoApply?: Partial<CuratorAutoApply>;
  readonly planningDocuments?: readonly string[];
  readonly harnessPrompt?: string;
  readonly projectPrompt?: string;
  readonly agents?: {name: string; description: string; systemPrompt: string; tools: string[]}[];
}

export interface CuratorFixture {
  readonly root: string;
  readonly projectPath: string;
  readonly projectId: string;
  readonly harnessId: string;
  readonly store: HarnessStore;
  readonly runs: HarnessRunStore;
  readonly curation: CuratorStore;
  readonly cleanup: () => Promise<void>;
}

/** A harness with one project folder, a curator switched on, and the three stores the curator writes through. */
export async function createCuratorFixture(options: CuratorFixtureOptions = {}): Promise<CuratorFixture> {
  const root = await mkdtemp(join(tmpdir(), "pi-plus-curator-test-"));
  const config = join(root, "config");
  await mkdir(join(root, "project"), {recursive: true});
  // The configuration store canonicalises project folders, so the fixture hands out the same canonical path.
  const projectPath = await realpath(join(root, "project"));
  const store = new HarnessStore(config);
  const runs = new HarnessRunStore(
    join(config, "runs"),
    () => true,
    (chatId) => store.projectOfSession(chatId)
  );
  const curation = new CuratorStore(join(config, "curation"));
  await store.save(
    {
      ...createDefaultHarness(),
      systemPrompt: options.harnessPrompt ?? "Always cite the source.\nNever cite the source.",
      agents: options.agents ?? [],
      curator: {...defaultCuratorConfig(), enabled: true, autoApply: {memory: false, planningLog: false, ...options.autoApply}},
    },
    0
  );
  await store.saveProject(
    {
      id: "project-a",
      harnessId: "coding",
      name: "Project A",
      path: projectPath,
      systemPrompt: options.projectPrompt ?? "This project studies fermentation.",
      contextInstructions: "",
      agents: [],
      ...(options.planningDocuments ? {planningDocuments: [...options.planningDocuments]} : {}),
    },
    1
  );
  return {
    root,
    projectPath,
    projectId: "project-a",
    harnessId: "coding",
    store,
    runs,
    curation,
    cleanup: () => rm(root, {recursive: true, force: true}),
  };
}

/** A receipt the curator can cite, written exactly the way a delegated run writes one. */
export async function writeReceipt(
  runs: HarnessRunStore,
  input: {chatId: string; projectId: string; projectPath: string; agentName?: string; status?: HarnessRun["status"]; error?: string; revision?: number}
): Promise<string> {
  const at = new Date().toISOString();
  const run: HarnessRun = {
    id: randomUUID(),
    chatId: input.chatId,
    harnessId: "coding",
    projectId: input.projectId,
    projectName: "Project A",
    projectPath: input.projectPath,
    agentName: input.agentName ?? "reviewer",
    role: "specialist",
    status: input.status ?? "failed",
    task: "Check the evidence",
    startedAt: at,
    updatedAt: at,
    revision: input.revision ?? 2,
    instructions: [],
    output: "",
    ...(input.error ? {error: input.error} : {}),
    events: [{at, message: "Using read"}],
  };
  await runs.save(run);
  return run.id;
}

export interface LedgerRecordInput {
  readonly recordId: string;
  readonly statement: string;
  readonly kind?: string;
  readonly state?: string;
}

/** One `create` event in the memory extension's own format, as its tools would have written it. */
export function memoryCreateEvent(input: LedgerRecordInput): Record<string, unknown> {
  const at = "2026-09-01T10:00:00.000Z";
  return {
    schemaVersion: 1,
    eventId: `SME-20260901T100000Z-${input.recordId.toLowerCase()}`,
    action: "create",
    recordedAt: at,
    actor: {modelProvider: "anthropic", modelId: "claude-sonnet", sessionId: "chat-1"},
    reason: "record created",
    record: {
      recordId: input.recordId,
      kind: input.kind ?? "claim",
      statement: input.statement,
      epistemicState: input.state ?? "reported",
      certainty: "moderate",
      tags: [],
      sourceIds: [],
      relatedIds: [],
      evidence: [{kind: "source", ref: "doi:10.1000/example"}],
      notes: [],
      createdAt: at,
      updatedAt: at,
      createdBy: {modelProvider: "anthropic", modelId: "claude-sonnet", sessionId: "chat-1"},
    },
  };
}

/** Writes a ledger the memory extension would accept, so the curator appends to a real file rather than a stub. */
export async function writeLedger(projectPath: string, records: readonly LedgerRecordInput[]): Promise<string> {
  const directory = join(projectPath, ".science-memory");
  await mkdir(directory, {recursive: true});
  const file = join(directory, "ledger.jsonl");
  await writeFile(file, `${records.map((record) => JSON.stringify(memoryCreateEvent(record))).join("\n")}\n`, "utf8");
  return file;
}
