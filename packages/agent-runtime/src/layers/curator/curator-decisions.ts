import type {CurationProposal, HarnessLibrary, HarnessProject} from "@supernova/contracts/harnesses/schemas";
import {harnessStore} from "@supernova/agent-runtime/layers/harnesses/internal/harness-store";
import type {HarnessStore} from "@supernova/agent-runtime/layers/harnesses/internal/harness-store";
import {curatorStore} from "@supernova/agent-runtime/layers/curator/curator-store";
import type {CuratorStore} from "@supernova/agent-runtime/layers/curator/curator-store";
import {appendCuratorLog, curatorLogEntry, removeCuratorLog} from "@supernova/agent-runtime/layers/curator/lib/curator-log";
import {applyTextChange} from "@supernova/agent-runtime/layers/curator/lib/curator-targets";
import {appendMemoryTransition} from "@supernova/agent-runtime/layers/curator/lib/memory-ledger";

/** A rollback replaces the new text with the old one, which only works while the new text is still there. */
const driftedText = "text changed since; restore it from the version history";

export interface CurationDecisionResult {
  readonly proposal: CurationProposal;
  readonly library: HarnessLibrary;
}

export interface CurationDecisionDependencies {
  readonly store?: HarnessStore;
  readonly curation?: CuratorStore;
}

function projectFor(library: HarnessLibrary, proposal: CurationProposal): HarnessProject {
  const project = library.projects.find((item) => item.id === proposal.target.projectId && item.harnessId === proposal.harnessId);
  if (!project) throw new Error("The project this proposal belongs to is no longer part of the harness.");
  return project;
}

/** The actor a user-approved ledger transition is recorded under. The curator found it; the user allowed it. */
function actorFor(proposal: CurationProposal) {
  return {modelProvider: "pi-plus", modelId: "curator", ...(proposal.reviewId ? {sessionId: proposal.reviewId} : {})};
}

/**
 * Approves or rejects one proposal.
 *
 * Approving applies the change now: instructions and planning documents through the same revision-checked save a
 * person's edit takes, memory through an appended ledger transition. An edited replacement is kept with the
 * proposal, so a later rollback knows what text was actually written. A rejection records its reason, which the
 * next review reads as evidence that this change was considered and refused.
 */
export async function decideCuration(
  input: {
    readonly proposalId: string;
    readonly decision: "approve" | "reject";
    readonly replace?: string;
    readonly reason?: string;
    readonly expectedRevision: number;
  } & CurationDecisionDependencies
): Promise<CurationDecisionResult> {
  const store = input.store ?? harnessStore;
  const curation = input.curation ?? curatorStore;
  const proposal = await curation.getProposal(input.proposalId);
  if (!proposal) throw new Error("Curation proposal not found.");
  if (proposal.status !== "pending") throw new Error(`This proposal is already ${proposal.status}.`);
  const decidedAt = new Date().toISOString();

  if (input.decision === "reject") {
    const reason = input.reason?.trim();
    if (!reason) throw new Error("A rejection needs a reason; the next review reads it as evidence.");
    const rejected = await curation.updateProposal({...proposal, status: "rejected", decidedAt, decisionReason: reason});
    return {proposal: rejected, library: await store.describe()};
  }

  // A stale revision is the caller's problem, not the proposal's: it stays pending and is decided again after a reload.
  const library = await store.list();
  if (library.revision !== input.expectedRevision) throw new Error("Configuration changed elsewhere. Reload before deciding.");

  try {
    if (proposal.change.type === "text") {
      const replace = input.replace ?? proposal.change.replace;
      const applied = await applyTextChange({store, target: proposal.target, find: proposal.change.find, replace, expectedRevision: input.expectedRevision});
      const saved = await curation.updateProposal({
        ...proposal,
        change: {...proposal.change, replace},
        status: "applied",
        decidedAt,
        appliedRevision: applied.appliedRevision,
      });
      return {proposal: saved, library: await store.withFolderStatus(applied.library)};
    }
    if (proposal.change.type === "memory") {
      const project = projectFor(library, proposal);
      if (!proposal.target.recordId) throw new Error("This proposal does not name a memory record.");
      await appendMemoryTransition(
        project.path,
        {recordId: proposal.target.recordId, nextState: proposal.change.op, reason: proposal.change.reason, supersededBy: proposal.change.supersededBy},
        actorFor(proposal)
      );
      const saved = await curation.updateProposal({...proposal, status: "applied", decidedAt, appliedRevision: library.revision});
      return {proposal: saved, library: await store.describe()};
    }
    const project = projectFor(library, proposal);
    const written = await appendCuratorLog({store, library, project, line: proposal.change.line, at: new Date(decidedAt)});
    const saved = await curation.updateProposal({
      ...proposal,
      target: {...proposal.target, path: written.path},
      status: "applied",
      decidedAt,
      appliedRevision: written.library.revision,
    });
    return {proposal: saved, library: await store.withFolderStatus(written.library)};
  } catch (error) {
    const failed = await curation.updateProposal({...proposal, status: "failed", decidedAt, error: error instanceof Error ? error.message : String(error)});
    return {proposal: failed, library: await store.describe()};
  }
}

/**
 * Undoes an applied proposal where that is possible.
 *
 * A text change is undone by putting the old text back, and only while the applied text is still there untouched.
 * A log line is removed from the document. A ledger transition cannot be undone: the ledger is append-only and the
 * memory extension treats superseded and retracted as terminal, so there is no event that would walk one back.
 */
export async function rollbackCuration(input: {readonly proposalId: string; readonly expectedRevision: number} & CurationDecisionDependencies): Promise<CurationDecisionResult> {
  const store = input.store ?? harnessStore;
  const curation = input.curation ?? curatorStore;
  const proposal = await curation.getProposal(input.proposalId);
  if (!proposal) throw new Error("Curation proposal not found.");
  if (proposal.status !== "applied") throw new Error("Only an applied proposal can be rolled back.");
  const decidedAt = new Date().toISOString();

  if (proposal.change.type === "memory")
    throw new Error("A ledger transition cannot be rolled back: the memory ledger is append-only and superseded and retracted are terminal states.");

  if (proposal.change.type === "log") {
    const library = await store.list();
    const project = projectFor(library, proposal);
    const entry = curatorLogEntry(proposal.change.line, new Date(proposal.decidedAt ?? proposal.createdAt));
    await removeCuratorLog({project, path: proposal.target.path!, entry});
    const saved = await curation.updateProposal({...proposal, status: "rolled-back", decidedAt});
    return {proposal: saved, library: await store.describe()};
  }

  const applied = await applyTextChange({
    store,
    target: proposal.target,
    find: proposal.change.replace,
    replace: proposal.change.find,
    expectedRevision: input.expectedRevision,
    drifted: () => driftedText,
  });
  const saved = await curation.updateProposal({...proposal, status: "rolled-back", decidedAt, appliedRevision: applied.appliedRevision});
  return {proposal: saved, library: await store.withFolderStatus(applied.library)};
}
