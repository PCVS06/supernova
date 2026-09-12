import {randomUUID} from "node:crypto";
import {stat} from "node:fs/promises";
import {DefaultResourceLoader, getAgentDir, SessionManager, SettingsManager} from "@earendil-works/pi-coding-agent";
import type {ExtensionFactory, ToolDefinition} from "@earendil-works/pi-coding-agent";
import type {CuratorReview, CuratorReviewTrigger, HarnessConfig, HarnessProject} from "@supernova/contracts/harnesses/schemas";
import {harnessRunStore} from "@supernova/agent-runtime/layers/harnesses/internal/harness-run-store";
import type {HarnessRunStore} from "@supernova/agent-runtime/layers/harnesses/internal/harness-run-store";
import {harnessStore} from "@supernova/agent-runtime/layers/harnesses/internal/harness-store";
import type {HarnessStore} from "@supernova/agent-runtime/layers/harnesses/internal/harness-store";
import {curatorStore} from "@supernova/agent-runtime/layers/curator/curator-store";
import type {CuratorStore} from "@supernova/agent-runtime/layers/curator/curator-store";
import {createCuratorTools} from "@supernova/agent-runtime/layers/curator/curator-tools";
import {instructionBudgetPercent} from "@supernova/agent-runtime/layers/curator/lib/curator-evidence";
import {curatorScopeLine, curatorSummary, curatorSystemPrompt} from "@supernova/agent-runtime/layers/curator/lib/curator-prompt";
import type {PiSdkServiceShape} from "@supernova/agent-runtime/layers/pi-sdk";
import {toPiThinkingLevel} from "@supernova/agent-runtime/layers/session-runtime/lib/models/thinking-levels";

/** A review reads a lot and writes little, so its loop is short and its wall clock is ten minutes. */
const maxTurns = 30;
const timeoutSeconds = 600;
/** The opening turn. Everything the curator must do is in its instructions, not in this message. */
const openingMessage = "Begin the review.";

/** Keeps the review inside its turn and time budget, the same way a harness worker is bounded. */
function reviewLimits(): ExtensionFactory {
  return (pi) => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const clear = () => {
      if (timer) clearTimeout(timer);
      timer = undefined;
    };
    pi.on("agent_start", (_event, ctx) => {
      clear();
      timer = setTimeout(() => ctx.abort(), timeoutSeconds * 1000);
      timer.unref();
    });
    pi.on("turn_start", (event, ctx) => {
      if (event.turnIndex >= maxTurns) ctx.abort();
    });
    pi.on("agent_end", clear);
    pi.on("session_shutdown", clear);
  };
}

/** The curator's own resources: its fixed prompt and its own tools, with no harness extension, skill or context file. */
async function createReviewResources(input: {cwd: string; systemPrompt: string}) {
  const settingsManager = SettingsManager.inMemory({});
  settingsManager.setProjectTrusted(true);
  const resourceLoader = new DefaultResourceLoader({
    cwd: input.cwd,
    agentDir: getAgentDir(),
    settingsManager,
    noExtensions: true,
    noSkills: true,
    noPromptTemplates: true,
    noThemes: true,
    noContextFiles: true,
    extensionFactories: [reviewLimits()],
    systemPrompt: "",
    systemPromptOverride: () => undefined,
    appendSystemPrompt: [],
    appendSystemPromptOverride: () => [input.systemPrompt],
  });
  await resourceLoader.reload();
  return {resourceLoader, settingsManager};
}

async function firstExistingDirectory(candidates: readonly string[]): Promise<string | undefined> {
  for (const candidate of candidates) {
    if (
      await stat(candidate).then(
        (info) => info.isDirectory(),
        () => false
      )
    )
      return candidate;
  }
  return undefined;
}

/** One line, because a failed review is listed as one line. */
function oneLine(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.split("\n")[0]!.slice(0, 300);
}

export interface RunCuratorReviewInput {
  readonly harnessId: string;
  readonly projectId?: string;
  readonly trigger: CuratorReviewTrigger;
  /** `full` reviews instructions, plans and memory; `memory` is the cheap after-run hygiene pass. */
  readonly scope: "full" | "memory";
  readonly piSdk: PiSdkServiceShape;
  readonly store?: HarnessStore;
  readonly curation?: CuratorStore;
  readonly runs?: HarnessRunStore;
}

/**
 * Runs one review: a single Pi session with the curator's fixed prompt and its own tools, bounded by turns, wall
 * clock, a per-review cost cap and the harness's daily cap. The session is in memory, so it never shows up in the
 * user's chat list and writes no run receipt; what it did is the review record and the proposals it filed.
 */
export async function runCuratorReview(input: RunCuratorReviewInput): Promise<CuratorReview> {
  const store = input.store ?? harnessStore;
  const curation = input.curation ?? curatorStore;
  const runs = input.runs ?? harnessRunStore;
  const library = await store.list();
  const harness: HarnessConfig | undefined = library.harnesses.find((item) => item.id === input.harnessId);
  if (!harness) throw new Error("Harness not found.");
  const curator = harness.curator;
  if (!curator?.enabled) throw new Error("The curator is switched off for this harness.");
  const projects = library.projects.filter((item) => item.harnessId === harness.id);
  const project: HarnessProject | undefined = input.projectId ? projects.find((item) => item.id === input.projectId) : undefined;
  if (input.projectId && !project) throw new Error("Project is not part of this harness.");
  if (input.scope === "memory" && !project) throw new Error("A memory review needs the project whose ledger it reads.");
  const scoped = project ? [project] : projects;

  const started: CuratorReview = {
    id: randomUUID(),
    harnessId: harness.id,
    ...(project ? {projectId: project.id} : {}),
    trigger: input.trigger,
    status: "running",
    startedAt: new Date().toISOString(),
    summary: "",
    proposals: 0,
    applied: 0,
  };
  const spentBefore = await curation.spentToday(harness.id);
  if (spentBefore >= curator.maxCostUsdPerDay) {
    return curation.addReview({
      ...started,
      status: "failed",
      finishedAt: new Date().toISOString(),
      error: `The curator already spent ${spentBefore.toFixed(2)} USD today, its limit being ${curator.maxCostUsdPerDay} USD.`,
    });
  }
  await curation.addReview(started);

  const tally = {proposals: 0, applied: 0, targets: new Set<string>()};
  const finish = (patch: Partial<CuratorReview>): Promise<CuratorReview> =>
    curation.updateReview({...started, proposals: tally.proposals, applied: tally.applied, finishedAt: new Date().toISOString(), ...patch});

  try {
    const coordinator = projects.find((item) => item.id === harness.coordinatorProjectId);
    const cwd = await firstExistingDirectory(
      [project?.path, coordinator?.path, ...projects.map((item) => item.path), harness.source?.rootPath].filter((path): path is string => Boolean(path))
    );
    const systemPrompt = curatorSystemPrompt({
      harnessName: harness.name,
      budgetPercent: instructionBudgetPercent(harness, scoped),
      scopeLine: curatorScopeLine({scope: input.scope, harnessName: harness.name, projectName: project?.name}),
    });
    const resources = await createReviewResources({cwd: cwd ?? store.root, systemPrompt});
    const execution = curator.execution ?? harness.execution;
    const reference = execution?.model;
    const model = reference ? input.piSdk.modelRuntime.getAvailableSnapshot().find((item) => item.id === reference.id && item.provider === reference.providerId) : undefined;
    if (reference && !model) throw new Error(`The curator's model is unavailable: ${reference.providerId}/${reference.id}. Update it in Agents.`);
    const effort = execution?.effort ?? reference?.thinkingLevel;
    const tools: ToolDefinition[] = createCuratorTools(
      {
        harnessId: harness.id,
        reviewId: started.id,
        scope: input.scope,
        ...(project ? {projectId: project.id} : {}),
        autoApply: curator.autoApply,
        actor: {modelProvider: model?.provider ?? "pi-plus", modelId: model?.id ?? "curator", sessionId: started.id},
        store,
        curation,
        runs,
      },
      tally
    );
    const {session} = await input.piSdk.createAgentSession({
      cwd: cwd ?? store.root,
      ...resources,
      modelRuntime: input.piSdk.modelRuntime,
      ...(model ? {model} : {}),
      ...(effort ? {thinkingLevel: toPiThinkingLevel(effort)} : {}),
      sessionManager: SessionManager.inMemory(cwd ?? store.root),
      tools: tools.map((tool) => tool.name),
      customTools: tools,
    });
    const spend = () => session.state.messages.filter((message) => message.role === "assistant").reduce((total, message) => total + message.usage.cost.total, 0);
    let capped: string | undefined;
    // The cap is enforced between turns, the same place the workflow runner stops a run that has spent its budget.
    const unsubscribe = session.subscribe((event) => {
      if (capped || (event.type !== "turn_end" && event.type !== "message_end")) return;
      const spent = spend();
      if (spent < curator.maxCostUsdPerRun) return;
      capped = `The review reached its cost limit of ${curator.maxCostUsdPerRun} USD after spending ${spent.toFixed(4)} USD.`;
      void session.abort();
    });
    try {
      await session.bindExtensions({});
      await session.prompt(openingMessage);
      await session.agent.waitForIdle();
      const answers = session.state.messages.filter((message) => message.role === "assistant");
      const answer = answers.at(-1);
      const spentUsd = spend();
      if (capped) return await finish({status: "failed", spentUsd, error: capped});
      if (!answer || answer.stopReason === "error" || answer.stopReason === "aborted")
        return await finish({status: "failed", spentUsd, error: oneLine(answer?.errorMessage || answer?.stopReason || "The review produced no answer.")});
      const text = answer.content
        .filter((part) => part.type === "text")
        .map((part) => part.text)
        .join("\n");
      return await finish({status: "completed", spentUsd, summary: curatorSummary(text)});
    } finally {
      unsubscribe();
      session.dispose();
    }
  } catch (error) {
    return finish({status: "failed", error: oneLine(error)});
  }
}
