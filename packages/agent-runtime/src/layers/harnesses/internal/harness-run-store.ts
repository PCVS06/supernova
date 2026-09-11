import {randomUUID} from "node:crypto";
import {mkdir, readFile, readdir, rename, writeFile} from "node:fs/promises";
import {join} from "node:path";
import {Schema} from "effect";
import {HarnessRun, HarnessRunSummary, HarnessRuntimeContext, WorkflowRun, WorkflowRunSummary} from "@supernova/contracts/harnesses/schemas";
import {harnessStore} from "@supernova/agent-runtime/layers/harnesses/internal/harness-store";

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

/** Durable, chat-owned execution receipts. Definitions never become runs until invoked. */
export class HarnessRunStore {
  public constructor(
    private readonly root: string,
    private readonly isAlive = alive
  ) {}

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
    const record = Schema.decodeUnknownSync(WorkflowRun)(run);
    await this.write(run.chatId, `${safeId(run.id)}.workflow.json`, {run: record, pid: process.pid});
    const summary = Schema.decodeUnknownSync(WorkflowRunSummary)(record);
    await this.write(run.chatId, `${safeId(run.id)}.workflow-summary.json`, {run: {...summary, task: summary.task.slice(0, 300)}, pid: process.pid});
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
}

export const harnessRunStore = new HarnessRunStore(join(harnessStore.root, "runs"));
