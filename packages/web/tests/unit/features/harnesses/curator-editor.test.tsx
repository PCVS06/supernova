import {renderToStaticMarkup} from "react-dom/server";
import {beforeEach, describe, expect, it, vi} from "vitest";
import type {CurationRequest, CuratorMetrics, CuratorReview, HarnessConfig} from "@supernova/contracts/harnesses/schemas";
import CuratorEditor from "@/features/harnesses/components/curator-editor";
import {compactChars, percent} from "@/features/harnesses/lib/curation-format";
import {curatorConfigPatch, defaultCuratorConfig, isClockTime} from "@/features/harnesses/lib/curator-config";

const rpc = vi.hoisted(() => ({
  curation: {data: {proposals: [], reviews: [], requests: []}, isPending: false, isError: false, refetch: vi.fn()} as Record<string, unknown>,
  review: {mutate: vi.fn(), reset: vi.fn(), isPending: false, error: undefined} as Record<string, unknown>,
}));
vi.mock("@/features/harnesses/hooks/api/use-curation", () => ({
  useCuration: () => rpc.curation,
  useRunCuratorReview: () => rpc.review,
}));
vi.mock("@/features/harnesses/components/execution-editor", () => ({default: (props: {inheritLabel: string}) => <div>{props.inheritLabel}</div>}));

const harness: HarnessConfig = {
  id: "science",
  name: "Science Pi",
  description: "Research",
  systemPrompt: "Shared rules",
  agents: [],
  extensions: [],
  skills: [],
  context: {instructions: "", files: [], includeProjectInstructions: true, autoCompaction: true, reserveTokens: 0, keepRecentTokens: 0},
  graph: {steps: []},
  loop: {maxTurns: 10, timeoutSeconds: 60},
};

const completed: CuratorReview = {
  id: "V-2",
  harnessId: "science",
  trigger: "manual",
  status: "completed",
  startedAt: new Date(Date.now() - 3_600_000).toISOString(),
  finishedAt: new Date().toISOString(),
  summary: "Two rules no run needed; one duplicate record.",
  proposals: 3,
  applied: 1,
  spentUsd: 0.12,
};
const failed: CuratorReview = {
  ...completed,
  id: "V-1",
  status: "failed",
  startedAt: new Date(Date.now() - 7_200_000).toISOString(),
  summary: "",
  proposals: 0,
  applied: 0,
  error: "The provider refused the request.",
};
const swept: CuratorReview = {
  ...completed,
  id: "V-0",
  trigger: "daily",
  startedAt: new Date(Date.now() - 10_800_000).toISOString(),
  proposals: 2,
  instructionChars: 48_240,
};

const metrics: CuratorMetrics = {
  windowDays: 7,
  proposals: {pending: 2, applied: 3, rejected: 1, rolledBack: 0},
  rejectionReasons: ["The workflow contract was wrong, not the role.", "The rule already exists in the project."],
  failures: [
    {agentName: "statistician", runs: 6, failed: 2, previousRuns: 4, previousFailed: 1},
    {agentName: "source-verifier", runs: 3, failed: 3, previousRuns: 0, previousFailed: 0},
    {agentName: "academic-editor", runs: 0, failed: 0, previousRuns: 0, previousFailed: 0},
  ],
  steersPerChat: {current: 1.4, previous: 2.2},
  instructionChars: {current: 48_240, previous: 51_000},
  spend: {today: 0.41, window: 1.2, maxPerDay: 2},
  requests: 4,
};
const quiet: CuratorMetrics = {
  ...metrics,
  proposals: {pending: 0, applied: 0, rejected: 0, rolledBack: 0},
  rejectionReasons: [],
  failures: [{agentName: "statistician", runs: 0, failed: 0, previousRuns: 0, previousFailed: 0}],
  instructionChars: {current: 940},
  requests: 0,
};

const decision: CurationRequest = {
  id: "Q-2",
  harnessId: "science",
  projectId: "lab",
  chatId: "chat-7",
  kind: "decision",
  agentName: "source-verifier",
  text: "We stopped using the 2019 dataset.",
  at: new Date(Date.now() - 3_600_000).toISOString(),
};
const problem: CurationRequest = {
  id: "Q-1",
  harnessId: "science",
  projectId: "lab",
  chatId: "chat-4",
  kind: "problem",
  text: "The reviewer keeps answering without the schema.",
  at: new Date(Date.now() - 7_200_000).toISOString(),
};

const render = (config?: HarnessConfig["curator"]) =>
  renderToStaticMarkup(<CuratorEditor harness={{...harness, curator: config}} onChangeHarness={vi.fn()} onOpenInbox={vi.fn()} />);

describe("curator configuration", () => {
  beforeEach(() => {
    rpc.curation = {data: {proposals: [], reviews: [], requests: []}, isPending: false, isError: false, refetch: vi.fn()};
    rpc.review = {mutate: vi.fn(), reset: vi.fn(), isPending: false, error: undefined};
  });

  it("writes a complete configuration the moment an unconfigured curator is changed", () => {
    expect(curatorConfigPatch(undefined, {enabled: true})).toEqual({...defaultCuratorConfig, enabled: true});
    expect(defaultCuratorConfig).toEqual({enabled: false, maxCostUsdPerRun: 0.5, maxCostUsdPerDay: 2, autoApply: {memory: false, planningLog: false}, cooldownDays: 7});
  });

  it("keeps the other settings when one of them changes", () => {
    const configured = curatorConfigPatch(undefined, {enabled: true});
    const withMemory = curatorConfigPatch(configured, {autoApply: {...configured.autoApply, memory: true}});
    const cheaper = curatorConfigPatch(withMemory, {maxCostUsdPerRun: 0.2});

    expect(withMemory.autoApply).toEqual({memory: true, planningLog: false});
    expect(cheaper).toEqual({...withMemory, maxCostUsdPerRun: 0.2});
  });

  it("saves a cleared schedule as absent rather than as empty times", () => {
    const scheduled = curatorConfigPatch(undefined, {dailyAt: "21:30", quietHours: {from: "22:00", to: "07:00"}});
    const withoutDaily = curatorConfigPatch(scheduled, {dailyAt: ""});
    const withoutQuiet = curatorConfigPatch(scheduled, {quietHours: {from: "", to: ""}});

    expect(scheduled.dailyAt).toBe("21:30");
    expect(scheduled.quietHours).toEqual({from: "22:00", to: "07:00"});
    expect(withoutDaily).not.toHaveProperty("dailyAt");
    expect(withoutDaily.quietHours).toEqual({from: "22:00", to: "07:00"});
    expect(withoutQuiet).not.toHaveProperty("quietHours");
    expect(withoutQuiet.dailyAt).toBe("21:30");
  });

  it("accepts only a 24-hour clock time", () => {
    expect(["00:00", "09:05", "21:30", "23:59"].every(isClockTime)).toBe(true);
    expect(["", "9:30", "24:00", "21:60", "21:3", "2130", "ab:cd"].some(isClockTime)).toBe(false);
  });

  it("shortens counts and reads the accepted share off the decided proposals", () => {
    expect([compactChars(940), compactChars(48_240), compactChars(1_240_000)]).toEqual(["940", "48.2k", "1.2M"]);
    expect(percent(3, 1)).toBe("75%");
    expect(percent(0, 0)).toBe("—");
  });

  it("orders the panel from status through model, auto-apply, schedule and signals to the limits, reviews and requests", () => {
    const html = render();

    expect(html.indexOf(">Status<")).toBeLessThan(html.indexOf(">Model<"));
    expect(html.indexOf(">Model<")).toBeLessThan(html.indexOf(">Auto-apply<"));
    expect(html.indexOf(">Auto-apply<")).toBeLessThan(html.indexOf(">Schedule<"));
    expect(html.indexOf(">Schedule<")).toBeLessThan(html.indexOf(">Signals<"));
    expect(html.indexOf(">Signals<")).toBeLessThan(html.indexOf(">Spend limits<"));
    expect(html.indexOf(">Spend limits<")).toBeLessThan(html.indexOf(">Reviews<"));
    expect(html.indexOf(">Reviews<")).toBeLessThan(html.indexOf(">Requests<"));
    expect(html).toContain("Uses the harness model");
    expect(html).toContain('aria-label="Memory hygiene"');
    expect(html).toContain('aria-label="Plan log"');
    expect(html).toContain('aria-label="Per review in USD"');
    expect(html).toContain('aria-label="Per day in USD"');
    expect(html).toContain("No reviews yet.");
    expect(html).toContain("No requests from chats yet.");
  });

  it("shows the saved limits and the switch states of a configured curator", () => {
    const html = render({enabled: true, maxCostUsdPerRun: 0.25, maxCostUsdPerDay: 1.5, autoApply: {memory: true, planningLog: false}});

    expect(html).toContain('value="0.25"');
    expect(html).toContain('value="1.5"');
    expect(html).toMatch(/data-checked="" role="switch"[^>]*aria-label="Curator"/);
    expect(html).toMatch(/data-checked="" role="switch"[^>]*aria-label="Memory hygiene"/);
    expect(html).toMatch(/data-unchecked="" role="switch"[^>]*aria-label="Plan log"/);
  });

  it("reports the last review, its spend and the way into the inbox", () => {
    rpc.curation = {
      data: {proposals: [{status: "pending"}, {status: "applied"}], reviews: [failed, completed], requests: []},
      isPending: false,
      isError: false,
      refetch: vi.fn(),
    };
    const html = render();

    expect(html).toContain("1 h ago · manual · 3 proposals · 1 applied · $0.12");
    expect(html).toContain("Two rules no run needed; one duplicate record.");
    expect(html).toContain("Open inbox (1 pending)");
    expect(html).toContain("The provider refused the request.");
    expect(html.indexOf("1 h ago · manual · completed")).toBeLessThan(html.indexOf("2 h ago · manual · failed"));
  });

  it("names a daily sweep in the review history and reports the instructions it read", () => {
    rpc.curation = {data: {proposals: [], reviews: [swept], requests: []}, isPending: false, isError: false, refetch: vi.fn()};
    const html = render();

    expect(html).toContain("3 h ago · daily · completed · 2 proposals · 1 applied · $0.12 · 48.2k chars");
  });

  it("says a review is running instead of offering a second one", () => {
    rpc.review = {mutate: vi.fn(), reset: vi.fn(), isPending: true, error: undefined};
    const html = render();

    expect(html).toContain('disabled="">Reviewing…</button>');
    expect(html).not.toContain(">Review now</button>");
  });
});

describe("curator schedule", () => {
  beforeEach(() => {
    rpc.curation = {data: {proposals: [], reviews: [], requests: []}, isPending: false, isError: false, refetch: vi.fn()};
    rpc.review = {mutate: vi.fn(), reset: vi.fn(), isPending: false, error: undefined};
  });

  it("shows the saved sweep, quiet window and cooldown", () => {
    const html = render({...defaultCuratorConfig, enabled: true, dailyAt: "21:30", quietHours: {from: "22:00", to: "07:00"}, cooldownDays: 3});

    expect(html).toContain('aria-label="Daily sweep time"');
    expect(html).toContain('value="21:30"');
    expect(html).toContain('aria-label="Quiet hours from"');
    expect(html).toContain('value="22:00"');
    expect(html).toContain('aria-label="Quiet hours to"');
    expect(html).toContain('value="07:00"');
    expect(html).toContain('aria-label="Cooldown in days"');
    expect(html).toContain('value="3"');
    expect(html).toContain("Full review of the harness once a day at this local time. Empty means none.");
    expect(html).toContain("No review starts inside this window.");
    expect(html).toContain("Days before an artefact can be proposed against again without newer evidence.");
  });

  it("falls back to the default cooldown and stays quiet while the times are sound", () => {
    const html = render({...defaultCuratorConfig, cooldownDays: undefined});

    expect(html).toContain('value="7"');
    expect(html).not.toContain("Use HH:MM, such as 21:30.");
  });

  it("marks a time that is not a clock time", () => {
    const html = render({...defaultCuratorConfig, dailyAt: "25:00"});

    expect(html).toContain("Use HH:MM, such as 21:30.");
    expect(html).toContain('role="alert"');
  });
});

describe("curator signals", () => {
  beforeEach(() => {
    rpc.review = {mutate: vi.fn(), reset: vi.fn(), isPending: false, error: undefined};
  });

  it("reads the window off the tiles, newest measure first and the one before it beside", () => {
    rpc.curation = {data: {proposals: [], reviews: [], requests: [], metrics}, isPending: false, isError: false, refetch: vi.fn()};
    const html = render();

    expect(html.indexOf(">Accepted<")).toBeLessThan(html.indexOf(">Pending<"));
    expect(html.indexOf(">Pending<")).toBeLessThan(html.indexOf(">Steers per chat<"));
    expect(html.indexOf(">Steers per chat<")).toBeLessThan(html.indexOf(">Instructions<"));
    expect(html.indexOf(">Instructions<")).toBeLessThan(html.indexOf(">Spend today<"));
    expect(html.indexOf(">Spend today<")).toBeLessThan(html.indexOf(">Requests<"));
    expect(html).toContain("75%");
    expect(html).toContain("1.4");
    expect(html).toContain("was 2.2");
    expect(html).toContain("48.2k");
    expect(html).toContain("was 51.0k");
    expect(html).toContain("$0.41 of $2.00");
  });

  it("ranks the failing agents and keeps the ones that never ran out of the table", () => {
    rpc.curation = {data: {proposals: [], reviews: [], requests: [], metrics}, isPending: false, isError: false, refetch: vi.fn()};
    const html = render();

    expect(html).toContain(">Agent<");
    expect(html).toContain(">Runs<");
    expect(html).toContain(">Failed<");
    expect(html).toContain(">Previous<");
    expect(html.indexOf("Source verifier")).toBeLessThan(html.indexOf("Statistician"));
    expect(html).toContain(">1/4<");
    expect(html).toContain(">0/0<");
    expect(html).not.toContain("Academic editor");
    expect(html).toContain("The workflow contract was wrong, not the role.");
  });

  it("says so when nothing was decided, nothing ran and nothing was rejected", () => {
    rpc.curation = {data: {proposals: [], reviews: [], requests: [], metrics: quiet}, isPending: false, isError: false, refetch: vi.fn()};
    const html = render();

    expect(html).toContain("—");
    expect(html).toContain("No runs in the last 7 days.");
    expect(html).toContain("None.");
    expect(html).toContain(">940<");
    // Only the steer tile has a window before it; the instruction size was never measured earlier.
    expect(html.match(/was /g)).toHaveLength(1);
  });

  it("waits for the first measurement instead of showing empty tiles", () => {
    rpc.curation = {data: {proposals: [], reviews: [], requests: []}, isPending: false, isError: false, refetch: vi.fn()};

    expect(render()).toContain("No signals yet.");
  });
});

describe("curator requests", () => {
  beforeEach(() => {
    rpc.review = {mutate: vi.fn(), reset: vi.fn(), isPending: false, error: undefined};
  });

  it("lists what the chats filed, newest first, and keeps the list short", () => {
    const older = Array.from({length: 10}, (_, index) => ({...problem, id: `Q-old-${index}`, text: `Older request ${index}`, at: new Date(Date.now() - 86_400_000).toISOString()}));
    rpc.curation = {data: {proposals: [], reviews: [], requests: [...older, problem, decision]}, isPending: false, isError: false, refetch: vi.fn()};
    const html = render();

    expect(html).toContain("1 h ago · Decision · Source verifier · We stopped using the 2019 dataset.");
    expect(html).toContain("2 h ago · Problem · The reviewer keeps answering without the schema.");
    expect(html.indexOf("We stopped using the 2019 dataset.")).toBeLessThan(html.indexOf("The reviewer keeps answering without the schema."));
    expect(html).not.toContain("Older request 9");
  });

  it("says nothing was filed yet when no chat asked for anything", () => {
    rpc.curation = {data: {proposals: [], reviews: [], requests: []}, isPending: false, isError: false, refetch: vi.fn()};

    expect(render()).toContain("No requests from chats yet.");
  });
});
