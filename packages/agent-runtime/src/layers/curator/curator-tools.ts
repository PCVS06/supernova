import {randomUUID} from "node:crypto";
import {Type} from "typebox";
import type {ToolDefinition} from "@earendil-works/pi-coding-agent";
import type {CurationEvidence, CurationProposal, CurationRequest, CurationTarget, CuratorAutoApply, HarnessProject} from "@supernova/contracts/harnesses/schemas";
import type {HarnessRunStore} from "@supernova/agent-runtime/layers/harnesses/internal/harness-run-store";
import type {HarnessStore} from "@supernova/agent-runtime/layers/harnesses/internal/harness-store";
import type {CuratorStore} from "@supernova/agent-runtime/layers/curator/curator-store";
import {
  buildEvidenceIndex,
  evidenceNewerThan,
  instructionRef,
  instructionReport,
  ledgerReport,
  receiptReport,
  requestReport,
  steerReport,
  unresolvedEvidence,
} from "@supernova/agent-runtime/layers/curator/lib/curator-evidence";
import type {EvidenceIndex} from "@supernova/agent-runtime/layers/curator/lib/curator-evidence";
import {failureGroupKey, groupFailures, minGroupRuns, readFailureReceipts, requiredFailureRuns} from "@supernova/agent-runtime/layers/curator/lib/curator-failures";
import type {FailureReceipt} from "@supernova/agent-runtime/layers/curator/lib/curator-failures";
import {appendCuratorLog, curatorLogDocument, curatorLogEntry} from "@supernova/agent-runtime/layers/curator/lib/curator-log";
import {sentenceCount} from "@supernova/agent-runtime/layers/curator/lib/curator-prompt";
import {assertWithinBudget, locateOnce, readTargetText, replaceAt, targetKey, targetLabel} from "@supernova/agent-runtime/layers/curator/lib/curator-targets";
import {appendMemoryTransition, latestMemoryRecords, readMemoryEvents} from "@supernova/agent-runtime/layers/curator/lib/memory-ledger";
import type {MemoryActor} from "@supernova/agent-runtime/layers/curator/lib/memory-ledger";

/** A rationale is an argument from evidence, not a paragraph. */
const maxRationaleChars = 300;
const maxRationaleSentences = 2;
/** What one document read hands to the curator. */
const maxDocumentChars = 60000;
/** Above this share of the instruction budget only removals and merges are accepted, whatever the review intends. */
const budgetGatePercent = 80;
/** Days an artefact rests after a decision, unless the evidence is newer than that decision. */
const defaultCooldownDays = 7;
const dayMs = 24 * 60 * 60 * 1000;

export interface CuratorSessionContext {
  readonly harnessId: string;
  readonly reviewId: string;
  readonly scope: "full" | "memory";
  /** Set when the review is limited to one project; otherwise every project of the harness is in scope. */
  readonly projectId?: string;
  readonly autoApply: CuratorAutoApply;
  /** How full the instruction budget was at the start of the review; above 80 nothing may grow. */
  readonly budgetPercent?: number;
  readonly actor: MemoryActor;
  readonly store: HarnessStore;
  readonly curation: CuratorStore;
  readonly runs: HarnessRunStore;
}

/** What the review run reads back out of its tools: the counts its record carries. */
export interface CuratorReviewTally {
  proposals: number;
  applied: number;
  /** One proposal per artefact per review, decided on the target key. */
  readonly targets: Set<string>;
}

function answer(text: string, details: Record<string, unknown> = {}) {
  return {content: [{type: "text" as const, text}], details};
}

function json(value: unknown) {
  return answer(JSON.stringify(value, null, 2));
}

const evidenceSchema = Type.Array(
  Type.Object({
    kind: Type.Union([Type.Literal("run"), Type.Literal("steer"), Type.Literal("record"), Type.Literal("document"), Type.Literal("request")]),
    ref: Type.String({minLength: 1, maxLength: 300}),
    quote: Type.String({minLength: 1, maxLength: 2000}),
  }),
  {minItems: 1, maxItems: 10}
);

const proposeParameters = Type.Object({
  target: Type.Object({
    kind: Type.Union([Type.Literal("harness"), Type.Literal("context"), Type.Literal("project"), Type.Literal("role"), Type.Literal("document")]),
    projectId: Type.Optional(Type.String()),
    agentName: Type.Optional(Type.String()),
    path: Type.Optional(Type.String()),
  }),
  find: Type.String({minLength: 1, maxLength: 20000}),
  replace: Type.String({maxLength: 20000}),
  rationale: Type.String({minLength: 1, maxLength: maxRationaleChars}),
  evidence: evidenceSchema,
});
const memoryParameters = Type.Object({
  projectId: Type.String(),
  recordId: Type.String({minLength: 1, maxLength: 200}),
  op: Type.Union([Type.Literal("supersede"), Type.Literal("retract")]),
  supersededBy: Type.Optional(Type.String({minLength: 1, maxLength: 200})),
  reason: Type.String({minLength: 5, maxLength: maxRationaleChars}),
  evidence: evidenceSchema,
});
const logParameters = Type.Object({projectId: Type.String(), line: Type.String({minLength: 1, maxLength: 200}), evidence: evidenceSchema});
const instructionParameters = Type.Object({projectId: Type.Optional(Type.String())});
const receiptParameters = Type.Object({projectId: Type.Optional(Type.String()), status: Type.Optional(Type.Union([Type.Literal("failed"), Type.Literal("all")]))});
const steerParameters = Type.Object({projectId: Type.Optional(Type.String())});
const failureParameters = Type.Object({projectId: Type.Optional(Type.String())});
const requestParameters = Type.Object({projectId: Type.Optional(Type.String())});
const ledgerParameters = Type.Object({projectId: Type.String(), state: Type.Optional(Type.String())});
const documentParameters = Type.Object({projectId: Type.String(), path: Type.String({minLength: 1})});

/**
 * The curator's whole surface: four reads over the evidence, one read over a plan, and three writes that either
 * file a proposal for approval or apply the two changes a user has allowed it to make by itself. It has no file,
 * shell, delegation or workflow tool, so a review cannot do the project's work even if it decides to try.
 */
export function createCuratorTools(context: CuratorSessionContext, tally: CuratorReviewTally): ToolDefinition[] {
  let evidenceIndex: EvidenceIndex | undefined;
  let failureReceipts: FailureReceipt[] | undefined;
  let requests: CurationRequest[] | undefined;

  const scope = async () => {
    const library = await context.store.list();
    const harness = library.harnesses.find((item) => item.id === context.harnessId);
    if (!harness) throw new Error("This harness no longer exists.");
    const all = library.projects.filter((item) => item.harnessId === harness.id);
    const projects = context.projectId ? all.filter((item) => item.id === context.projectId) : all;
    return {library, harness, projects};
  };

  const projectIn = (projects: readonly HarnessProject[], projectId?: string): HarnessProject => {
    const project = projectId ? projects.find((item) => item.id === projectId) : projects[0];
    if (!project) throw new Error(projectId ? "That project is not in this review's scope." : "This review has no project in scope.");
    return project;
  };

  const requestsIn = async (projects: readonly HarnessProject[]): Promise<CurationRequest[]> => {
    if (!requests) {
      const ids = new Set(projects.map((project) => project.id));
      requests = (await context.curation.listRequests(context.harnessId)).filter((request) => ids.has(request.projectId));
    }
    return requests;
  };

  const failuresIn = async (projects: readonly HarnessProject[]): Promise<FailureReceipt[]> => {
    if (!failureReceipts) failureReceipts = await readFailureReceipts(context.runs, {projectIds: projects.map((project) => project.id)});
    return failureReceipts;
  };

  const evidenceFor = async (projects: readonly HarnessProject[]): Promise<EvidenceIndex> => {
    if (!evidenceIndex) {
      const {harness} = await scope();
      evidenceIndex = await buildEvidenceIndex({harness, projects, runs: context.runs, requests: await requestsIn(projects)});
    }
    return evidenceIndex;
  };

  /**
   * An artefact rests after it has been decided.
   *
   * The cooldown is what stops the curator from re-proposing what the user has just answered; new evidence is the
   * one thing that makes the question different from the one already answered, so newer evidence lifts it.
   */
  const cooldown = async (input: {projects: readonly HarnessProject[]; evidence: readonly CurationEvidence[]; target: CurationTarget}): Promise<string | undefined> => {
    const {harness} = await scope();
    const days = harness.curator?.cooldownDays ?? defaultCooldownDays;
    const decision = await context.curation.lastDecision(context.harnessId, targetKey(input.target));
    if (!decision) return undefined;
    const elapsed = Math.floor((Date.now() - Date.parse(decision.at)) / dayMs);
    if (elapsed >= days) return undefined;
    if (evidenceNewerThan(await evidenceFor(input.projects), input.evidence, decision.at)) return undefined;
    return `${targetLabel(input.target)} was decided ${elapsed} days ago; cite evidence newer than ${decision.at.slice(0, 10)} or wait ${days - elapsed} days.`;
  };

  /** The checks every write shares: the citation resolves, and the artefact has not been proposed against yet. */
  const guard = async (input: {projects: readonly HarnessProject[]; evidence: readonly CurationEvidence[]; target: CurationTarget}): Promise<string | undefined> => {
    if (!input.evidence.length) return "Every proposal cites at least one run receipt, steer or memory record by id, or the instruction text it quotes.";
    const unresolved = unresolvedEvidence(await evidenceFor(input.projects), input.evidence);
    if (unresolved.length) return `These citations do not resolve and cannot be evidence: ${unresolved.join(", ")}. Cite ids exactly as the read tools return them.`;
    if (tally.targets.has(targetKey(input.target))) return `This review already has a proposal for the ${targetLabel(input.target)}. One proposal per artefact per review.`;
    return cooldown(input);
  };

  /**
   * Rule 4, as a check rather than a request: a role prompt changes on a pattern, not on one bad run.
   *
   * The three runs have to be runs of that role, each actually failed, and all in one failure group, because three
   * unrelated failures are three problems and editing the prompt for all of them at once is guesswork. A request
   * from a chat may stand in for one of the three: a person reporting the same problem is evidence of it.
   *
   * Cutting text out of a role prompt while quoting that very text is the one change the rule does not govern: a
   * sentence two roles share is visible in the text itself, and no run has to fail before a duplicate can go. A
   * role prompt can therefore only grow on three failures, never on the curator's reading of it.
   */
  const roleRule = (receipts: readonly FailureReceipt[], target: CurationTarget, evidence: readonly CurationEvidence[], shrinks: boolean): string | undefined => {
    if (shrinks && evidence.some((item) => item.kind === "document" && item.ref === instructionRef(target))) return undefined;
    const byRun = new Map(receipts.map((receipt) => [receipt.runId, receipt]));
    const cited = evidence
      .filter((item) => item.kind === "run")
      .map((item) => byRun.get(item.ref))
      .filter(
        (receipt): receipt is FailureReceipt => Boolean(receipt) && receipt!.agentName === target.agentName && (!target.projectId || receipt!.projectId === target.projectId)
      );
    const failed = cited.filter((receipt) => receipt.failed);
    const credit = evidence.some((item) => item.kind === "request") ? 1 : 0;
    if (failed.length + credit < requiredFailureRuns)
      return `${failed.length} failed run${failed.length === 1 ? "" : "s"} of ${target.agentName} cited; the rule needs ${requiredFailureRuns} from one failure group.`;
    const groups = new Map<string, number>();
    for (const receipt of failed) {
      const key = failureGroupKey(receipt);
      if (key) groups.set(key, (groups.get(key) ?? 0) + 1);
    }
    if (Math.max(0, ...groups.values()) + credit >= requiredFailureRuns) return undefined;
    return `${failed.length} failed runs of ${target.agentName} cited from ${groups.size} failure groups; the rule needs ${requiredFailureRuns} from one failure group.`;
  };

  const file = async (input: {
    target: CurationTarget;
    change: CurationProposal["change"];
    tier: CurationProposal["tier"];
    rationale: string;
    evidence: readonly CurationEvidence[];
    applied?: boolean;
  }): Promise<CurationProposal> => {
    const at = new Date().toISOString();
    const proposal = await context.curation.addProposal({
      id: randomUUID(),
      harnessId: context.harnessId,
      reviewId: context.reviewId,
      target: input.target,
      change: input.change,
      tier: input.tier,
      rationale: input.rationale,
      evidence: [...input.evidence],
      status: input.applied ? "applied" : "pending",
      createdAt: at,
      ...(input.applied ? {decidedAt: at} : {}),
    });
    tally.proposals += 1;
    if (input.applied) tally.applied += 1;
    tally.targets.add(targetKey(input.target));
    return proposal;
  };

  const readInstructions: ToolDefinition<typeof instructionParameters> = {
    name: "read_instructions",
    label: "Instruction layers",
    description: "Current instruction layers: harness, context rules, project, roles, with sizes and the budget.",
    parameters: instructionParameters,
    executionMode: "sequential",
    async execute(_id, params) {
      const {harness, projects} = await scope();
      const selected = params.projectId ? projects.filter((item) => item.id === params.projectId) : projects;
      return json(instructionReport(harness, selected));
    },
  };

  const readReceipts: ToolDefinition<typeof receiptParameters> = {
    name: "read_receipts",
    label: "Run receipts",
    description: "Run receipts: status, agent, failure kind, error, events, revision. Newest first, at most 50.",
    parameters: receiptParameters,
    executionMode: "sequential",
    async execute(_id, params) {
      const {projects} = await scope();
      const projectId = params.projectId ?? context.projectId;
      if (projectId) projectIn(projects, projectId);
      return json(await receiptReport(context.runs, {projectId, failedOnly: params.status === "failed"}));
    },
  };

  const readSteers: ToolDefinition<typeof steerParameters> = {
    name: "read_steers",
    label: "User steers",
    description: "User corrections typed while turns ran. Newest first.",
    parameters: steerParameters,
    executionMode: "sequential",
    async execute(_id, params) {
      const {projects} = await scope();
      const selected = params.projectId ? [projectIn(projects, params.projectId)] : projects;
      const steers = (await Promise.all(selected.map((project) => steerReport(context.runs, project)))).flat();
      return json(steers.sort((left, right) => right.at.localeCompare(left.at)).slice(0, 50));
    },
  };

  const readFailures: ToolDefinition<typeof failureParameters> = {
    name: "read_failures",
    label: "Repeated failures",
    description: "Repeated failures per agent: kind, error signature, run ids. Groups of fewer than two runs are omitted.",
    parameters: failureParameters,
    executionMode: "sequential",
    async execute(_id, params) {
      const {projects} = await scope();
      const selected = params.projectId ? [projectIn(projects, params.projectId)] : projects;
      const ids = new Set(selected.map((project) => project.id));
      const groups = groupFailures((await failuresIn(projects)).filter((receipt) => ids.has(receipt.projectId)));
      return json(groups.filter((group) => group.count >= minGroupRuns).map((group) => ({...group, meetsRule: group.count >= requiredFailureRuns})));
    },
  };

  const readRequests: ToolDefinition<typeof requestParameters> = {
    name: "read_requests",
    label: "Chat requests",
    description: "Evidence sent from chats: decisions to record and reported problems. Newest first.",
    parameters: requestParameters,
    executionMode: "sequential",
    async execute(_id, params) {
      const {projects} = await scope();
      const selected = params.projectId ? [projectIn(projects, params.projectId)] : projects;
      const ids = new Set(selected.map((project) => project.id));
      return json(requestReport((await requestsIn(projects)).filter((request) => ids.has(request.projectId))));
    },
  };

  const readLedger: ToolDefinition<typeof ledgerParameters> = {
    name: "read_ledger",
    label: "Memory ledger",
    description: "Memory records with kind, state and evidence; latest state per record.",
    parameters: ledgerParameters,
    executionMode: "sequential",
    async execute(_id, params) {
      const {projects} = await scope();
      return json(await ledgerReport(projectIn(projects, params.projectId), params.state));
    },
  };

  const readDocument: ToolDefinition<typeof documentParameters> = {
    name: "read_document",
    label: "Planning document",
    description: "One planning document of a project.",
    parameters: documentParameters,
    executionMode: "sequential",
    async execute(_id, params) {
      const {library, projects} = await scope();
      const project = projectIn(projects, params.projectId);
      const document = await readTargetText(library, {kind: "document", harnessId: context.harnessId, projectId: project.id, path: params.path});
      return answer(document.text.slice(0, maxDocumentChars));
    },
  };

  const proposeChange: ToolDefinition<typeof proposeParameters> = {
    name: "propose_change",
    label: "Propose a text change",
    description: "File a text proposal: exact find/replace on one artefact, a rationale of at most two sentences, evidence ids. Needs approval.",
    parameters: proposeParameters,
    executionMode: "sequential",
    async execute(_id, params) {
      const {library, projects} = await scope();
      const rationale = params.rationale.trim();
      if (sentenceCount(rationale) > maxRationaleSentences) return answer("A rationale is at most two sentences.");
      const target: CurationTarget = {
        kind: params.target.kind,
        harnessId: context.harnessId,
        ...(params.target.projectId ? {projectId: params.target.projectId} : {}),
        ...(params.target.agentName ? {agentName: params.target.agentName} : {}),
        ...(params.target.path ? {path: params.target.path} : {}),
      };
      if (target.projectId) projectIn(projects, target.projectId);
      if ((target.kind === "project" || target.kind === "document") && !target.projectId) return answer(`A ${target.kind} proposal needs a projectId.`);
      if (target.kind === "role" && !target.agentName) return answer("A role proposal needs the agent name.");
      let current: Awaited<ReturnType<typeof readTargetText>>;
      try {
        current = await readTargetText(library, target);
      } catch (error) {
        return answer(error instanceof Error ? error.message : "That artefact cannot be curated.");
      }
      const refusal = await guard({projects, evidence: params.evidence, target});
      if (refusal) return answer(refusal);
      if (target.kind === "role") {
        const missing = roleRule(await failuresIn(projects), target, params.evidence, params.replace.length <= params.find.length);
        if (missing) return answer(missing);
      }
      // A full instruction budget is a hard gate, not advice: over it nothing may grow except a planning document.
      const percent = context.budgetPercent ?? 0;
      if (percent > budgetGatePercent && target.kind !== "document" && params.replace.length > params.find.length)
        return answer(`Budget at ${percent}%: only removals and merges.`);
      const located = locateOnce(current.text, params.find);
      if ("matches" in located) return answer(`find matched ${located.matches} times in the ${current.label}; it has to match exactly once.`);
      try {
        assertWithinBudget(library, target, replaceAt(current.text, located.index, params.find, params.replace));
      } catch (error) {
        return answer(error instanceof Error ? error.message : "That change does not fit the instruction budget.");
      }
      const proposal = await file({target, change: {type: "text", find: params.find, replace: params.replace}, tier: "approval", rationale, evidence: params.evidence});
      return answer(`Filed proposal ${proposal.id} against the ${current.label}. It waits for approval.`, {proposalId: proposal.id, status: proposal.status});
    },
  };

  const applyMemoryOp: ToolDefinition<typeof memoryParameters> = {
    name: "apply_memory_op",
    label: "Memory hygiene",
    description: "Supersede or retract one memory record, with the reason. Applied at once when auto-apply is on, otherwise filed for approval.",
    parameters: memoryParameters,
    executionMode: "sequential",
    async execute(_id, params) {
      const {projects} = await scope();
      const project = projectIn(projects, params.projectId);
      const records = latestMemoryRecords(await readMemoryEvents(project.path));
      if (!records.has(params.recordId)) return answer(`No memory record ${params.recordId} in this project's ledger.`);
      if (params.op === "supersede" && !params.supersededBy) return answer("A supersession names the record that replaces this one.");
      if (params.supersededBy && !records.has(params.supersededBy)) return answer(`No memory record ${params.supersededBy} in this project's ledger.`);
      const target: CurationTarget = {kind: "memory", harnessId: context.harnessId, projectId: project.id, recordId: params.recordId};
      const refusal = await guard({projects, evidence: params.evidence, target});
      if (refusal) return answer(refusal);
      const change = {
        type: "memory" as const,
        op: params.op,
        ...(params.supersededBy ? {supersededBy: params.supersededBy} : {}),
        reason: params.reason.trim(),
      };
      if (!context.autoApply.memory) {
        const proposal = await file({target, change, tier: "approval", rationale: params.reason.trim(), evidence: params.evidence});
        return answer(`Filed proposal ${proposal.id} to ${params.op} ${params.recordId}. Memory auto-apply is off, so it waits for approval.`, {proposalId: proposal.id});
      }
      try {
        await appendMemoryTransition(project.path, {recordId: params.recordId, nextState: params.op, reason: params.reason, supersededBy: params.supersededBy}, context.actor);
      } catch (error) {
        return answer(error instanceof Error ? error.message : "The ledger refused that transition.");
      }
      const proposal = await file({target, change, tier: "silent", rationale: params.reason.trim(), evidence: params.evidence, applied: true});
      return answer(`Record ${params.recordId} is now ${params.op === "supersede" ? "superseded" : "retracted"} in the ledger.`, {
        proposalId: proposal.id,
        status: proposal.status,
      });
    },
  };

  const appendLog: ToolDefinition<typeof logParameters> = {
    name: "append_curator_log",
    label: "Plan log",
    description:
      "Append one dated line under the Curator log heading of the project's first planning document. Applied at once when auto-apply is on, otherwise filed for approval.",
    parameters: logParameters,
    executionMode: "sequential",
    async execute(_id, params) {
      const {library, projects} = await scope();
      const project = projectIn(projects, params.projectId);
      const line = params.line.trim();
      try {
        curatorLogEntry(line);
      } catch (error) {
        return answer(error instanceof Error ? error.message : "That log line cannot be appended.");
      }
      const path = (project.planningDocuments ?? [])[0] ?? curatorLogDocument;
      const target: CurationTarget = {kind: "document", harnessId: context.harnessId, projectId: project.id, path};
      const refusal = await guard({projects, evidence: params.evidence, target});
      if (refusal) return answer(refusal);
      const change = {type: "log" as const, line};
      if (!context.autoApply.planningLog) {
        const proposal = await file({target, change, tier: "approval", rationale: line, evidence: params.evidence});
        return answer(`Filed proposal ${proposal.id} to log this in ${path}. Plan-log auto-apply is off, so it waits for approval.`, {proposalId: proposal.id});
      }
      let written: Awaited<ReturnType<typeof appendCuratorLog>>;
      try {
        written = await appendCuratorLog({store: context.store, library, project, line});
      } catch (error) {
        return answer(error instanceof Error ? error.message : "The planning document could not be written.");
      }
      const proposal = await file({target: {...target, path: written.path}, change, tier: "notify", rationale: line, evidence: params.evidence, applied: true});
      return answer(`Logged in ${written.path}: ${written.entry}`, {proposalId: proposal.id, status: proposal.status});
    },
  };

  // A memory review reads the same evidence but may only touch the ledger; the text tools are not even present.
  return context.scope === "memory"
    ? [readReceipts, readSteers, readLedger, applyMemoryOp]
    : [readInstructions, readFailures, readReceipts, readSteers, readRequests, readLedger, readDocument, proposeChange, applyMemoryOp, appendLog];
}
