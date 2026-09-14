import {describe, expect, it, vi} from "vitest";
import type {CuratorConfig, CuratorReview, HarnessConfig, HarnessLibrary} from "@supernova/contracts/harnesses/schemas";
import {CuratorScheduler} from "@supernova/agent-runtime/layers/curator/curator-scheduler";
import type {RunCuratorReviewInput} from "@supernova/agent-runtime/layers/curator/curator-run";
import type {CuratorStore} from "@supernova/agent-runtime/layers/curator/curator-store";
import type {HarnessStore} from "@supernova/agent-runtime/layers/harnesses/internal/harness-store";
import {createDefaultHarness, defaultCuratorConfig} from "@supernova/agent-runtime/layers/harnesses/lib/harness-config";
import type {PiSdkServiceShape} from "@supernova/agent-runtime/layers/pi-sdk";

const debounceMs = 900_000;
const piSdk = {} as PiSdkServiceShape;

function harness(enabled: boolean, maxCostUsdPerDay = 2, curator: Partial<CuratorConfig> = {}): HarnessConfig {
  return {...createDefaultHarness(), curator: {...defaultCuratorConfig(), enabled, maxCostUsdPerDay, ...curator}};
}

/** A local wall-clock moment, because the sweep and the quiet window are the user's times of day, not UTC's. */
function at(day: number, hour: number, minute = 0): number {
  return new Date(2026, 8, day, hour, minute).getTime();
}

/** A clock and a timer queue under the test's control, so fifteen minutes pass without waiting for them. */
function controls(options: {harness: HarnessConfig; spentToday?: number; reviews?: CuratorReview[]; startAt?: number; sweptAt?: string}) {
  let now = options.startAt ?? 1_000_000;
  let sweptAt = options.sweptAt;
  const timers: {run: () => void; delayMs: number; cancelled: boolean}[] = [];
  const ticks: {run: () => void; everyMs: number}[] = [];
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
    curation: {
      spentToday: async () => options.spentToday ?? 0,
      listReviews: async () => options.reviews ?? [],
      lastSweepAt: async () => sweptAt,
      markSwept: async (_harnessId: string, stamp: string) => {
        sweptAt = stamp;
      },
    } as unknown as CuratorStore,
    review,
    now: () => now,
    schedule: (run, delayMs) => {
      const timer = {run, delayMs, cancelled: false};
      timers.push(timer);
      return () => {
        timer.cancelled = true;
      };
    },
    interval: (run, everyMs) => {
      const tick = {run, everyMs};
      ticks.push(tick);
      return () => ticks.splice(ticks.indexOf(tick), 1);
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
  const tick = async () => {
    for (const item of [...ticks]) item.run();
    await scheduler.settled();
  };
  return {scheduler, review, timers, ticks, fire, tick, advance: (ms: number) => (now += ms), swept: () => sweptAt, moveTo: (moment: number) => (now = moment)};
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

describe("curator daily sweep", () => {
  const daily = (curator: Partial<CuratorConfig>) => harness(true, 2, {dailyAt: "09:00", ...curator});

  const yesterday = new Date(at(9, 9, 0)).toISOString();

  it("sweeps the whole harness once the configured time has come, and once only", async () => {
    const {scheduler, review, tick, swept, advance} = controls({harness: daily({}), startAt: at(10, 9, 0), sweptAt: yesterday});

    scheduler.start(piSdk);
    await tick();

    expect(review).toHaveBeenCalledWith({harnessId: "coding", trigger: "daily", scope: "full", piSdk});
    expect(swept()).toBe(new Date(at(10, 9, 0)).toISOString());

    advance(60_000);
    await tick();
    expect(review).toHaveBeenCalledTimes(1);
  });

  it("waits for the configured time and starts one ticker however often it is started", async () => {
    const {scheduler, review, tick, ticks, moveTo} = controls({harness: daily({}), startAt: at(10, 8, 59), sweptAt: yesterday});

    scheduler.start(piSdk);
    scheduler.start(piSdk);
    await tick();
    expect(ticks).toHaveLength(1);
    expect(review).not.toHaveBeenCalled();

    moveTo(at(10, 9, 1));
    await tick();
    expect(review).toHaveBeenCalledTimes(1);
  });

  it("stamps a harness it sees for the first time instead of sweeping it", async () => {
    const {scheduler, review, tick, swept} = controls({harness: daily({}), startAt: at(10, 9, 30)});

    scheduler.start(piSdk);
    await tick();

    expect(review).not.toHaveBeenCalled();
    expect(swept()).toBe(new Date(at(10, 9, 30)).toISOString());
  });

  it("catches up at the first tick after a restart that missed the time", async () => {
    const missed = controls({harness: daily({}), startAt: at(10, 23, 30), sweptAt: yesterday});
    missed.scheduler.start(piSdk);
    await missed.tick();
    expect(missed.review).toHaveBeenCalledTimes(1);

    // The stamp is what a restart reads back, so the day's sweep is not repeated by the new process.
    const restarted = controls({harness: daily({}), startAt: at(10, 23, 45), sweptAt: missed.swept()});
    restarted.scheduler.start(piSdk);
    await restarted.tick();
    expect(restarted.review).not.toHaveBeenCalled();

    const nextDay = controls({harness: daily({}), startAt: at(11, 9, 5), sweptAt: missed.swept()});
    nextDay.scheduler.start(piSdk);
    await nextDay.tick();
    expect(nextDay.review).toHaveBeenCalledTimes(1);
  });

  it("starts no sweep inside a quiet window that crosses midnight", async () => {
    const quiet = {from: "22:00", to: "07:00"};
    const {scheduler, review, tick, moveTo} = controls({
      harness: daily({dailyAt: "23:00", quietHours: quiet}),
      startAt: at(10, 23, 30),
      sweptAt: new Date(at(9, 23, 0)).toISOString(),
    });

    scheduler.start(piSdk);
    await tick();
    expect(review).not.toHaveBeenCalled();

    moveTo(at(11, 2, 0));
    await tick();
    expect(review).not.toHaveBeenCalled();

    // Past the window the missed sweep runs, without waiting for the configured time to come round again.
    moveTo(at(11, 7, 1));
    await tick();
    expect(review).toHaveBeenCalledWith({harnessId: "coding", trigger: "daily", scope: "full", piSdk});
  });

  it("skips the sweep once the day's budget is spent", async () => {
    const {scheduler, review, tick} = controls({harness: daily({}), spentToday: 2, startAt: at(10, 9, 0), sweptAt: yesterday});

    scheduler.start(piSdk);
    await tick();

    expect(review).not.toHaveBeenCalled();
  });

  it("sweeps nothing for a harness without a configured time", async () => {
    const {scheduler, review, tick} = controls({harness: harness(true), startAt: at(10, 9, 0), sweptAt: yesterday});

    scheduler.start(piSdk);
    await tick();

    expect(review).not.toHaveBeenCalled();
  });

  it("postpones an after-run pass that comes due inside quiet hours to the end of the window", async () => {
    const quiet = {from: "22:00", to: "07:00"};
    const {scheduler, review, timers, fire, moveTo} = controls({harness: harness(true, 2, {quietHours: quiet}), startAt: at(10, 22, 10)});

    await scheduler.noteRunFinished({harnessId: "coding", projectId: "project-a", piSdk});
    await fire();

    expect(review).not.toHaveBeenCalled();
    // Eight hours and fifty minutes, which is what is left of the window at ten past ten.
    expect(timers.at(-1)?.delayMs).toBe((8 * 60 + 50) * 60_000);

    moveTo(at(11, 7, 0));
    await fire();
    expect(review).toHaveBeenCalledWith({harnessId: "coding", projectId: "project-a", trigger: "after-run", scope: "memory", piSdk});
  });
});
