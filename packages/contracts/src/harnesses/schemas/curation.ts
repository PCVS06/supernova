import {Schema} from "effect";

/**
 * What a curation proposal changes. `harness` and `context` are the harness-wide instruction pieces,
 * `project` the project instructions, `role` an agent prompt (the project override when projectId is set),
 * `document` a planning document, `memory` one ledger record.
 */
export const CurationTargetKind = Schema.Literals(["harness", "context", "project", "role", "document", "memory"]);
export const CurationTarget = Schema.Struct({
  kind: CurationTargetKind,
  harnessId: Schema.String,
  projectId: Schema.optional(Schema.String),
  agentName: Schema.optional(Schema.String),
  /** Project-relative planning document path. */
  path: Schema.optional(Schema.String),
  recordId: Schema.optional(Schema.String),
});

/** Exact text replacement; `find` must occur exactly once in the target when applied. */
export const CurationTextChange = Schema.Struct({type: Schema.Literal("text"), find: Schema.String, replace: Schema.String});
/** A ledger transition in the memory extension's own vocabulary. */
export const CurationMemoryChange = Schema.Struct({
  type: Schema.Literal("memory"),
  op: Schema.Literals(["supersede", "retract"]),
  supersededBy: Schema.optional(Schema.String),
  reason: Schema.String,
});
/** One dated line appended to the curator log block of a planning document. */
export const CurationLogChange = Schema.Struct({type: Schema.Literal("log"), line: Schema.String});
export const CurationChange = Schema.Union([CurationTextChange, CurationMemoryChange, CurationLogChange]);

export const CurationEvidenceKind = Schema.Literals(["run", "steer", "record", "document"]);
export const CurationEvidence = Schema.Struct({kind: CurationEvidenceKind, ref: Schema.String, quote: Schema.String});

/** silent: applied at once. notify: applied at once and listed. approval: waits in the inbox. */
export const CurationTier = Schema.Literals(["silent", "notify", "approval"]);
export const CurationProposalStatus = Schema.Literals(["pending", "applied", "rejected", "rolled-back", "failed"]);

export const CurationProposal = Schema.Struct({
  id: Schema.String,
  harnessId: Schema.String,
  reviewId: Schema.optional(Schema.String),
  target: CurationTarget,
  change: CurationChange,
  tier: CurationTier,
  /** At most two sentences. */
  rationale: Schema.String,
  evidence: Schema.Array(CurationEvidence),
  status: CurationProposalStatus,
  createdAt: Schema.String,
  decidedAt: Schema.optional(Schema.String),
  decisionReason: Schema.optional(Schema.String),
  /** Library revision the change was applied at; the previous text is in the version history. */
  appliedRevision: Schema.optional(Schema.Number),
  error: Schema.optional(Schema.String),
});

export const CuratorReviewTrigger = Schema.Literals(["manual", "after-run"]);
export const CuratorReviewStatus = Schema.Literals(["running", "completed", "failed"]);
export const CuratorReview = Schema.Struct({
  id: Schema.String,
  harnessId: Schema.String,
  projectId: Schema.optional(Schema.String),
  trigger: CuratorReviewTrigger,
  status: CuratorReviewStatus,
  startedAt: Schema.String,
  finishedAt: Schema.optional(Schema.String),
  /** The curator's closing summary, at most five lines. */
  summary: Schema.String,
  proposals: Schema.Number,
  applied: Schema.Number,
  spentUsd: Schema.optional(Schema.Number),
  error: Schema.optional(Schema.String),
});

/** A user correction typed while a turn was running. */
export const SteerRecord = Schema.Struct({chatId: Schema.String, at: Schema.String, text: Schema.String});

/** A saved previous text of an instruction piece, keyed by the library revision it was replaced at. */
export const InstructionVersion = Schema.Struct({target: CurationTarget, revision: Schema.Number, savedAt: Schema.String, size: Schema.Number});

export type CurationTargetKind = typeof CurationTargetKind.Type;
export type CurationTarget = typeof CurationTarget.Type;
export type CurationChange = typeof CurationChange.Type;
export type CurationEvidence = typeof CurationEvidence.Type;
export type CurationTier = typeof CurationTier.Type;
export type CurationProposalStatus = typeof CurationProposalStatus.Type;
export type CurationProposal = typeof CurationProposal.Type;
export type CuratorReview = typeof CuratorReview.Type;
export type CuratorReviewTrigger = typeof CuratorReviewTrigger.Type;
export type SteerRecord = typeof SteerRecord.Type;
export type InstructionVersion = typeof InstructionVersion.Type;
