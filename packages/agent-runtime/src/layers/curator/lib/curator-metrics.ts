import type {CuratorMetrics} from "@supernova/contracts/harnesses/schemas";
import {harnessRunStore} from "@supernova/agent-runtime/layers/harnesses/internal/harness-run-store";
import type {HarnessRunStore} from "@supernova/agent-runtime/layers/harnesses/internal/harness-run-store";
import {harnessStore} from "@supernova/agent-runtime/layers/harnesses/internal/harness-store";
import type {HarnessStore} from "@supernova/agent-runtime/layers/harnesses/internal/harness-store";
import {curatorStore} from "@supernova/agent-runtime/layers/curator/curator-store";
import type {CuratorStore} from "@supernova/agent-runtime/layers/curator/curator-store";
import {assembledInstructionChars} from "@supernova/agent-runtime/layers/curator/lib/curator-evidence";
import {readFailureReceipts} from "@supernova/agent-runtime/layers/curator/lib/curator-failures";

/** A week against the week before it: long enough to hold a few runs, short enough to show a change. */
const windowDays = 7;
const dayMs = 24 * 60 * 60 * 1000;
/** Rejections the page shows; the reasons are read, not counted. */
const listedReasons = 5;
const maxMetricReceipts = 1000;

function rounded(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * The signals section 9 of the design note measures, for one harness, over the last week and the week before.
 *
 * Two windows rather than one, because every question here is a comparison: are there fewer failures, fewer steers,
 * less instruction text than before. A single number would say the curator ran, not that it helped.
 */
export async function curatorMetrics(input: {
  readonly harnessId: string;
  readonly store?: HarnessStore;
  readonly curation?: CuratorStore;
  readonly runs?: HarnessRunStore;
  readonly now?: Date;
}): Promise<CuratorMetrics> {
  const store = input.store ?? harnessStore;
  const curation = input.curation ?? curatorStore;
  const runs = input.runs ?? harnessRunStore;
  const now = input.now ?? new Date();
  const windowStart = new Date(now.getTime() - windowDays * dayMs).toISOString();
  const previousStart = new Date(now.getTime() - 2 * windowDays * dayMs).toISOString();

  const library = await store.list();
  const harness = library.harnesses.find((item) => item.id === input.harnessId);
  const projects = library.projects.filter((item) => item.harnessId === input.harnessId);

  const proposals = await curation.listProposals(input.harnessId);
  const decidedInWindow = (status: string) => proposals.filter((item) => item.status === status && (item.decidedAt ?? "") >= windowStart).length;
  const rejectionReasons = proposals
    .filter((item) => item.status === "rejected" && item.decisionReason)
    .sort((left, right) => (right.decidedAt ?? "").localeCompare(left.decidedAt ?? ""))
    .slice(0, listedReasons)
    .map((item) => item.decisionReason!);

  const receipts = await readFailureReceipts(runs, {projectIds: projects.map((item) => item.id), since: new Date(previousStart), limit: maxMetricReceipts, now});
  const agents = new Map<string, {agentName: string; runs: number; failed: number; previousRuns: number; previousFailed: number}>();
  const chats = {current: new Set<string>(), previous: new Set<string>()};
  for (const receipt of receipts) {
    const current = receipt.startedAt >= windowStart;
    const agent = agents.get(receipt.agentName) ?? {agentName: receipt.agentName, runs: 0, failed: 0, previousRuns: 0, previousFailed: 0};
    if (current) {
      agent.runs += 1;
      if (receipt.failed) agent.failed += 1;
      chats.current.add(receipt.chatId);
    } else {
      agent.previousRuns += 1;
      if (receipt.failed) agent.previousFailed += 1;
      chats.previous.add(receipt.chatId);
    }
    agents.set(receipt.agentName, agent);
  }

  let steersNow = 0;
  let steersBefore = 0;
  for (const project of projects) {
    for (const steer of await runs.listSteersForProject({id: project.id, path: project.path})) {
      if (steer.at >= windowStart) steersNow += 1;
      else if (steer.at >= previousStart) steersBefore += 1;
    }
  }

  const reviews = await curation.listReviews(input.harnessId);
  const inWindow = reviews.filter((review) => review.startedAt >= windowStart);
  const sized = inWindow.filter((review) => review.instructionChars !== undefined);
  const oldestSized = sized[sized.length - 1];

  return {
    windowDays,
    proposals: {
      pending: proposals.filter((item) => item.status === "pending").length,
      applied: decidedInWindow("applied"),
      rejected: decidedInWindow("rejected"),
      rolledBack: decidedInWindow("rolled-back"),
    },
    rejectionReasons,
    failures: [...agents.values()].sort((left, right) => right.failed - left.failed || left.agentName.localeCompare(right.agentName)),
    steersPerChat: {
      current: chats.current.size ? rounded(steersNow / chats.current.size) : 0,
      previous: chats.previous.size ? rounded(steersBefore / chats.previous.size) : 0,
    },
    instructionChars: {
      current: harness ? assembledInstructionChars(harness, projects) : 0,
      ...(oldestSized?.instructionChars !== undefined ? {previous: oldestSized.instructionChars} : {}),
    },
    spend: {
      today: rounded(await curation.spentToday(input.harnessId, now)),
      window: rounded(inWindow.reduce((total, review) => total + (review.spentUsd ?? 0), 0)),
      maxPerDay: harness?.curator?.maxCostUsdPerDay ?? 0,
    },
    requests: (await curation.listRequests(input.harnessId, {since: windowStart})).length,
  };
}
