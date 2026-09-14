import {backgroundDelegations} from "@supernova/agent-runtime/layers/harnesses/internal/background-delegations";
import {readFile, realpath, stat} from "node:fs/promises";
import {createHash, randomUUID} from "node:crypto";
import {isAbsolute, relative, resolve, sep} from "node:path";
import {DefaultResourceLoader, getAgentDir, SessionManager, SettingsManager} from "@earendil-works/pi-coding-agent";
import type {ExtensionContext, ExtensionFactory, ResourceLoader, ToolDefinition} from "@earendil-works/pi-coding-agent";
import {Type} from "typebox";
import {getSupportedThinkingLevels} from "@earendil-works/pi-ai";
import type {HarnessAgent, HarnessSnapshot, HarnessRun, WorkflowStepUsage} from "@supernova/contracts/harnesses/schemas";
import {harnessPromptLayers} from "@supernova/agent-runtime/layers/harnesses/lib/harness-prompts";
import {HarnessRunStore} from "@supernova/agent-runtime/layers/harnesses/internal/harness-run-store";
import {describeWorkflowRun, runWorkflow} from "@supernova/agent-runtime/layers/harnesses/internal/workflow-runner";
import type {WorkflowStepExecutor} from "@supernova/agent-runtime/layers/harnesses/internal/workflow-runner";
import {HarnessConfigurationFailure} from "@supernova/agent-runtime/layers/harnesses/lib/harness-failures";
import {captureHarnessContext} from "@supernova/agent-runtime/layers/harnesses/internal/harness-run-context";
import {WorkerTranscript} from "@supernova/agent-runtime/layers/harnesses/internal/worker-transcript";
import {createHarnessViewTool} from "@supernova/agent-runtime/layers/harnesses/internal/harness-view-tool";
import {harnessStore} from "@supernova/agent-runtime/layers/harnesses/internal/harness-store";
import {curatorScheduler} from "@supernova/agent-runtime/layers/curator/curator-scheduler";
import {createCurationRequestTool} from "@supernova/agent-runtime/layers/curator/curator-request-tool";
import {toolCredentials} from "@supernova/agent-runtime/layers/harnesses/internal/tool-credentials";
import {resolveHarnessProject} from "@supernova/agent-runtime/layers/harnesses/lib/harness-config";
import {toPiThinkingLevel} from "@supernova/agent-runtime/layers/session-runtime/lib/models/thinking-levels";
import type {PiSdkServiceShape} from "@supernova/agent-runtime/layers/pi-sdk";
import {createPiCustomTools} from "@supernova/agent-runtime/layers/session-runtime/internal/tools/create-pi-custom-tools";

/** Sent one turn, or thirty seconds, before a worker would otherwise be cut off in the middle of exploring. */
const windDownMessage =
  "Your turn and time budget for this task is nearly exhausted. Stop exploring, make no further tool calls, and write your findings, partial results and next steps as your final answer now.";

const workflowReadTools = new Set(["read", "grep", "find", "ls", "web_fetch"]);

/** Bounds a worker's loop: it is steered to write up shortly before the turn and time limits, and still aborted at them. */
function executionLimits(snapshot: HarnessSnapshot, windDown?: () => void): ExtensionFactory {
  return (pi) => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let warning: ReturnType<typeof setTimeout> | undefined;
    const clear = () => {
      if (timer) clearTimeout(timer);
      if (warning) clearTimeout(warning);
      timer = undefined;
      warning = undefined;
    };
    const {maxTurns, timeoutSeconds} = snapshot.harness.loop;
    pi.on("agent_start", (_event, ctx) => {
      clear();
      timer = setTimeout(() => ctx.abort(), timeoutSeconds * 1000);
      timer.unref();
      // Under ninety seconds there is no room for a write-up between the note and the abort, so the note is skipped.
      if (windDown && timeoutSeconds >= 90) {
        warning = setTimeout(windDown, (timeoutSeconds - 30) * 1000);
        warning.unref();
      }
    });
    pi.on("turn_start", (event, ctx) => {
      if (windDown && event.turnIndex === maxTurns - 1) windDown();
      if (event.turnIndex >= maxTurns) ctx.abort();
    });
    pi.on("agent_end", clear);
    pi.on("session_shutdown", clear);
  };
}

/** Upper bound on one appended instruction file, so a single document cannot crowd out the conversation. */
const maxInstructionFileBytes = 128000;

/** Reads one project-relative instruction file, refusing absolute paths, symlink escapes and oversized documents. */
async function readInstructionFile(projectRoot: string, file: string, label: string): Promise<string> {
  if (isAbsolute(file)) throw new Error(`${label} must be project-relative.`);
  const target = await realpath(resolve(projectRoot, file));
  const rel = relative(projectRoot, target);
  if (rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel)) throw new Error(`${label} escapes the project directory.`);
  if ((await stat(target)).size > maxInstructionFileBytes) throw new Error(`${label} is too large: ${file}`);
  return readFile(target, "utf8");
}

/**
 * Loads only explicitly configured extensions and context; no ambient package auto-discovery.
 * `windDown` is called shortly before the loop limits so the caller can steer its own session; leaving it out keeps the bare abort.
 */
export async function createHarnessResources(
  snapshot: HarnessSnapshot,
  specialistPrompt?: string,
  skillNames?: readonly string[],
  windDown?: () => void
): Promise<{resourceLoader: ResourceLoader; settingsManager: SettingsManager}> {
  const {harness, project} = snapshot;
  await toolCredentials.loadIntoRuntime();
  const contextFiles: string[] = [];
  const projectRoot = await realpath(project.path);
  for (const file of harness.context.files) {
    contextFiles.push(`Project context file: ${file}\n\n${await readInstructionFile(projectRoot, file, "Context file")}`);
  }
  for (const file of project.planningDocuments ?? []) {
    // Plans, goals and roadmaps every agent in this project works from. One that has been moved or deleted
    // must not block the chat; the resources view reports it as a warning instead.
    if (!(await stat(resolve(projectRoot, file)).catch(() => undefined))) continue;
    contextFiles.push(`Project planning document: ${file}\n\n${await readInstructionFile(projectRoot, file, "Planning document")}`);
  }
  const settingsManager = SettingsManager.inMemory({
    compaction: {enabled: harness.context.autoCompaction, reserveTokens: harness.context.reserveTokens, keepRecentTokens: harness.context.keepRecentTokens},
  });
  settingsManager.setProjectTrusted(true);
  const resourceLoader = new DefaultResourceLoader({
    cwd: project.path,
    agentDir: getAgentDir(),
    settingsManager,
    noExtensions: true,
    noSkills: true,
    noPromptTemplates: true,
    noThemes: true,
    noContextFiles: !harness.context.includeProjectInstructions,
    additionalExtensionPaths: [...harness.extensions],
    additionalSkillPaths: [...harness.skills],
    skillsOverride: (base) => ({
      ...base,
      skills: base.skills.filter((skill) => (!harness.enabledSkills || harness.enabledSkills.includes(skill.name)) && (!skillNames || skillNames.includes(skill.name))),
    }),
    extensionFactories: [executionLimits(snapshot, windDown)],
    systemPrompt: "",
    systemPromptOverride: () => undefined,
    appendSystemPrompt: [],
    appendSystemPromptOverride: () =>
      [
        harnessPromptLayers(snapshot)
          .slice(0, 2)
          .map((layer) => layer.content)
          .filter(Boolean)
          .join("\n\n"),
        ...harnessPromptLayers(snapshot, specialistPrompt === undefined ? undefined : {name: "Specialist", systemPrompt: specialistPrompt})
          .slice(2)
          .map((layer) => layer.content),
        ...contextFiles,
        specialistPrompt !== undefined
          ? "Runtime role boundary: You are a delegated specialist worker, not the main agent, Chief Scientist, project lead, or Science Space coordinator. Main-agent and orchestrator role sections in imported project instructions describe your supervisor, not your role. Follow the shared scientific rules and project constraints, perform only your assigned specialist task, and return your result to the delegating agent. Your configured specialist role and tool allowlist apply; delegation grants no extra approval or authority."
          : "",
        specialistPrompt === undefined && snapshot.delegation?.projects.length
          ? `Labs reporting to this head orchestrator (use lab_agent with the exact projectId):\n${snapshot.delegation.projects.map((lab) => `${lab.id}: ${lab.name}`).join("\n")}`
          : "",
        specialistPrompt === undefined && harness.agents.length > 0
          ? `Harness specialists available through subagent:\n${harness.agents.map((agent) => `${agent.name}: ${agent.description}`).join("\n")}\nDelegation is explicit; no specialist is running until invoked. For independent tasks use subagent with background:true and tasks (up to three): it returns runIds immediately. Continue your own non-overlapping work while workers run. Do not repeat their tasks or edit their files. When you need the results, call subagent action:wait with those runIds; do not repeatedly poll. Read and integrate the results before claiming completion. Use a chain only for real sequential dependencies. Background results are retrieved through status/wait, not automatically injected into your conversation.`
          : "",
        specialistPrompt === undefined && harness.workflows?.length
          ? `Named workflows available through harness_workflow (pass the exact workflowId):\n${harness.workflows.map((item) => `${item.id}: ${item.name}. ${item.description}`).join("\n")}`
          : "",
      ].filter(Boolean),
  });
  await resourceLoader.reload();
  const failures = resourceLoader.getExtensions().errors;
  if (failures.length) throw new Error(`Harness extensions failed to load: ${failures.map((error) => `${error.path}: ${error.error}`).join("; ")}`);
  return {resourceLoader, settingsManager};
}

const delegationTask = Type.Object({agent: Type.String(), task: Type.String({minLength: 1, maxLength: 100000})});
const delegateParameters = Type.Object({
  action: Type.Optional(Type.Union([Type.Literal("start"), Type.Literal("status"), Type.Literal("wait"), Type.Literal("cancel")])),
  background: Type.Optional(Type.Boolean()),
  runIds: Type.Optional(Type.Array(Type.String(), {minItems: 1, maxItems: 3})),
  agent: Type.Optional(Type.String()),
  task: Type.Optional(Type.String({minLength: 1, maxLength: 100000})),
  chain: Type.Optional(Type.Array(delegationTask, {minItems: 1, maxItems: 12})),
  tasks: Type.Optional(Type.Array(delegationTask, {minItems: 1, maxItems: 3})),
});
const workflowParameters = Type.Object({
  workflowId: Type.Optional(Type.String()),
  task: Type.String({minLength: 1, maxLength: 100000}),
  resumeRunId: Type.Optional(Type.String()),
  allowExternalRetry: Type.Optional(Type.Boolean()),
});
const labParameters = Type.Object({projectId: Type.String(), task: Type.String({minLength: 1, maxLength: 100000}), background: Type.Optional(Type.Boolean())});

/** Runs configured specialists in isolated in-memory sessions with explicit tool allowlists. */
export function createHarnessTools(snapshot: HarnessSnapshot, piSdk: PiSdkServiceShape, trace?: {chatId: string; store: HarnessRunStore; parentRunId?: string}): ToolDefinition[] {
  const runSession = async (
    child: HarnessSnapshot,
    name: string,
    task: string,
    ctx: ExtensionContext,
    signal?: AbortSignal,
    agent?: HarnessAgent,
    workflow?: Pick<Parameters<WorkflowStepExecutor>[0], "effects" | "maxCostUsd" | "onStarted" | "onUsage">,
    receiptId?: string
  ): Promise<{runId?: string; text: string; usage: WorkflowStepUsage}> => {
    const now = new Date().toISOString();
    const transcript = new WorkerTranscript();
    let receipt: HarnessRun | undefined = trace
      ? {
          id: receiptId ?? randomUUID(),
          chatId: trace.chatId,
          parentRunId: trace.parentRunId,
          harnessId: child.harness.id,
          projectId: child.project.id,
          projectName: child.project.name,
          projectPath: child.project.path,
          agentName: name,
          role: agent ? "specialist" : "lab-orchestrator",
          color: agent ? agent.color : child.project.color,
          task,
          status: "starting",
          startedAt: now,
          updatedAt: now,
          revision: child.revision,
          instructions: harnessPromptLayers(child, agent),
          output: "",
          events: [{at: now, message: "Preparing isolated worker"}],
          transcript: transcript.snapshot(),
        }
      : undefined;
    let writes = Promise.resolve();
    let writeError: unknown;
    const update = (patch: Partial<HarnessRun>) => {
      if (!receipt || !trace) return;
      receipt = {...receipt, ...patch, updatedAt: new Date().toISOString()};
      const captured = receipt;
      writes = writes
        .then(() => trace.store.save(captured))
        .catch((error) => {
          writeError = error;
        });
    };
    if (receipt && trace) await trace.store.save(receipt);
    if (receipt) await workflow?.onStarted?.(receipt.id);
    try {
      if (signal?.aborted) throw new Error("Delegation cancelled.");
      const execution = {...child.harness.execution, ...agent?.execution};
      const reference = execution?.model;
      const model = reference ? piSdk.modelRuntime.getAvailableSnapshot().find((item) => item.id === reference.id && item.provider === reference.providerId) : ctx.model;
      if (reference && !model) throw new HarnessConfigurationFailure(`Model unavailable for ${name}: ${reference.providerId}/${reference.id}. Update its model in Agents.`);
      const inheritedEffort = ctx.sessionManager?.getBranch().findLast((entry) => entry.type === "thinking_level_change")?.thinkingLevel;
      const thinkingLevel = toPiThinkingLevel(execution?.effort ?? reference?.thinkingLevel ?? inheritedEffort);
      if (model && execution?.effort && !getSupportedThinkingLevels(model).includes(thinkingLevel))
        throw new HarnessConfigurationFailure(`The selected model does not support ${execution.effort} effort for ${name}.`);
      // The loop limits live in an extension loaded with the resources, while the session it steers exists only afterwards.
      let windDown: (() => void) | undefined = undefined;
      const resources = await createHarnessResources(child, agent?.systemPrompt, agent?.skillNames, () => windDown?.());
      if (model) {
        const estimate = Math.ceil(resources.resourceLoader.getAppendSystemPrompt().join("\n\n").length / 4);
        const budget = model.contextWindow - child.harness.context.reserveTokens;
        if (estimate > budget)
          throw new HarnessConfigurationFailure(
            `Instructions for ${name} need about ${estimate.toLocaleString()} tokens, which does not fit ${model.id}: its window is ${model.contextWindow.toLocaleString()} tokens and ${child.harness.context.reserveTokens.toLocaleString()} are reserved, leaving ${budget.toLocaleString()}. Shorten the instructions or the context files.`
          );
      }
      const {session} = await piSdk.createAgentSession({
        ...resources,
        cwd: child.project.path,
        modelRuntime: piSdk.modelRuntime,
        model,
        thinkingLevel,
        sessionManager: SessionManager.inMemory(child.project.path),
        ...(agent && {tools: workflow?.effects === "none" ? agent.tools.filter((tool) => workflowReadTools.has(tool)) : [...agent.tools]}),
        customTools: [...createPiCustomTools(), ...(!agent ? createHarnessTools(child, piSdk, trace ? {...trace, parentRunId: receipt?.id} : undefined) : [])],
        excludeTools: agent ? ["subagent", "harness_workflow", "lab_agent", "manage_lab_view"] : ["lab_agent"],
      });
      let steered = false;
      windDown = () => {
        if (steered) return;
        steered = true;
        void session.steer(windDownMessage);
      };
      let transcriptDirty = false;
      let usageWrites = Promise.resolve();
      const reportUsage = () => {
        const usage = session.state.messages.reduce(
          (total, message) =>
            message.role !== "assistant"
              ? total
              : {
                  inputTokens: total.inputTokens + message.usage.input,
                  outputTokens: total.outputTokens + message.usage.output,
                  costUsd: total.costUsd + message.usage.cost.total,
                },
          {inputTokens: 0, outputTokens: 0, costUsd: 0}
        );
        if (workflow?.maxCostUsd !== undefined && usage.costUsd >= workflow.maxCostUsd) void session.abort();
        if (workflow?.onUsage)
          usageWrites = usageWrites
            .then(() => workflow.onUsage!(usage))
            .catch((error) => {
              writeError = error;
              void session.abort();
            });
      };
      const flushTranscript = () => {
        if (!transcriptDirty) return;
        transcriptDirty = false;
        update({transcript: transcript.snapshot()});
      };
      // Token streams are coalesced to one receipt write per second; completed messages flush immediately.
      const transcriptTimer = trace ? setInterval(flushTranscript, 1000) : undefined;
      transcriptTimer?.unref();
      const unsubscribe = trace
        ? session.subscribe((event) => {
            if (transcript.record(event)) {
              transcriptDirty = true;
              if (event.type !== "message_update" && event.type !== "tool_execution_update") flushTranscript();
            }
            if (event.type === "agent_start") {
              const runtime = captureHarnessContext(session, resources.resourceLoader);
              update({status: "running", activity: "Working", runtime, model: runtime.model});
            }
            if (event.type === "tool_execution_start" || event.type === "tool_execution_end") {
              const activity = `${event.type === "tool_execution_start" ? "Using" : event.isError ? "Failed" : "Finished"} ${event.toolName}`;
              update({activity, events: [...(receipt?.events ?? []), {at: new Date().toISOString(), message: activity}].slice(-200)});
            }
          })
        : undefined;
      const unsubscribeUsage = workflow?.onUsage
        ? session.subscribe((event) => {
            if (event.type === "message_end") reportUsage();
          })
        : undefined;
      const abort = () => {
        void session.abort();
      };
      signal?.addEventListener("abort", abort, {once: true});
      try {
        if (signal?.aborted) throw new Error("Delegation cancelled.");
        await session.bindExtensions({});
        await session.prompt(task);
        await session.agent.waitForIdle();
        reportUsage();
        await usageWrites;
        // A final validated reply remains useful if billing/cancellation arrived as it finished.
        const answers = session.state.messages.filter((message) => message.role === "assistant");
        const answer = answers.at(-1);
        const text =
          answer?.content
            .filter((part) => part.type === "text")
            .map((part) => part.text)
            .join("\n") ?? "";
        if (!answer || answer.stopReason === "error" || answer.stopReason === "aborted")
          throw new Error(`Specialist ${name} did not complete: ${answer?.errorMessage || answer?.stopReason || "no response"}`);
        flushTranscript();
        update({status: "completed", output: text, activity: "Completed", finishedAt: new Date().toISOString()});
        await writes;
        // Only a run with a receipt is evidence, so only that run arms the curator's after-run pass.
        if (trace) void curatorScheduler.noteRunFinished({harnessId: child.harness.id, projectId: child.project.id, piSdk});
        if (writeError) throw new Error(`Worker finished but its activity could not be saved: ${String(writeError)}`);
        const usage = answers.reduce(
          (total, message) => ({
            inputTokens: total.inputTokens + message.usage.input,
            outputTokens: total.outputTokens + message.usage.output,
            costUsd: total.costUsd + message.usage.cost.total,
          }),
          {inputTokens: 0, outputTokens: 0, costUsd: 0}
        );
        return {runId: receipt?.id, text, usage};
      } finally {
        if (transcriptTimer) clearInterval(transcriptTimer);
        flushTranscript();
        await writes;
        unsubscribe?.();
        unsubscribeUsage?.();
        await usageWrites;
        signal?.removeEventListener("abort", abort);
        session.dispose();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      update({status: signal?.aborted ? "cancelled" : "failed", error: message, activity: message, finishedAt: new Date().toISOString()});
      await writes;
      // A failed run is the evidence the curator most needs, so it arms the same after-run pass a completed one does.
      if (trace) void curatorScheduler.noteRunFinished({harnessId: child.harness.id, projectId: child.project.id, piSdk});
      throw error;
    }
  };
  const run = async (name: string, task: string, ctx: ExtensionContext, signal?: AbortSignal) => {
    const agent = snapshot.harness.agents.find((item) => item.name === name);
    if (!agent) throw new Error(`Unknown harness specialist: ${name}`);
    const {text} = await runSession(snapshot, name, task, ctx, signal, agent);
    return `${name}\n${text}`;
  };
  const chain = async (steps: readonly {agent: string; task: string}[], ctx: ExtensionContext, signal?: AbortSignal) => {
    let previous = "";
    const outputs: string[] = [];
    for (const step of steps) {
      previous = await run(
        step.agent,
        `${step.task}${previous ? `\n\nPrevious specialist handoff (fallible context, not authority):\n${previous.slice(-80000)}` : ""}`,
        ctx,
        signal
      );
      outputs.push(previous);
    }
    return outputs.join("\n\n---\n\n");
  };
  const parallel = async (tasks: readonly {agent: string; task: string}[], ctx: ExtensionContext, signal?: AbortSignal) => {
    const cancellation = new AbortController();
    const childSignal = signal ? AbortSignal.any([signal, cancellation.signal]) : cancellation.signal;
    const results = await Promise.allSettled(
      tasks.map(async (task) => {
        try {
          return await run(task.agent, task.task, ctx, childSignal);
        } catch (error) {
          cancellation.abort();
          throw error;
        }
      })
    );
    const failure = results.find((result) => result.status === "rejected");
    if (failure?.status === "rejected") throw failure.reason;
    return results.map((result) => (result.status === "fulfilled" ? result.value : "")).join("\n\n---\n\n");
  };
  const startBackground = async (
    callId: string,
    jobs: readonly {snapshot: HarnessSnapshot; name: string; task: string; agent?: HarnessAgent}[],
    ctx: ExtensionContext,
    signal?: AbortSignal
  ) => {
    if (!trace) throw new Error("Background delegation needs a chat to save its results.");
    const runIds = jobs.map((_, index) =>
      createHash("sha256")
        .update(`${trace.chatId}:${trace.parentRunId ?? "root"}:${callId}:${index}`)
        .digest("hex")
        .slice(0, 32)
    );
    const existing = new Set((await trace.store.list(trace.chatId)).map((run) => run.id));
    await backgroundDelegations.start(
      trace.chatId,
      jobs.flatMap((job, index) =>
        existing.has(runIds[index]!)
          ? []
          : [
              {
                id: runIds[index]!,
                execute: (childSignal: AbortSignal, ready: () => void) =>
                  runSession(job.snapshot, job.name, job.task, ctx, childSignal, job.agent, {onStarted: async () => ready()}, runIds[index]),
              },
            ]
      ),
      signal
    );
    return {
      content: [
        {
          type: "text" as const,
          text: `Delegated work accepted. Run IDs: ${runIds.join(", ")}. Continue independent work now; use subagent action:wait with these runIds when you need their results. Do not duplicate their assignments.`,
        },
      ],
      details: {harnessId: snapshot.harness.id, runIds, background: true},
    };
  };
  const delegate: ToolDefinition<typeof delegateParameters> = {
    name: "subagent",
    label: "Harness specialists",
    description:
      "Delegate ad hoc work to this harness's specialists: agent/task for one, chain for sequential handoffs, or up to three parallel tasks. Set background:true to return runIds immediately and continue your own independent work. Use action:wait with runIds to join results, status to inspect, cancel to stop. A chain remains synchronous. Assign separate ownership; do not duplicate tasks or overlap writes. Free text in, free text out, with a chat-owned execution receipt and public conversation. Use harness_workflow instead to run one of this harness's named workflows. Specialists cannot recursively delegate.",
    parameters: delegateParameters,
    executionMode: "sequential",
    async execute(_id, params, signal, _update, ctx) {
      if (params.action && params.action !== "start") {
        if (!trace || !params.runIds?.length) throw new Error("Provide runIds belonging to this chat.");
        if (params.agent || params.task || params.tasks || params.chain) throw new Error("Do not combine an inspection action with new assignments.");
        // Validate ownership before waiting or cancelling anything.
        await Promise.all(params.runIds.map((id) => trace.store.get(trace.chatId, id)));
        if (params.action === "wait") await backgroundDelegations.wait(trace.chatId, params.runIds, signal);
        if (params.action === "cancel") await backgroundDelegations.cancel(trace.chatId, params.runIds);
        const runs = await Promise.all(params.runIds.map((id) => trace.store.get(trace.chatId, id)));
        return {
          content: [{type: "text", text: runs.map((run) => `${run.id} · ${run.agentName} · ${run.status}\n${run.output || run.error || run.activity || ""}`).join("\n\n---\n\n")}],
          details: {runIds: params.runIds},
        };
      }
      if (params.runIds) throw new Error("Use an inspection action with runIds.");
      if (Number(Boolean(params.agent && params.task)) + Number(Boolean(params.chain)) + Number(Boolean(params.tasks)) !== 1)
        throw new Error("Choose exactly one delegation mode: agent/task, chain, or tasks.");
      if (params.background) {
        if (params.chain) throw new Error("Use background tasks for independent work; chains wait for each predecessor.");
        const jobs = (params.tasks ?? [{agent: params.agent!, task: params.task!}]).map((task) => {
          const agent = snapshot.harness.agents.find((item) => item.name === task.agent);
          if (!agent) throw new Error(`Unknown harness specialist: ${task.agent}`);
          return {snapshot, name: agent.name, task: task.task, agent};
        });
        return startBackground(_id, jobs, ctx, signal);
      }
      const text = params.chain
        ? await chain(params.chain, ctx, signal)
        : params.tasks
          ? await parallel(params.tasks, ctx, signal)
          : await run(params.agent!, params.task!, ctx, signal);
      return {content: [{type: "text", text}], details: {harnessId: snapshot.harness.id}};
    },
  };
  const workflow: ToolDefinition<typeof workflowParameters> = {
    name: "harness_workflow",
    label: "Harness workflow",
    description:
      "Run a named workflow dependency graph. Ready independent steps run up to its parallel limit, while workspace writers are exclusive. Steps receive only the validated outputs they read; shared outputs are produced once. Reads-only steps use read, grep, find, ls and web_fetch tools. A failed branch blocks its dependents; successful branches are kept on resumeRunId. Use subagent for ad hoc delegation instead.",
    parameters: workflowParameters,
    executionMode: "sequential",
    async execute(_id, params, signal, _update, ctx) {
      if (!trace) throw new Error("Workflow runs need a chat to save their state.");
      const resume = params.resumeRunId ? await trace.store.getWorkflowRun(trace.chatId, params.resumeRunId) : undefined;
      const workflows = snapshot.harness.workflows ?? [];
      const selected = resume?.workflow ?? (params.workflowId ? workflows.find((item) => item.id === params.workflowId) : workflows[0]);
      if (!selected)
        throw new Error(
          params.workflowId
            ? `Unknown workflow: ${params.workflowId}. This harness offers ${workflows.map((item) => item.id).join(", ") || "none"}.`
            : "No workflow is configured for this harness."
        );
      const completed = await runWorkflow({
        snapshot,
        workflow: selected,
        chatId: trace.chatId,
        task: resume?.task ?? params.task,
        store: trace.store,
        resume,
        allowExternalRetry: params.allowExternalRetry,
        signal,
        invocationId: `${trace.parentRunId ?? "root"}:${_id}`,
        onUpdate: (run) =>
          _update?.({
            content: [{type: "text", text: `${run.workflowName}: ${run.completedCount ?? 0} of ${run.stepCount} steps completed`}],
            details: {workflowRunId: run.id, status: run.status},
          }),
        execute: ({snapshot: child, agent, task, signal: childSignal, ...workflow}) => runSession(child, agent.name, task, ctx, childSignal, agent, workflow),
      });
      return {
        content: [{type: "text", text: describeWorkflowRun(completed)}],
        details: {workflowRunId: completed.id, status: completed.status, cursor: completed.cursor},
      };
    },
  };
  const lab: ToolDefinition<typeof labParameters> = {
    name: "lab_agent",
    label: "Lab orchestrator",
    description:
      "Delegate a bounded task to a lab under Science Space. The lab gets its own working directory, instructions, model, skills, and specialists. Set background:true to return immediately, continue independent work and collect the result with subagent action:wait and runIds. No experiment approval is implied.",
    parameters: labParameters,
    executionMode: "sequential",
    async execute(_id, params, signal, _update, ctx) {
      const project = snapshot.delegation?.projects.find((item) => item.id === params.projectId);
      if (!project || !snapshot.delegation) throw new Error("This lab does not report to this head orchestrator.");
      const child = resolveHarnessProject(snapshot.delegation.harness, project, snapshot.revision);
      if (params.background) return startBackground(_id, [{snapshot: child, name: project.name, task: params.task}], ctx, signal);
      const {text} = await runSession(child, project.name, params.task, ctx, signal);
      return {content: [{type: "text", text: `${project.name}\n${text}`}], details: {projectId: project.id, agentName: project.name}};
    },
  };
  const view = createHarnessViewTool(snapshot, harnessStore);
  const curation = trace ? [createCurationRequestTool(snapshot, trace.chatId)] : [];
  return snapshot.delegation?.projects.length ? [delegate, workflow, lab, view, ...curation] : [delegate, workflow, view, ...curation];
}
