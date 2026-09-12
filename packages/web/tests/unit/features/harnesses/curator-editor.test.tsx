import {renderToStaticMarkup} from "react-dom/server";
import {beforeEach, describe, expect, it, vi} from "vitest";
import type {CuratorReview, HarnessConfig} from "@supernova/contracts/harnesses/schemas";
import CuratorEditor from "@/features/harnesses/components/curator-editor";
import {curatorConfigPatch, defaultCuratorConfig} from "@/features/harnesses/lib/curator-config";

const rpc = vi.hoisted(() => ({
  curation: {data: {proposals: [], reviews: []}, isPending: false, isError: false, refetch: vi.fn()} as Record<string, unknown>,
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

const render = (config?: HarnessConfig["curator"]) =>
  renderToStaticMarkup(<CuratorEditor harness={{...harness, curator: config}} onChangeHarness={vi.fn()} onOpenInbox={vi.fn()} />);

describe("curator configuration", () => {
  beforeEach(() => {
    rpc.curation = {data: {proposals: [], reviews: []}, isPending: false, isError: false, refetch: vi.fn()};
    rpc.review = {mutate: vi.fn(), reset: vi.fn(), isPending: false, error: undefined};
  });

  it("writes a complete configuration the moment an unconfigured curator is changed", () => {
    expect(curatorConfigPatch(undefined, {enabled: true})).toEqual({...defaultCuratorConfig, enabled: true});
    expect(defaultCuratorConfig).toEqual({enabled: false, maxCostUsdPerRun: 0.5, maxCostUsdPerDay: 2, autoApply: {memory: false, planningLog: false}});
  });

  it("keeps the other settings when one of them changes", () => {
    const configured = curatorConfigPatch(undefined, {enabled: true});
    const withMemory = curatorConfigPatch(configured, {autoApply: {...configured.autoApply, memory: true}});
    const cheaper = curatorConfigPatch(withMemory, {maxCostUsdPerRun: 0.2});

    expect(withMemory.autoApply).toEqual({memory: true, planningLog: false});
    expect(cheaper).toEqual({...withMemory, maxCostUsdPerRun: 0.2});
  });

  it("orders the panel from status through model, auto-apply and limits to the review history", () => {
    const html = render();

    expect(html.indexOf(">Status<")).toBeLessThan(html.indexOf(">Model<"));
    expect(html.indexOf(">Model<")).toBeLessThan(html.indexOf(">Auto-apply<"));
    expect(html.indexOf(">Auto-apply<")).toBeLessThan(html.indexOf(">Spend limits<"));
    expect(html.indexOf(">Spend limits<")).toBeLessThan(html.indexOf(">Reviews<"));
    expect(html).toContain("Uses the harness model");
    expect(html).toContain('aria-label="Memory hygiene"');
    expect(html).toContain('aria-label="Plan log"');
    expect(html).toContain('aria-label="Per review in USD"');
    expect(html).toContain('aria-label="Per day in USD"');
    expect(html).toContain("No reviews yet.");
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
      data: {proposals: [{status: "pending"}, {status: "applied"}], reviews: [failed, completed]},
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

  it("says a review is running instead of offering a second one", () => {
    rpc.review = {mutate: vi.fn(), reset: vi.fn(), isPending: true, error: undefined};
    const html = render();

    expect(html).toContain('disabled="">Reviewing…</button>');
    expect(html).not.toContain(">Review now</button>");
  });
});
