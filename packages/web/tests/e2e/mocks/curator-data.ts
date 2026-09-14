import type {CurationProposal, CuratorReview} from "@supernova/contracts/harnesses/schemas";

export const curatorProposal: CurationProposal = {
  id: "curator-proposal",
  harnessId: "science",
  reviewId: "decision-review",
  target: {kind: "harness", harnessId: "science"},
  change: {type: "text", find: "Old instruction", replace: "Verified instruction"},
  tier: "approval",
  rationale: "Clarify the evidence rule before the next run.",
  evidence: [],
  status: "pending",
  createdAt: "2026-09-13T10:00:00Z",
};

export const curatorReview: CuratorReview = {
  id: "result-review",
  harnessId: "science",
  trigger: "after-run",
  status: "completed",
  startedAt: "2026-09-13T09:00:00Z",
  finishedAt: "2026-09-13T09:01:00Z",
  summary: "The planning notes match the saved results.",
  proposals: 0,
  applied: 0,
};
