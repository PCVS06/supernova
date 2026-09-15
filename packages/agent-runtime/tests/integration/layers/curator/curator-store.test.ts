import {mkdtemp, readFile, rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {afterEach, beforeEach, describe, expect, it} from "vitest";
import type {CurationProposal, CuratorReview} from "@supernova/contracts/harnesses/schemas";
import {CuratorStore} from "@supernova/agent-runtime/layers/curator/curator-store";
import {targetKey} from "@supernova/agent-runtime/layers/curator/lib/curator-targets";

function proposal(overrides: Partial<CurationProposal> = {}): CurationProposal {
  return {
    id: "proposal-1",
    harnessId: "coding",
    reviewId: "review-1",
    target: {kind: "harness", harnessId: "coding"},
    change: {type: "text", find: "Never cite the source.", replace: ""},
    tier: "approval",
    rationale: "Contradicts the rule above it.",
    evidence: [{kind: "run", ref: "run-1", quote: "cited nothing"}],
    status: "pending",
    createdAt: "2026-09-10T10:00:00.000Z",
    ...overrides,
  };
}

function review(overrides: Partial<CuratorReview> = {}): CuratorReview {
  return {
    id: "review-1",
    harnessId: "coding",
    trigger: "manual",
    status: "completed",
    startedAt: "2026-09-10T10:00:00.000Z",
    finishedAt: "2026-09-10T10:02:00.000Z",
    summary: "Proposed one removal.",
    proposals: 1,
    applied: 0,
    spentUsd: 0.12,
    ...overrides,
  };
}

describe("curator store", () => {
  let root: string;
  let store: CuratorStore;
  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "pi-plus-curation-test-"));
    store = new CuratorStore(join(root, "curation"));
  });
  afterEach(async () => {
    await rm(root, {recursive: true, force: true});
  });

  it("round-trips a proposal, finds it by id alone and lists newest first", async () => {
    await store.addProposal(proposal());
    await store.addProposal(proposal({id: "proposal-2", createdAt: "2026-09-10T11:00:00.000Z"}));
    await store.addProposal(proposal({id: "proposal-3", harnessId: "science", createdAt: "2026-09-10T12:00:00.000Z"}));

    expect((await store.listProposals("coding")).map((item) => item.id)).toEqual(["proposal-2", "proposal-1"]);
    expect((await store.getProposal("proposal-3"))?.harnessId).toBe("science");
    expect(await store.getProposal("missing")).toBeUndefined();
    expect(JSON.parse(await readFile(join(root, "curation", "coding", "proposals", "proposal-1.json"), "utf8")).change).toEqual({
      type: "text",
      find: "Never cite the source.",
      replace: "",
    });

    const decided = await store.updateProposal({...proposal(), status: "rejected", decidedAt: "2026-09-10T12:00:00.000Z", decisionReason: "Still needed."});
    expect(decided.status).toBe("rejected");
    expect((await store.getProposal("proposal-1"))?.decisionReason).toBe("Still needed.");
    expect(await store.listProposals("coding")).toHaveLength(2);
  });

  it("lists at most fifty reviews, newest first", async () => {
    for (let index = 0; index < 55; index += 1) {
      await store.addReview(review({id: `review-${index}`, startedAt: `2026-09-10T${String(index % 24).padStart(2, "0")}:00:00.000Z`}));
    }

    const reviews = await store.listReviews("coding");
    expect(reviews).toHaveLength(50);
    expect(reviews[0]!.startedAt >= reviews[49]!.startedAt).toBe(true);
  });

  it("finds the latest decision on one artefact, ignoring the ones still pending", async () => {
    const role = {kind: "role" as const, harnessId: "coding", agentName: "reviewer"};
    await store.addProposal(proposal({id: "p-1", target: role, status: "applied", decidedAt: "2026-09-01T10:00:00.000Z"}));
    await store.addProposal(proposal({id: "p-2", target: role, status: "rejected", decidedAt: "2026-09-05T10:00:00.000Z"}));
    await store.addProposal(proposal({id: "p-3", target: role, status: "pending", createdAt: "2026-09-09T10:00:00.000Z"}));
    await store.addProposal(proposal({id: "p-4", status: "applied", decidedAt: "2026-09-08T10:00:00.000Z"}));

    expect(await store.lastDecision("coding", targetKey(role))).toEqual({at: "2026-09-05T10:00:00.000Z", status: "rejected"});
    expect(await store.lastDecision("coding", targetKey({kind: "harness", harnessId: "coding"}))).toEqual({at: "2026-09-08T10:00:00.000Z", status: "applied"});
    expect(await store.lastDecision("coding", targetKey({kind: "context", harnessId: "coding"}))).toBeUndefined();
  });

  it("remembers when a harness was last swept", async () => {
    expect(await store.lastSweepAt("coding")).toBeUndefined();

    await store.markSwept("coding", "2026-09-10T03:30:00.000Z");

    expect(await store.lastSweepAt("coding")).toBe("2026-09-10T03:30:00.000Z");
    expect(await store.lastSweepAt("science")).toBeUndefined();
  });

  it("keeps a chat's requests newest first, filtered by project and by time", async () => {
    const request = {harnessId: "coding", projectId: "project-a", chatId: "chat-1", kind: "decision" as const, text: "We ferment at 12 degrees."};
    await store.addRequest({...request, id: "request-1", at: "2026-09-10T10:00:00.000Z"});
    await store.addRequest({...request, id: "request-2", at: "2026-09-11T10:00:00.000Z"});
    await store.addRequest({...request, id: "request-3", projectId: "project-b", at: "2026-09-12T10:00:00.000Z"});

    expect((await store.listRequests("coding")).map((item) => item.id)).toEqual(["request-3", "request-2", "request-1"]);
    expect((await store.listRequests("coding", {projectId: "project-a"})).map((item) => item.id)).toEqual(["request-2", "request-1"]);
    expect((await store.listRequests("coding", {since: "2026-09-11T00:00:00.000Z"})).map((item) => item.id)).toEqual(["request-3", "request-2"]);
    expect(await store.listRequests("science")).toEqual([]);
  });

  it("counts only today's spend against the daily cap", async () => {
    const now = new Date("2026-09-10T20:00:00.000Z");
    await store.addReview(review({id: "today-1", startedAt: new Date("2026-09-10T09:00:00.000Z").toISOString(), spentUsd: 0.25}));
    await store.addReview(review({id: "today-2", startedAt: new Date("2026-09-10T19:00:00.000Z").toISOString(), spentUsd: 0.5}));
    await store.addReview(review({id: "yesterday", startedAt: new Date("2026-09-08T09:00:00.000Z").toISOString(), spentUsd: 4}));
    await store.addReview(review({id: "running", startedAt: new Date("2026-09-10T19:30:00.000Z").toISOString(), status: "running", spentUsd: undefined}));

    expect(await store.spentToday("coding", now)).toBeCloseTo(0.75);
    expect(await store.spentToday("science", now)).toBe(0);
  });
});
