import {Schema} from "effect";
import {CurationProposal, CurationTarget, CuratorReview, InstructionVersion} from "@supernova/contracts/harnesses/schemas/curation";
import {HarnessLibrary} from "@supernova/contracts/harnesses/schemas/harness";

export const ListCurationPayload = Schema.Struct({harnessId: Schema.String});
export const ListCurationResult = Schema.Struct({proposals: Schema.Array(CurationProposal), reviews: Schema.Array(CuratorReview)});

/** Approve applies the change (with an edited `replace` when given); reject records the reason as evidence for later reviews. */
export const DecideCurationPayload = Schema.Struct({
  proposalId: Schema.String,
  decision: Schema.Literals(["approve", "reject"]),
  replace: Schema.optional(Schema.String),
  reason: Schema.optional(Schema.String),
  expectedRevision: Schema.Number,
});
export const DecideCurationResult = Schema.Struct({proposal: CurationProposal, library: HarnessLibrary});

export const RollbackCurationPayload = Schema.Struct({proposalId: Schema.String, expectedRevision: Schema.Number});

/** Runs one review now and returns when it has finished. */
export const RunCuratorReviewPayload = Schema.Struct({harnessId: Schema.String, projectId: Schema.optional(Schema.String)});
export const RunCuratorReviewResult = CuratorReview;

export const ListInstructionVersionsPayload = Schema.Struct({target: CurationTarget});
export const ListInstructionVersionsResult = Schema.Struct({versions: Schema.Array(InstructionVersion)});
export const ReadInstructionVersionPayload = Schema.Struct({target: CurationTarget, revision: Schema.Number});
export const ReadInstructionVersionResult = Schema.Struct({content: Schema.String});

export type ListCurationResult = typeof ListCurationResult.Type;
export type DecideCurationPayload = typeof DecideCurationPayload.Type;
export type DecideCurationResult = typeof DecideCurationResult.Type;
export type ListInstructionVersionsResult = typeof ListInstructionVersionsResult.Type;
