import {randomUUID} from "node:crypto";
import {appendFile, mkdir, readFile, readdir, rename, writeFile} from "node:fs/promises";
import {join} from "node:path";
import {Schema} from "effect";
import {HarnessRun, HarnessRunSummary, HarnessRuntimeContext, SteerRecord, WorkflowRun, WorkflowRunSummary} from "@supernova/contracts/harnesses/schemas";
import {harnessStore} from "@supernova/agent-runtime/layers/harnesses/internal/harness-store";
import {workflowStepSummaries} from "@supernova/contracts/harnesses/workflow-graph";

const workflowExecutions = new Map<string, Promise<WorkflowRun>>();

function safeId(id: string): string {
  if (!/^[a-zA-Z0-9_-]{1,150}$/.test(id)) throw new Error("Invalid chat or run identifier.");
  return id;
}

function alive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code !== "ESRCH";
  }
}

/** How a chat is mapped to the project it belongs to when its receipts do not name one. */
export type ChatProjectResolver = (chatId: string) => Promise<{readonly id: string; readonly path: string} | undefined>;

/** Durable, chat-owned execution receipts. Definitions never become runs until invoked. */
export class HarnessRunStore {
  public constructor(
    private readonly root: string,
    private readonly isAlive = alive,
    private readonly projectOfChat: ChatProjectResolver = (chatId) => harnessStore.projectOfSession(chatId)
  ) {}

  private readonly lastActivity = new Map<string, {runs: HarnessRunSummary[]; workflows: WorkflowRunSummary[]; runCount: number; workflowCount: number}>();

  private async write(chatId: string, file: string, value: unknown): Promise<void> {
    const directory = join(this.root, safeId(chatId));
    await mkdir(directory, {recursive: true, mode: 0o700});
    const temporary = join(directory, `${randomUUID()}.tmp`);
    await writeFile(temporary, JSON.stringify(value), {mode: 0o600});
    await rename(temporary, join(directory, file));
  }

  /** Saves a full receipt and a small polling index, in that order. One writer owns each run. */
  public async save(run: HarnessRun): Promise<void> {
    const record = Schema.decodeUnknownSync(HarnessRun)(run);
    await this.write(run.chatId, `${safeId(run.id)}.json`, {run: record, pid: process.pid});
    const summary = Schema.decodeUnknownSync(HarnessRunSummary)(record);
    await this.write(run.chatId, `${safeId(run.id)}.summary.json`, {run: {...summary, task: summary.task.slice(0, 300)}, pid: process.pid});
  }

  private recovered<T extends HarnessRunSummary>(record: {run: T; pid: number}): T {
    const unfinished = record.run.status === "starting" || record.run.status === "running";
    return unfinished && !this.isAlive(record.pid) ? {...record.run, status: "interrupted", activity: "App stopped before this run finished."} : record.run;
  }

  /** Lists actual runs belonging to this chat without loading prompts or outputs. */
  public async list(chatId: string): Promise<HarnessRunSummary[]> {
    const directory = join(this.root, safeId(chatId));
    let names: string[];
    try {
      names = await readdir(directory);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw error;
    }
    const results: HarnessRunSummary[] = [];
    for (const name of names.filter((name) => name.endsWith(".summary.json"))) {
      const record = JSON.parse(await readFile(join(directory, name), "utf8"));
      const run = this.recovered({...record, run: Schema.decodeUnknownSync(HarnessRunSummary)(record.run)});
      if (run.chatId !== chatId) throw new Error("Run does not belong to this chat.");
      results.push(run);
    }
    return results.sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  }

  /** Retrieves one exact receipt; another chat cannot address it. */
  public async get(chatId: string, runId: string): Promise<HarnessRun> {
    const record = JSON.parse(await readFile(join(this.root, safeId(chatId), `${safeId(runId)}.json`), "utf8"));
    const run = Schema.decodeUnknownSync(HarnessRun)(record.run);
    if (run.chatId !== chatId || run.id !== runId) throw new Error("Run does not belong to this chat.");
    return this.recovered({pid: record.pid, run});
  }

  /** Saves a workflow run and its index under names the specialist receipt listing cannot pick up. */
  public async saveWorkflowRun(run: WorkflowRun): Promise<void> {
    const record = Schema.decodeUnknownSync(WorkflowRun)({
      ...run,
      stepStates: workflowStepSummaries(run),
      completedCount: run.steps.filter((step) => step.status === "completed").length,
    });
    await this.write(run.chatId, `${safeId(run.id)}.workflow.json`, {run: record, pid: process.pid});
    const summary = Schema.decodeUnknownSync(WorkflowRunSummary)(record);
    await this.write(run.chatId, `${safeId(run.id)}.workflow-summary.json`, {run: {...summary, task: summary.task.slice(0, 300)}, pid: process.pid});
  }

  /** Coalesces duplicate starts/resumes under the authoritative server's single writer per run. */
  public executeWorkflow(chatId: string, runId: string, execute: () => Promise<WorkflowRun>): Promise<WorkflowRun> {
    const key = join(this.root, safeId(chatId), safeId(runId));
    const active = workflowExecutions.get(key);
    if (active) return active;
    const result = execute().finally(() => workflowExecutions.delete(key));
    workflowExecutions.set(key, result);
    return result;
  }

  /** Applies the same liveness rule as specialist receipts: a run whose writer is gone was interrupted. */
  private recoveredWorkflow<T extends WorkflowRunSummary>(record: {run: T; pid: number}): T {
    return record.run.status === "running" && !this.isAlive(record.pid) ? {...record.run, status: "interrupted", error: "App stopped before this run finished."} : record.run;
  }

  /** Lists this chat's workflow runs, ignoring the specialist receipts stored beside them. */
  public async listWorkflowRuns(chatId: string): Promise<WorkflowRunSummary[]> {
    const directory = join(this.root, safeId(chatId));
    let names: string[];
    try {
      names = await readdir(directory);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw error;
    }
    const results: WorkflowRunSummary[] = [];
    for (const name of names.filter((name) => name.endsWith(".workflow-summary.json"))) {
      const record = JSON.parse(await readFile(join(directory, name), "utf8"));
      const run = this.recoveredWorkflow({...record, run: Schema.decodeUnknownSync(WorkflowRunSummary)(record.run)});
      if (run.chatId !== chatId) throw new Error("Run does not belong to this chat.");
      results.push(run);
    }
    return results.sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  }

  /** Retrieves one exact workflow run, including its frozen workflow and step records. */
  public async getWorkflowRun(chatId: string, runId: string): Promise<WorkflowRun> {
    const record = JSON.parse(await readFile(join(this.root, safeId(chatId), `${safeId(runId)}.workflow.json`), "utf8"));
    const run = Schema.decodeUnknownSync(WorkflowRun)(record.run);
    if (run.chatId !== chatId || run.id !== runId) throw new Error("Run does not belong to this chat.");
    return this.recoveredWorkflow({pid: record.pid, run});
  }

  /** Captures the effective runtime prompt, separately from editable future-chat settings. */
  public saveContext(chatId: string, context: HarnessRuntimeContext): Promise<void> {
    return this.write(chatId, "context.json", context);
  }

  /** Returns an observed runtime context, or nothing for chats not run since this feature shipped. */
  public async context(chatId: string): Promise<HarnessRuntimeContext | undefined> {
    try {
      return Schema.decodeUnknownSync(HarnessRuntimeContext)(JSON.parse(await readFile(join(this.root, safeId(chatId), "context.json"), "utf8")));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
      throw error;
    }
  }

  /** Records one user correction typed while a turn was running, beside that chat's receipts. */
  public async appendSteer(chatId: string, text: string, at = new Date().toISOString()): Promise<void> {
    const directory = join(this.root, safeId(chatId));
    await mkdir(directory, {recursive: true, mode: 0o700});
    const record = Schema.decodeUnknownSync(SteerRecord)({chatId, at, text});
    // One line, one O_APPEND write: concurrent steers from different chats never interleave inside a line.
    await appendFile(join(directory, "steers.jsonl"), `${JSON.stringify(record)}\n`, {mode: 0o600});
  }

  /** This chat's recorded steers, newest first. Malformed lines are skipped rather than hiding the rest. */
  public async listSteers(chatId: string): Promise<SteerRecord[]> {
    let contents: string;
    try {
      contents = await readFile(join(this.root, safeId(chatId), "steers.jsonl"), "utf8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw error;
    }
    const records: SteerRecord[] = [];
    for (const line of contents.split("\n")) {
      if (!line.trim()) continue;
      try {
        const record = Schema.decodeUnknownSync(SteerRecord)(JSON.parse(line));
        if (record.chatId === chatId) records.push(record);
      } catch {
        continue;
      }
    }
    return records.sort((a, b) => b.at.localeCompare(a.at));
  }

  /** The chat identifiers that have receipts or steers of their own. */
  private async chats(): Promise<string[]> {
    try {
      return (await readdir(this.root, {withFileTypes: true})).filter((entry) => entry.isDirectory()).map((entry) => entry.name);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw error;
    }
  }

  /** The project of a chat: its pinned snapshot, or the project its own receipts name. Empty for a chat outside any harness. */
  public async chatProject(chatId: string): Promise<{id?: string; path?: string}> {
    const pinned = await this.projectOfChat(chatId).catch(() => undefined);
    if (pinned) return pinned;
    const [run] = await this.list(chatId);
    return {id: run?.projectId};
  }

  /** Every steer typed in the chats of one project, newest first. */
  public async listSteersForProject(project: {readonly id?: string; readonly path?: string}): Promise<SteerRecord[]> {
    const records: SteerRecord[] = [];
    for (const chatId of await this.chats()) {
      const steers = await this.listSteers(chatId);
      if (!steers.length) continue;
      const owner = await this.chatProject(chatId);
      if ((project.id && owner.id === project.id) || (project.path && owner.path === project.path)) records.push(...steers);
    }
    return records.sort((a, b) => b.at.localeCompare(a.at));
  }

  /** Receipts across all chats, newest first: the run history a review reads as evidence. */
  public async listRecentRuns(input: {readonly projectId?: string; readonly failedOnly?: boolean; readonly limit?: number} = {}): Promise<HarnessRunSummary[]> {
    const runs: HarnessRunSummary[] = [];
    for (const chatId of await this.chats()) {
      for (const run of await this.list(chatId)) {
        if (input.projectId && run.projectId !== input.projectId) continue;
        if (input.failedOnly && run.status !== "failed" && run.status !== "interrupted" && run.status !== "cancelled") continue;
        runs.push(run);
      }
    }
    return runs.sort((a, b) => b.startedAt.localeCompare(a.startedAt)).slice(0, input.limit ?? 50);
  }

  /** Compact activity across chats, preserving all unresolved runs and bounding settled history. */
  public async workspaceActivity(): Promise<{
    runs: HarnessRunSummary[];
    workflows: WorkflowRunSummary[];
    totals: Array<{sessionId: string; runs: number; workflows: number}>;
    errors: string[];
  }> {
    const runs: HarnessRunSummary[] = [];
    const workflows: WorkflowRunSummary[] = [];
    const errors: string[] = [];
    const totals: Array<{sessionId: string; runs: number; workflows: number}> = [];
    const chats = await this.chats();
    for (let offset = 0; offset < chats.length; offset += 6) {
      await Promise.all(
        chats.slice(offset, offset + 6).map(async (chatId) => {
          try {
            const [workers, graphs] = await Promise.all([this.list(chatId), this.listWorkflowRuns(chatId)]);
            totals.push({sessionId: chatId, runs: workers.length, workflows: graphs.length});
            const retain = <T extends HarnessRunSummary | WorkflowRunSummary>(items: T[]): T[] => {
              const settled = items.filter((item) => ["completed", "cancelled"].includes(item.status)).toSorted((a, b) => b.updatedAt.localeCompare(a.updatedAt));
              return [...items.filter((item) => !["completed", "cancelled"].includes(item.status)), ...settled.slice(0, 30)];
            };
            const visible = {runs: retain(workers), workflows: retain(graphs), runCount: workers.length, workflowCount: graphs.length};
            this.lastActivity.set(chatId, visible);
            runs.push(...visible.runs);
            workflows.push(...visible.workflows);
          } catch {
            errors.push(`Activity unavailable for chat ${chatId}.`);
            const last = this.lastActivity.get(chatId);
            if (last) {
              runs.push(...last.runs);
              workflows.push(...last.workflows);
              totals.push({sessionId: chatId, runs: last.runCount, workflows: last.workflowCount});
            }
          }
        })
      );
    }
    return {runs, workflows, totals, errors};
  }

  /** The workflow failure kind recorded for each specialist run of one chat, keyed by run id. */
  public async workflowFailureKinds(chatId: string): Promise<Map<string, string>> {
    const kinds = new Map<string, string>();
    for (const run of await this.listWorkflowRuns(chatId)) {
      const record = await this.getWorkflowRun(chatId, run.id);
      for (const step of record.steps) if (step.runId && step.failureKind) kinds.set(step.runId, step.failureKind);
    }
    return kinds;
  }
}

export const harnessRunStore = new HarnessRunStore(join(harnessStore.root, "runs"));
