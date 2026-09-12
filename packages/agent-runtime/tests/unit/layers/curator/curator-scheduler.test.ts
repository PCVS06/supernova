import {describe, expect, it, vi} from "vitest";
import type {CuratorReview, HarnessConfig, HarnessLibrary} from "@supernova/contracts/harnesses/schemas";
import {CuratorScheduler} from "@supernova/agent-runtime/layers/curator/curator-scheduler";
import type {RunCuratorReviewInput} from "@supernova/agent-runtime/layers/curator/curator-run";
import type {CuratorStore} from "@supernova/agent-runtime/layers/curator/curator-store";
import type {HarnessStore} from "@supernova/agent-runtime/layers/harnesses/internal/harness-store";
import {createDefaultHarness, defaultCuratorConfig} from "@supernova/agent-runtime/layers/harnesses/lib/harness-config";
import type {PiSdkServiceShape} from "@supernova/agent-runtime/layers/pi-sdk";

const debounceMs = 900_000;
const piSdk = {} as PiSdkServiceShape;

function harness(enabled: boolean, maxCostUsdPerDay = 2): HarnessConfig {
  return {...createDefaultHarness(), curator: {...defaultCuratorConfig(), enabled, maxCostUsdPerDay}};
}

/** A clock and a timer queue under the test's control, so fifteen minutes pass without waiting for them. */
function controls(options: {harness: HarnessConfig; spentToday?: number; reviews?: CuratorReview[]}) {
  let now = 1_000_000;
  const timers: {run: () => void; delayMs: number; cancelled: boolean}[] = [];
  const review = vi.fn(
    async (input: RunCuratorReviewInput): Promise<CuratorReview> => ({
      id: "review",
      harnessId: input.harnessId,
      projectId: input.projectId,
      trigger: input.trigger,
      status: "completed",
      startedAt: new Date(now).toISOString(),
      summary: "Nothing needed changing.",
      proposals: 0,
      applied: 0,
    })
  );
  const scheduler = new CuratorScheduler({
    store: {list: async (): Promise<HarnessLibrary> => ({revision: 1, harnesses: [options.harness], projects: []})} as unknown as HarnessStore,
    curation: {spentToday: async () => options.spentToday ?? 0, listReviews: async () => options.reviews ?? []} as unknown as CuratorStore,
    review,
    now: () => now,
    schedule: (run, delayMs) => {
      const timer = {run, delayMs, cancelled: false};
      timers.push(timer);
      return () => {
        timer.cancelled = true;
      };
    },
    debounceMs,
  });
  const fire = async () => {
    for (const timer of timers.filter((item) => !item.cancelled)) {
      timer.cancelled = true;
      timer.run();
    }
    await scheduler.settled();
  };
  return {scheduler, review, timers, fire, advance: (ms: number) => (now += ms)};
}

describe("curator after-run scheduler", () => {
  it("reviews a project once it has been quiet for the debounce window", async () => {
    const {scheduler, review, timers, fire} = controls({harness: harness(true)});

    await scheduler.noteRunFinished({harnessId: "coding", projectId: "project-a", piSdk});
    await scheduler.noteRunFinished({harnessId: "coding", projectId: "project-a", piSdk});

    // The second run replaced the first timer rather than queueing a second review.
    expect(timers).toHaveLength(2);
    expect(timers[0]?.cancelled).toBe(true);
    expect(timers[1]).toMatchObject({cancelled: false, delayMs: debounceMs});

    await fire();
    expect(review).toHaveBeenCalledTimes(1);
    expect(review).toHaveBeenCalledWith({harnessId: "coding", projectId: "project-a", trigger: "after-run", scope: "memory", piSdk});
  });

  it("reviews one project at most once per window", async () => {
    const {scheduler, review, fire, advance} = controls({harness: harness(true)});

    await scheduler.noteRunFinished({harnessId: "coding", projectId: "project-a", piSdk});
    await fire();
    await scheduler.noteRunFinished({harnessId: "coding", projectId: "project-a", piSdk});
    await fire();
    expect(review).toHaveBeenCalledTimes(1);

    advance(debounceMs);
    await scheduler.noteRunFinished({harnessId: "coding", projectId: "project-a", piSdk});
    await fire();
    expect(review).toHaveBeenCalledTimes(2);
  });

  it("keeps each project on its own timer", async () => {
    const {scheduler, review, fire} = controls({harness: harness(true)});

    await scheduler.noteRunFinished({harnessId: "coding", projectId: "project-a", piSdk});
    await scheduler.noteRunFinished({harnessId: "coding", projectId: "project-b", piSdk});
    await fire();

    expect(review.mock.calls.map(([call]) => call.projectId)).toEqual(["project-a", "project-b"]);
  });

  it("arms nothing while the curator is switched off", async () => {
    const {scheduler, review, timers, fire} = controls({harness: harness(false)});

    await scheduler.noteRunFinished({harnessId: "coding", projectId: "project-a", piSdk});

    expect(timers).toHaveLength(0);
    await fire();
    expect(review).not.toHaveBeenCalled();
  });

  it("skips the review once the day's budget is spent", async () => {
    const {scheduler, review, fire} = controls({harness: harness(true), spentToday: 2});

    await scheduler.noteRunFinished({harnessId: "coding", projectId: "project-a", piSdk});
    await fire();

    expect(review).not.toHaveBeenCalled();
  });

  it("waits for a review of the same harness that is still running", async () => {
    const running = {
      id: "review-1",
      harnessId: "coding",
      trigger: "manual",
      status: "running",
      startedAt: new Date(1_000_000).toISOString(),
      summary: "",
      proposals: 0,
      applied: 0,
    };
    const {scheduler, review, fire} = controls({harness: harness(true), reviews: [running as CuratorReview]});

    await scheduler.noteRunFinished({harnessId: "coding", projectId: "project-a", piSdk});
    await fire();

    expect(review).not.toHaveBeenCalled();
  });

  it("never lets a scheduling failure reach the run that finished", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const scheduler = new CuratorScheduler({
      store: {list: async () => Promise.reject(new Error("configuration unreadable"))} as unknown as HarnessStore,
    });

    await expect(scheduler.noteRunFinished({harnessId: "coding", projectId: "project-a", piSdk})).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
