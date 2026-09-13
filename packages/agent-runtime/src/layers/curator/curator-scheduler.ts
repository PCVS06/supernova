import type {CuratorReview} from "@supernova/contracts/harnesses/schemas";
import {harnessStore} from "@supernova/agent-runtime/layers/harnesses/internal/harness-store";
import type {HarnessStore} from "@supernova/agent-runtime/layers/harnesses/internal/harness-store";
import {curatorStore} from "@supernova/agent-runtime/layers/curator/curator-store";
import type {CuratorStore} from "@supernova/agent-runtime/layers/curator/curator-store";
import {runCuratorReview} from "@supernova/agent-runtime/layers/curator/curator-run";
import type {RunCuratorReviewInput} from "@supernova/agent-runtime/layers/curator/curator-run";
import {inQuietHours, lastScheduledSweep, quietHoursEndsInMs} from "@supernova/agent-runtime/layers/curator/lib/curator-schedule";
import type {PiSdkServiceShape} from "@supernova/agent-runtime/layers/pi-sdk";

/** A project's memory pass runs once the project has been quiet for this long, and at most this often. */
const defaultDebounceMs = 15 * 60 * 1000;
/** Past this, a review still recorded as running belongs to a process that died; it no longer blocks the next one. */
const staleReviewMs = 60 * 60 * 1000;
/** The sweep is checked once a minute: fine enough for a time of day, cheap enough to run all day. */
const defaultTickMs = 60 * 1000;

/** A pending review must never be the reason the app stays alive; an abandoned pass simply runs after the next run. */
function scheduleUnref(run: () => void, delayMs: number): () => void {
  const handle = setTimeout(run, delayMs);
  handle.unref();
  return () => clearTimeout(handle);
}

/** The sweep tick keeps the process no more alive than the after-run timers do. */
function intervalUnref(run: () => void, everyMs: number): () => void {
  const handle = setInterval(run, everyMs);
  handle.unref();
  return () => clearInterval(handle);
}

export interface CuratorSchedulerDependencies {
  readonly store?: HarnessStore;
  readonly curation?: CuratorStore;
  readonly review?: (input: RunCuratorReviewInput) => Promise<CuratorReview>;
  readonly now?: () => number;
  readonly schedule?: (run: () => void, delayMs: number) => () => void;
  readonly interval?: (run: () => void, everyMs: number) => () => void;
  readonly debounceMs?: number;
  readonly tickMs?: number;
}

/**
 * The after-run trigger: memory hygiene for a project that has stopped working, not a reaction to every run.
 *
 * One timer per project, reset by each finishing run, so a busy project is reviewed once it goes quiet rather than
 * after every delegation. A project is reviewed at most once per debounce window, reviews run one after another and
 * never beside a review that is already running, and nothing runs once the daily cost cap is reached.
 */
export class CuratorScheduler {
  private readonly pending = new Map<string, () => void>();
  private readonly lastReviewed = new Map<string, number>();
  private reviews: Promise<unknown> = Promise.resolve();
  private readonly store: HarnessStore;
  private readonly curation: CuratorStore;
  private readonly review: (input: RunCuratorReviewInput) => Promise<CuratorReview>;
  private readonly now: () => number;
  private readonly schedule: (run: () => void, delayMs: number) => () => void;
  private readonly interval: (run: () => void, everyMs: number) => () => void;
  private readonly debounceMs: number;
  private readonly tickMs: number;
  private stopTicking: (() => void) | undefined;

  public constructor(dependencies: CuratorSchedulerDependencies = {}) {
    this.store = dependencies.store ?? harnessStore;
    this.curation = dependencies.curation ?? curatorStore;
    this.review = dependencies.review ?? runCuratorReview;
    this.now = dependencies.now ?? Date.now;
    this.schedule = dependencies.schedule ?? scheduleUnref;
    this.interval = dependencies.interval ?? intervalUnref;
    this.debounceMs = dependencies.debounceMs ?? defaultDebounceMs;
    this.tickMs = dependencies.tickMs ?? defaultTickMs;
  }

  /** Starts the daily sweep. Idempotent, because the runtime has no single place that owns the scheduler's lifetime. */
  public start(piSdk: PiSdkServiceShape): void {
    if (this.stopTicking) return;
    this.stopTicking = this.interval(() => {
      this.reviews = this.reviews.then(() => this.sweep(piSdk)).catch(() => undefined);
    }, this.tickMs);
  }

  /** Stops the daily sweep. Used by tests and by a shutting-down process; pending after-run passes are unaffected. */
  public stop(): void {
    this.stopTicking?.();
    this.stopTicking = undefined;
  }

  /**
   * One tick of the daily sweep: every enabled harness with a configured time whose day has come.
   *
   * The stamp is written before the review rather than after, so a review that dies mid-way costs one sweep rather
   * than repeating every minute for the rest of the day, and a process that was down at the configured time sweeps
   * at the first tick after it comes back.
   */
  private async sweep(piSdk: PiSdkServiceShape): Promise<void> {
    try {
      const library = await this.store.list();
      for (const harness of library.harnesses) {
        const curator = harness.curator;
        if (!curator?.enabled || !curator.dailyAt) continue;
        const at = new Date(this.now());
        if (inQuietHours(curator.quietHours, at)) continue;
        const due = lastScheduledSweep(curator.dailyAt, at);
        if (!due) continue;
        const swept = await this.curation.lastSweepAt(harness.id);
        // A harness seen for the first time is stamped rather than swept: switching the curator on is not a missed sweep.
        if (!swept) {
          await this.curation.markSwept(harness.id, at.toISOString());
          continue;
        }
        if (new Date(swept).getTime() >= due.getTime()) continue;
        const reviews = await this.curation.listReviews(harness.id);
        if (reviews.some((review) => review.status === "running" && this.now() - new Date(review.startedAt).getTime() < staleReviewMs)) continue;
        if ((await this.curation.spentToday(harness.id)) >= curator.maxCostUsdPerDay) continue;
        await this.curation.markSwept(harness.id, at.toISOString());
        await this.review({harnessId: harness.id, trigger: "daily", scope: "full", piSdk});
      }
    } catch (error) {
      console.warn("pi+ could not run the curator's daily sweep:", error instanceof Error ? error.message : String(error));
    }
  }

  /** Notes that a run of this project finished. Never throws and never blocks the run that called it. */
  public noteRunFinished(input: {readonly harnessId: string; readonly projectId: string; readonly piSdk: PiSdkServiceShape}): Promise<void> {
    return this.arm(input).catch((error) => {
      console.warn("pi+ could not schedule a curator review:", error instanceof Error ? error.message : String(error));
    });
  }

  private async arm(input: {harnessId: string; projectId: string; piSdk: PiSdkServiceShape}): Promise<void> {
    const harness = (await this.store.list()).harnesses.find((item) => item.id === input.harnessId);
    if (!harness?.curator?.enabled) return;
    const key = `${input.harnessId}/${input.projectId}`;
    this.pending.get(key)?.();
    this.pending.set(
      key,
      this.schedule(() => {
        this.pending.delete(key);
        this.reviews = this.reviews.then(() => this.runNow(key, input)).catch(() => undefined);
      }, this.debounceMs)
    );
  }

  private async runNow(key: string, input: {harnessId: string; projectId: string; piSdk: PiSdkServiceShape}): Promise<void> {
    try {
      const harness = (await this.store.list()).harnesses.find((item) => item.id === input.harnessId);
      const curator = harness?.curator;
      if (!curator?.enabled) return;
      const since = this.lastReviewed.get(key);
      if (since !== undefined && this.now() - since < this.debounceMs) return;
      // Quiet hours hold every trigger back, so a pass that comes due inside the window waits for the end of it.
      const quiet = quietHoursEndsInMs(curator.quietHours, new Date(this.now()));
      if (quiet > 0) {
        this.pending.get(key)?.();
        this.pending.set(
          key,
          this.schedule(() => {
            this.pending.delete(key);
            this.reviews = this.reviews.then(() => this.runNow(key, input)).catch(() => undefined);
          }, quiet)
        );
        return;
      }
      // A review of this harness that is still running, here or behind the Review now button, has the floor.
      const reviews = await this.curation.listReviews(input.harnessId);
      if (reviews.some((review) => review.status === "running" && this.now() - new Date(review.startedAt).getTime() < staleReviewMs)) return;
      if ((await this.curation.spentToday(input.harnessId)) >= curator.maxCostUsdPerDay) return;
      this.lastReviewed.set(key, this.now());
      await this.review({harnessId: input.harnessId, projectId: input.projectId, trigger: "after-run", scope: "memory", piSdk: input.piSdk});
    } catch (error) {
      console.warn("pi+ could not run a curator review:", error instanceof Error ? error.message : String(error));
    }
  }

  /** Resolves once every review this scheduler has started has finished. Used by tests, not by the runtime. */
  public async settled(): Promise<void> {
    await this.reviews;
  }
}

export const curatorScheduler = new CuratorScheduler();
