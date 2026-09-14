import type {ReactNode} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {beforeEach, describe, expect, it, vi} from "vitest";
import type {CurationProposal, CuratorReview, HarnessConfig, HarnessProject} from "@supernova/contracts/harnesses/schemas";
import InboxPage from "@/features/harnesses/pages/inbox-page";

const state = vi.hoisted(() => ({
  harnesses: [] as unknown[],
  projects: [] as unknown[],
  proposals: [] as unknown[],
  reviews: [] as unknown[],
}));

function MockLink(props: {readonly children: ReactNode; readonly className?: string; readonly params?: Record<string, string>; readonly to: string}) {
  const {children, className, params, to} = props;
  const href = Object.entries(params ?? {}).reduce((current, [key, value]) => current.replace(`$${key}`, value), to);

  return (
    <a className={className} href={href}>
      {children}
    </a>
  );
}

vi.mock("@tanstack/react-router", () => ({Link: MockLink}));
vi.mock("@/features/harnesses/hooks/api/use-harnesses", () => ({
  useHarnessLibrary: () => ({data: {revision: 12, harnesses: state.harnesses, projects: state.projects}, isError: false, isPending: false}),
}));
vi.mock("@/features/harnesses/hooks/api/use-curation", () => ({
  useCuration: () => ({data: {proposals: state.proposals, reviews: state.reviews, requests: []}, isPending: false, isError: false, refetch: vi.fn()}),
  useDecideCuration: () => ({mutate: vi.fn(), reset: vi.fn(), isPending: false, error: undefined}),
  useRollbackCuration: () => ({mutate: vi.fn(), reset: vi.fn(), isPending: false, error: undefined}),
}));

const lab: HarnessProject = {id: "lab", harnessId: "science", name: "Robot Lab", path: "/robot", systemPrompt: "", contextInstructions: "", agents: []};

const science: HarnessConfig = {
  id: "science",
  name: "Science Pi",
  description: "Research",
  systemPrompt: "",
  agents: [],
  extensions: [],
  skills: [],
  context: {instructions: "", files: [], includeProjectInstructions: true, autoCompaction: true, reserveTokens: 0, keepRecentTokens: 0},
  graph: {steps: []},
  loop: {maxTurns: 10, timeoutSeconds: 60},
};

const proposal: CurationProposal = {
  id: "P-1",
  harnessId: "science",
  tier: "approval",
  createdAt: "2026-09-12T08:00:00Z",
  target: {kind: "memory", harnessId: "science", projectId: "lab", recordId: "R-02"},
  change: {type: "memory", op: "retract", reason: "The record was superseded twice."},
  rationale: "Two records say the same thing.",
  evidence: [],
  status: "pending",
};

const review: CuratorReview = {
  id: "V-2",
  harnessId: "science",
  trigger: "daily",
  status: "completed",
  startedAt: new Date(Date.now() - 3_600_000).toISOString(),
  finishedAt: new Date().toISOString(),
  summary: "One duplicate record.",
  proposals: 1,
  applied: 0,
  spentUsd: 0.12,
};

const swept: CuratorReview = {
  ...review,
  id: "V-1",
  status: "failed",
  startedAt: new Date(Date.now() - 7_200_000).toISOString(),
  summary: "",
  error: "The provider refused the request.",
  instructionChars: 48_240,
};

describe("inbox page", () => {
  beforeEach(() => {
    state.harnesses = [science];
    state.projects = [lab];
    state.proposals = [proposal];
    state.reviews = [review];
  });

  it("names the harness, says decisions are immediate, and puts the proposals above the reviews", () => {
    const html = renderToStaticMarkup(<InboxPage harnessId="science" />);

    expect(html).toContain("Science Pi");
    expect(html).toContain(">Inbox<");
    expect(html).toContain("Decisions apply at once.");
    expect(html).toContain("Memory · R-02 · Robot Lab");
    expect(html).toContain(">Approve<");
    expect(html.indexOf("Memory · R-02 · Robot Lab")).toBeLessThan(html.indexOf(">Reviews<"));
    expect(html).toContain("1 h ago · daily · completed · 1 proposals · 0 applied · $0.12");
    // The inbox decides work, so it never carries the settings save bar.
    expect(html).not.toContain("Save changes");
  });

  it("still lists the reviews when nothing is waiting, newest first, with the reason a review failed", () => {
    state.proposals = [];
    state.reviews = [swept, review];
    const html = renderToStaticMarkup(<InboxPage harnessId="science" />);

    expect(html).toContain("Nothing waiting. Run a review from the Curator page.");
    expect(html).toContain(">Reviews<");
    expect(html).toContain("2 h ago · daily · failed · 1 proposals · 0 applied · $0.12 · 48.2k chars");
    expect(html).toContain("The provider refused the request.");
    expect(html.indexOf("1 h ago · daily · completed")).toBeLessThan(html.indexOf("2 h ago · daily · failed"));
  });

  it("says so and points at the library when the harness is gone", () => {
    const html = renderToStaticMarkup(<InboxPage harnessId="gone" />);

    expect(html).toContain("This harness no longer exists.");
    expect(html).toContain('href="/settings/harnesses"');
    expect(html).not.toContain(">Reviews<");
  });
});
