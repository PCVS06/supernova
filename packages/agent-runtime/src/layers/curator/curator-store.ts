import {randomUUID} from "node:crypto";
import {mkdir, readFile, readdir, rename, rmdir, writeFile} from "node:fs/promises";
import {homedir} from "node:os";
import {join} from "node:path";
import {setTimeout as delay} from "node:timers/promises";
import {Schema} from "effect";
import {CurationProposal, CurationRequest, CuratorReview} from "@supernova/contracts/harnesses/schemas";
import type {CurationProposalStatus} from "@supernova/contracts/harnesses/schemas";
import {targetKey} from "@supernova/agent-runtime/layers/curator/lib/curator-targets";

/** Reviews the UI lists for one harness; older ones stay on disk but are not read back. */
const listedReviews = 50;
/** Requests one read returns; a chat files evidence, not a queue. */
const listedRequests = 50;
/** The statuses a cooldown counts from: the user has answered on this artefact, whichever way it went. */
const decidedStatuses: readonly CurationProposalStatus[] = ["applied", "rejected", "rolled-back"];

function safeId(id: string): string {
  if (!/^[a-zA-Z0-9_-]{1,150}$/.test(id)) throw new Error("Invalid curation identifier.");
  return id;
}

/** The calendar day a review belongs to, in local time, because the daily cap is a day of the user's. */
function day(at: string): string {
  const date = new Date(at);
  return Number.isNaN(date.getTime()) ? "" : `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

/**
 * The curator's own records: what it proposed, what was decided, and what each review cost.
 *
 * Kept beside the harness configuration rather than inside a project, because a proposal outlives the chat and
 * the project folder it was found in, and because nothing here belongs in the user's repository. Writes take the
 * same discipline as the configuration store: one writer at a time, a temporary file, then a rename.
 */
export class CuratorStore {
  private queue: Promise<unknown> = Promise.resolve();
  public constructor(public readonly root: string) {}

  private harnessDirectory(harnessId: string): string {
    return join(this.root, safeId(harnessId));
  }

  private async write(directory: string, file: string, value: unknown): Promise<void> {
    const operation = this.queue
      .catch(() => undefined)
      .then(async () => {
        await mkdir(directory, {recursive: true, mode: 0o700});
        const lock = join(this.root, "curation.write-lock");
        let held = false;
        for (let attempt = 0; attempt < 40 && !held; attempt += 1) {
          try {
            await mkdir(lock, {mode: 0o700});
            held = true;
          } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
            await delay(25);
          }
        }
        if (!held) throw new Error("Curation records are being written elsewhere. Wait a moment and retry.");
        try {
          const temporary = join(directory, `${randomUUID()}.tmp`);
          await writeFile(temporary, JSON.stringify(value, null, 2), {mode: 0o600});
          await rename(temporary, join(directory, file));
        } finally {
          await rmdir(lock);
        }
      });
    this.queue = operation;
    await operation;
  }

  private async readAll<T>(directory: string, decode: (value: unknown) => T): Promise<T[]> {
    let names: string[];
    try {
      names = await readdir(directory);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw error;
    }
    const values: T[] = [];
    for (const name of names.filter((name) => name.endsWith(".json"))) {
      values.push(decode(JSON.parse(await readFile(join(directory, name), "utf8"))));
    }
    return values;
  }

  /** Files one proposal. A proposal is immutable except for its decision, so the id is its file name. */
  public async addProposal(proposal: CurationProposal): Promise<CurationProposal> {
    const record = Schema.decodeUnknownSync(CurationProposal)(proposal);
    await this.write(join(this.harnessDirectory(record.harnessId), "proposals"), `${safeId(record.id)}.json`, record);
    return record;
  }

  /** Replaces one proposal with its decided, applied, failed or rolled-back state. */
  public updateProposal(proposal: CurationProposal): Promise<CurationProposal> {
    return this.addProposal(proposal);
  }

  /** One proposal by id. The decision RPC knows the proposal, not the harness it belongs to. */
  public async getProposal(proposalId: string): Promise<CurationProposal | undefined> {
    let harnesses: string[];
    try {
      harnesses = (await readdir(this.root, {withFileTypes: true})).filter((entry) => entry.isDirectory()).map((entry) => entry.name);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
      throw error;
    }
    for (const harnessId of harnesses) {
      try {
        const contents = await readFile(join(this.root, harnessId, "proposals", `${safeId(proposalId)}.json`), "utf8");
        return Schema.decodeUnknownSync(CurationProposal)(JSON.parse(contents));
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") continue;
        throw error;
      }
    }
    return undefined;
  }

  /** This harness's proposals, newest first. */
  public async listProposals(harnessId: string): Promise<CurationProposal[]> {
    const proposals = await this.readAll(join(this.harnessDirectory(harnessId), "proposals"), (value) => Schema.decodeUnknownSync(CurationProposal)(value));
    return proposals.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  /**
   * When this artefact was last decided, and how, so a cooldown can be counted from it.
   *
   * Applied, rejected and rolled back all count: each is the user having answered on this artefact, and proposing
   * against it again within the cooldown needs evidence that is newer than the answer.
   */
  public async lastDecision(harnessId: string, key: string): Promise<{readonly at: string; readonly status: CurationProposalStatus} | undefined> {
    const decided = (await this.listProposals(harnessId))
      .filter((proposal) => proposal.decidedAt && decidedStatuses.includes(proposal.status) && targetKey(proposal.target) === key)
      .sort((left, right) => right.decidedAt!.localeCompare(left.decidedAt!));
    const latest = decided[0];
    return latest ? {at: latest.decidedAt!, status: latest.status} : undefined;
  }

  /** Files one request from a chat. Immutable, so the id is its file name, like a proposal. */
  public async addRequest(request: CurationRequest): Promise<CurationRequest> {
    const record = Schema.decodeUnknownSync(CurationRequest)(request);
    await this.write(join(this.harnessDirectory(record.harnessId), "requests"), `${safeId(record.id)}.json`, record);
    return record;
  }

  /** This harness's requests, newest first. */
  public async listRequests(harnessId: string, filter: {readonly projectId?: string; readonly since?: string} = {}): Promise<CurationRequest[]> {
    const requests = await this.readAll(join(this.harnessDirectory(harnessId), "requests"), (value) => Schema.decodeUnknownSync(CurationRequest)(value));
    return requests
      .filter((request) => (!filter.projectId || request.projectId === filter.projectId) && (!filter.since || request.at >= filter.since))
      .sort((a, b) => b.at.localeCompare(a.at))
      .slice(0, listedRequests);
  }

  /** When the daily sweep of this harness last ran, so a restart does not repeat today's. */
  public async lastSweepAt(harnessId: string): Promise<string | undefined> {
    try {
      const contents = await readFile(join(this.harnessDirectory(harnessId), "sweep.json"), "utf8");
      const value: unknown = JSON.parse(contents);
      const at = (value as {lastSweepAt?: unknown}).lastSweepAt;
      return typeof at === "string" ? at : undefined;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
      throw error;
    }
  }

  /** Stamps the sweep before it runs, so a crash mid-review does not queue a second one for the same day. */
  public async markSwept(harnessId: string, at: string): Promise<void> {
    await this.write(this.harnessDirectory(harnessId), "sweep.json", {lastSweepAt: at});
  }

  /** Records one review, at its start and again when it finishes. */
  public async addReview(review: CuratorReview): Promise<CuratorReview> {
    const record = Schema.decodeUnknownSync(CuratorReview)(review);
    await this.write(join(this.harnessDirectory(record.harnessId), "reviews"), `${safeId(record.id)}.json`, record);
    return record;
  }

  public updateReview(review: CuratorReview): Promise<CuratorReview> {
    return this.addReview(review);
  }

  /** This harness's most recent reviews, newest first. */
  public async listReviews(harnessId: string): Promise<CuratorReview[]> {
    const reviews = await this.readAll(join(this.harnessDirectory(harnessId), "reviews"), (value) => Schema.decodeUnknownSync(CuratorReview)(value));
    return reviews.sort((a, b) => b.startedAt.localeCompare(a.startedAt)).slice(0, listedReviews);
  }

  /** What this harness's curator has already spent today, against which the daily cap is checked. */
  public async spentToday(harnessId: string, now = new Date()): Promise<number> {
    const today = day(now.toISOString());
    const reviews = await this.readAll(join(this.harnessDirectory(harnessId), "reviews"), (value) => Schema.decodeUnknownSync(CuratorReview)(value));
    return reviews.filter((review) => day(review.startedAt) === today).reduce((total, review) => total + (review.spentUsd ?? 0), 0);
  }
}

export const curatorStore = new CuratorStore(join(homedir(), ".config", "pi-plus", "curation"));
