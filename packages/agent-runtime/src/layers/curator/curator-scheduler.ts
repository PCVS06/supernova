import type {CuratorReview} from "@supernova/contracts/harnesses/schemas";
import {harnessStore} from "@supernova/agent-runtime/layers/harnesses/internal/harness-store";
import type {HarnessStore} from "@supernova/agent-runtime/layers/harnesses/internal/harness-store";
import {curatorStore} from "@supernova/agent-runtime/layers/curator/curator-store";
import type {CuratorStore} from "@supernova/agent-runtime/layers/curator/curator-store";
import {runCuratorReview} from "@supernova/agent-runtime/layers/curator/curator-run";
import type {RunCuratorReviewInput} from "@supernova/agent-runtime/layers/curator/curator-run";
import type {PiSdkServiceShape} from "@supernova/agent-runtime/layers/pi-sdk";

/** A project's memory pass runs once the project has been quiet for this long, and at most this often. */
const defaultDebounceMs = 15 * 60 * 1000;
/** Past this, a review still recorded as running belongs to a process that died; it no longer blocks the next one. */
const staleReviewMs = 60 * 60 * 1000;

/** A pending review must never be the reason the app stays alive; an abandoned pass simply runs after the next run. */
function scheduleUnref(run: () => void, delayMs: number): () => void {
  const handle = setTimeout(run, delayMs);
  handle.unref();
  return () => clearTimeout(handle);
}

export interface CuratorSchedulerDependencies {
  readonly store?: HarnessStore;
  readonly curation?: CuratorStore;
  readonly review?: (input: RunCuratorReviewInput) => Promise<CuratorReview>;
  readonly now?: () => number;
  readonly schedule?: (run: () => void, delayMs: number) => () => void;
  readonly debounceMs?: number;
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
  private readonly debounceMs: number;

  public constructor(dependencies: CuratorSchedulerDependencies = {}) {
    this.store = dependencies.store ?? harnessStore;
    this.curation = dependencies.curation ?? curatorStore;
    this.review = dependencies.review ?? runCuratorReview;
    this.now = dependencies.now ?? Date.now;
    this.schedule = dependencies.schedule ?? scheduleUnref;
    this.debounceMs = dependencies.debounceMs ?? defaultDebounceMs;
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
