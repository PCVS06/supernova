import {renderToStaticMarkup} from "react-dom/server";
import {beforeEach, describe, expect, it, vi} from "vitest";
import type {CurationProposal, HarnessProject} from "@supernova/contracts/harnesses/schemas";
import CurationInbox from "@/features/harnesses/components/curation-inbox";

const rpc = vi.hoisted(() => ({
  curation: {data: undefined, isPending: false, isError: false, refetch: vi.fn()} as Record<string, unknown>,
  decide: {mutate: vi.fn(), reset: vi.fn(), isPending: false, error: undefined} as Record<string, unknown>,
  rollback: {mutate: vi.fn(), reset: vi.fn(), isPending: false, error: undefined} as Record<string, unknown>,
  scope: vi.fn(),
}));
vi.mock("@/features/harnesses/hooks/api/use-curation", () => ({
  useCuration: (harnessId: string) => {
    rpc.scope(harnessId);
    return rpc.curation;
  },
  useDecideCuration: () => rpc.decide,
  useRollbackCuration: () => rpc.rollback,
}));
vi.mock("@/features/harnesses/hooks/api/use-harnesses", () => ({useHarnessLibrary: () => ({data: {revision: 12, harnesses: [], projects: []}})}));

const lab: HarnessProject = {id: "lab", harnessId: "science", name: "Robot Lab", path: "/robot", systemPrompt: "", contextInstructions: "", agents: []};

const base = {harnessId: "science", tier: "approval" as const, createdAt: "2026-09-12T08:00:00Z", evidence: []};

const textProposal: CurationProposal = {
  ...base,
  id: "P-1",
  target: {kind: "harness", harnessId: "science"},
  change: {type: "text", find: "Cite every claim.\nKeep answers short.", replace: "Cite every claim.\nKeep answers short and dated."},
  rationale: "Three runs were steered to date their answers.",
  evidence: [{kind: "steer", ref: "chat-7", quote: "date the summary please"}],
  status: "pending",
};
const memoryProposal: CurationProposal = {
  ...base,
  id: "P-2",
  tier: "silent",
  target: {kind: "memory", harnessId: "science", projectId: "lab", recordId: "R-02"},
  change: {type: "memory", op: "supersede", supersededBy: "R-01", reason: "R-01 states the same fact with better evidence."},
  rationale: "Two records say the same thing.",
  status: "pending",
};
const logProposal: CurationProposal = {
  ...base,
  id: "P-3",
  tier: "notify",
  target: {kind: "document", harnessId: "science", projectId: "lab", path: "PLAN.md"},
  change: {type: "log", line: "2026-09-12 · Chose the inbox over a banner."},
  rationale: "The decision was taken in a chat and never written down.",
  status: "applied",
  appliedRevision: 11,
};
const rejectedProposal: CurationProposal = {
  ...base,
  id: "P-4",
  target: {kind: "role", harnessId: "science", agentName: "falsification-reviewer"},
  change: {type: "text", find: "Review the claim.", replace: "Review the claim and name the failure mode."},
  rationale: "The role produced malformed output three times.",
  status: "rejected",
  decisionReason: "The workflow contract was wrong, not the role.",
};
const requestedProposal: CurationProposal = {
  ...base,
  id: "P-6",
  tier: "notify",
  target: {kind: "document", harnessId: "science", projectId: "lab", path: "PLAN.md"},
  change: {type: "log", line: "2026-09-12 · Dropped the 2019 dataset."},
  rationale: "A chat filed the decision and the plan never recorded it.",
  evidence: [{kind: "request", ref: "chat-7", quote: "We stopped using the 2019 dataset."}],
  status: "pending",
};
const failedProposal: CurationProposal = {
  ...base,
  id: "P-5",
  target: {kind: "context", harnessId: "science"},
  change: {type: "text", find: "Always load the plan.", replace: "Load the plan when it changed."},
  rationale: "The context rule outgrew its reason.",
  status: "failed",
  error: "The text to replace was not found.",
};

const render = (proposals: readonly CurationProposal[], initialFilter?: "pending" | "applied" | "rejected" | "all") => {
  rpc.curation = {data: {proposals, reviews: []}, isPending: false, isError: false, refetch: vi.fn()};
  return renderToStaticMarkup(<CurationInbox harnessId="science" initialFilter={initialFilter} projects={[lab]} />);
};

describe("curation inbox", () => {
  beforeEach(() => {
    rpc.scope.mockClear();
    rpc.decide = {mutate: vi.fn(), reset: vi.fn(), isPending: false, error: undefined};
    rpc.rollback = {mutate: vi.fn(), reset: vi.fn(), isPending: false, error: undefined};
  });

  it("names each artefact, its tier and the evidence behind the proposal", () => {
    const html = render([textProposal, memoryProposal]);

    expect(rpc.scope).toHaveBeenCalledWith("science");
    expect(html).toContain("Harness instructions");
    expect(html).toContain("Memory · R-02 · Robot Lab");
    expect(html).toContain(">approval<");
    expect(html).toContain(">silent<");
    expect(html).toContain("Three runs were steered to date their answers.");
    expect(html).toContain("steer · chat-7");
    expect(html).toContain("date the summary please");
    expect(html).toContain("<details");
  });

  it("names a request filed from a chat as its own kind of evidence", () => {
    const html = render([requestedProposal]);

    expect(html).toContain("request · chat-7");
    expect(html).toContain("We stopped using the 2019 dataset.");
  });

  it("shows a text change as two columns with the changed lines marked", () => {
    const html = render([textProposal]);

    expect(html).toContain(">Current<");
    expect(html).toContain(">Proposed<");
    expect(html).toContain("text-diff-removed");
    expect(html).toContain("text-diff-added");
    expect(html).toContain("Keep answers short and dated.");
    expect(html).toContain("font-mono");
  });

  it("says what a memory change and a log change do in words", () => {
    expect(render([memoryProposal])).toContain("Supersede R-02 by R-01");
    expect(render([memoryProposal])).toContain("R-01 states the same fact with better evidence.");
    const log = render([{...logProposal, status: "pending"}]);
    expect(log).toContain("PLAN.md · Robot Lab");
    expect(log).toContain("2026-09-12 · Chose the inbox over a banner.");
  });

  it("offers a decision only while a proposal waits, and a rollback once it is applied", () => {
    const pending = render([textProposal]);
    const applied = render([logProposal], "applied");

    expect(pending).toContain(">Approve<");
    expect(pending).toContain(">Edit<");
    expect(pending).toContain(">Reject<");
    expect(pending).not.toContain("Roll back");
    expect(applied).toContain("Applied at revision 11");
    expect(applied).toContain(">Roll back<");
    expect(applied).not.toContain(">Approve<");
    // A log change has no replacement text, so it cannot be edited before approval.
    expect(render([{...logProposal, status: "pending"}])).not.toContain(">Edit<");
  });

  it("shows pending proposals first and keeps every other state one chip away", () => {
    const html = render([textProposal, logProposal, rejectedProposal]);

    expect(html).toContain('aria-label="Pending" aria-pressed="true"');
    expect(html).toContain('aria-label="Applied" aria-pressed="false"');
    expect(html).toContain('aria-label="Rejected" aria-pressed="false"');
    expect(html).toContain('aria-label="All" aria-pressed="false"');
    expect(html).toContain("Three runs were steered to date their answers.");
    expect(html).not.toContain("The decision was taken in a chat and never written down.");
    expect(html).not.toContain("The workflow contract was wrong, not the role.");
  });

  it("keeps a failed apply and a refused decision readable on the card itself", () => {
    const failed = render([failedProposal], "all");
    rpc.decide = {mutate: vi.fn(), reset: vi.fn(), isPending: false, error: new Error("Settings changed elsewhere.")};
    const refused = render([textProposal]);

    expect(failed).toContain("The text to replace was not found.");
    expect(failed).toContain("text-danger-ink");
    expect(refused).toContain("Settings changed elsewhere. Nothing was changed.");
    expect(refused).toContain("Harness instructions");
  });

  it("says what to do next when nothing is waiting", () => {
    const empty = render([]);

    expect(empty).toContain("Nothing waiting. Run a review from the Curator page.");
  });
});
