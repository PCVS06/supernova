import {afterEach, describe, expect, it} from "vitest";
import type {CurationProposal, CuratorReview} from "@supernova/contracts/harnesses/schemas";
import {curatorMetrics} from "@supernova/agent-runtime/layers/curator/lib/curator-metrics";
import {createCuratorFixture, writeReceipt} from "@tests/support/layers/curator-test-utils";
import type {CuratorFixture} from "@tests/support/layers/curator-test-utils";

const dayMs = 24 * 60 * 60 * 1000;
const ago = (days: number) => new Date(Date.now() - days * dayMs).toISOString();

function proposal(overrides: Partial<CurationProposal>): CurationProposal {
  return {
    id: "proposal-1",
    harnessId: "coding",
    target: {kind: "harness", harnessId: "coding"},
    change: {type: "text", find: "Never cite the source.", replace: ""},
    tier: "approval",
    rationale: "Contradicts the rule above it.",
    evidence: [{kind: "run", ref: "run-1", quote: "cited nothing"}],
    status: "pending",
    createdAt: ago(3),
    ...overrides,
  };
}

function review(overrides: Partial<CuratorReview>): CuratorReview {
  return {
    id: "review-1",
    harnessId: "coding",
    trigger: "daily",
    status: "completed",
    startedAt: ago(3),
    summary: "Proposed one removal.",
    proposals: 1,
    applied: 0,
    ...overrides,
  };
}

describe("curator metrics", () => {
  const fixtures: CuratorFixture[] = [];
  afterEach(async () => {
    while (fixtures.length) await fixtures.pop()!.cleanup();
  });

  async function fixture() {
    const created = await createCuratorFixture();
    fixtures.push(created);
    await created.store.bindSession("chat-1", await created.store.resolveProject(created.projectId));
    return created;
  }

  it("counts proposals, failures, steers, size, spend and requests over a week and the week before", async () => {
    const created = await fixture();
    const chat = {chatId: "chat-1", projectId: created.projectId, projectPath: created.projectPath};
    await writeReceipt(created.runs, {...chat, startedAt: ago(1), status: "completed"});
    await writeReceipt(created.runs, {...chat, startedAt: ago(2), error: "no JSON object in the answer"});
    await writeReceipt(created.runs, {...chat, agentName: "scout", startedAt: ago(3), status: "completed"});
    // The week before: two runs of the same role, both failed.
    await writeReceipt(created.runs, {...chat, startedAt: ago(9), error: "no JSON object in the answer"});
    await writeReceipt(created.runs, {...chat, startedAt: ago(10), error: "no JSON object in the answer"});
    await created.runs.appendSteer("chat-1", "Cite the source", ago(1));
    await created.runs.appendSteer("chat-1", "Answer with JSON", ago(2));
    await created.runs.appendSteer("chat-1", "Stop rewriting the plan", ago(9));

    await created.curation.addProposal(proposal({}));
    await created.curation.addProposal(proposal({id: "proposal-2", status: "applied", decidedAt: ago(2)}));
    await created.curation.addProposal(proposal({id: "proposal-3", status: "rejected", decidedAt: ago(1), decisionReason: "Still needed."}));
    await created.curation.addProposal(proposal({id: "proposal-4", status: "rejected", decidedAt: ago(4), decisionReason: "The plan says otherwise."}));
    // Decided before the window, so it is not counted, though its reason is still readable.
    await created.curation.addProposal(proposal({id: "proposal-5", status: "rolled-back", decidedAt: ago(9)}));
    await created.curation.addReview(review({id: "review-old", startedAt: ago(9), instructionChars: 999, spentUsd: 5}));
    await created.curation.addReview(review({id: "review-1", startedAt: ago(5), instructionChars: 300, spentUsd: 0.2}));
    await created.curation.addReview(review({id: "review-2", startedAt: ago(1), instructionChars: 120, spentUsd: 0.1}));
    await created.curation.addReview(review({id: "review-today", startedAt: new Date().toISOString(), instructionChars: 110, spentUsd: 0.05}));
    await created.curation.addRequest({
      id: "request-1",
      harnessId: created.harnessId,
      projectId: created.projectId,
      chatId: "chat-1",
      kind: "decision",
      text: "We ferment at 12 degrees.",
      at: ago(2),
    });

    const metrics = await curatorMetrics({harnessId: created.harnessId, store: created.store, curation: created.curation, runs: created.runs});

    expect(metrics).toMatchObject({
      windowDays: 7,
      proposals: {pending: 1, applied: 1, rejected: 2, rolledBack: 0},
      rejectionReasons: ["Still needed.", "The plan says otherwise."],
      steersPerChat: {current: 2, previous: 1},
      spend: {window: 0.35, maxPerDay: 2, today: 0.05},
      requests: 1,
    });
    // The oldest size recorded inside the window is what the current size is compared against.
    expect(metrics.instructionChars).toEqual({current: "Always cite the source.\nNever cite the source.".length + "This project studies fermentation.".length, previous: 300});
    expect(metrics.failures).toEqual([
      {agentName: "reviewer", runs: 2, failed: 1, previousRuns: 2, previousFailed: 2},
      {agentName: "scout", runs: 1, failed: 0, previousRuns: 0, previousFailed: 0},
    ]);
  });

  it("reads zeros for a harness nothing has happened to", async () => {
    const created = await fixture();

    const metrics = await curatorMetrics({harnessId: "science", store: created.store, curation: created.curation, runs: created.runs});

    expect(metrics).toMatchObject({
      proposals: {pending: 0, applied: 0, rejected: 0, rolledBack: 0},
      rejectionReasons: [],
      failures: [],
      steersPerChat: {current: 0, previous: 0},
      instructionChars: {current: 0},
      spend: {today: 0, window: 0, maxPerDay: 0},
      requests: 0,
    });
  });
});
