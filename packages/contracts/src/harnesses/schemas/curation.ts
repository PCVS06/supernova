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

export const CurationEvidenceKind = Schema.Literals(["run", "steer", "record", "document", "request"]);
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

export const CuratorReviewTrigger = Schema.Literals(["manual", "after-run", "daily"]);
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
  /** Assembled instruction size at review time, so the size trend can be read off the review history. */
  instructionChars: Schema.optional(Schema.Number),
  error: Schema.optional(Schema.String),
});

/** Evidence filed from a chat by the orchestrator: a decision the plan should record, or a repeated problem with an agent. */
export const CurationRequestKind = Schema.Literals(["decision", "problem"]);
export const CurationRequest = Schema.Struct({
  id: Schema.String,
  harnessId: Schema.String,
  projectId: Schema.String,
  chatId: Schema.String,
  kind: CurationRequestKind,
  agentName: Schema.optional(Schema.String),
  text: Schema.String,
  at: Schema.String,
});

export const CuratorAgentFailures = Schema.Struct({
  agentName: Schema.String,
  runs: Schema.Number,
  failed: Schema.Number,
  previousRuns: Schema.Number,
  previousFailed: Schema.Number,
});

/** The signals section 9 of the design note measures, over the current window and the one before it. */
export const CuratorMetrics = Schema.Struct({
  windowDays: Schema.Number,
  proposals: Schema.Struct({pending: Schema.Number, applied: Schema.Number, rejected: Schema.Number, rolledBack: Schema.Number}),
  /** The latest rejection reasons, newest first, at most five. */
  rejectionReasons: Schema.Array(Schema.String),
  failures: Schema.Array(CuratorAgentFailures),
  steersPerChat: Schema.Struct({current: Schema.Number, previous: Schema.Number}),
  instructionChars: Schema.Struct({current: Schema.Number, previous: Schema.optional(Schema.Number)}),
  spend: Schema.Struct({today: Schema.Number, window: Schema.Number, maxPerDay: Schema.Number}),
  requests: Schema.Number,
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
export type CurationRequest = typeof CurationRequest.Type;
export type CurationRequestKind = typeof CurationRequestKind.Type;
export type CuratorAgentFailures = typeof CuratorAgentFailures.Type;
export type CuratorMetrics = typeof CuratorMetrics.Type;
