import {readFile, realpath, stat} from "node:fs/promises";
import {randomUUID} from "node:crypto";
import {isAbsolute, relative, resolve, sep} from "node:path";
import {DefaultResourceLoader, getAgentDir, SessionManager, SettingsManager} from "@earendil-works/pi-coding-agent";
import type {ExtensionContext, ExtensionFactory, ResourceLoader, ToolDefinition} from "@earendil-works/pi-coding-agent";
import {Type} from "typebox";
import {getSupportedThinkingLevels} from "@earendil-works/pi-ai";
import type {HarnessAgent, HarnessSnapshot, HarnessRun} from "@supernova/contracts/harnesses/schemas";
import {harnessPromptLayers} from "@supernova/agent-runtime/layers/harnesses/lib/harness-prompts";
import {HarnessRunStore} from "@supernova/agent-runtime/layers/harnesses/internal/harness-run-store";
import {captureHarnessContext} from "@supernova/agent-runtime/layers/harnesses/internal/harness-run-context";
import {createHarnessViewTool} from "@supernova/agent-runtime/layers/harnesses/internal/harness-view-tool";
import {harnessStore} from "@supernova/agent-runtime/layers/harnesses/internal/harness-store";
import {toolCredentials} from "@supernova/agent-runtime/layers/harnesses/internal/tool-credentials";
import {resolveHarnessProject} from "@supernova/agent-runtime/layers/harnesses/lib/harness-config";
import {toPiThinkingLevel} from "@supernova/agent-runtime/layers/session-runtime/lib/models/thinking-levels";
import type {PiSdkServiceShape} from "@supernova/agent-runtime/layers/pi-sdk";
import {createPiCustomTools} from "@supernova/agent-runtime/layers/session-runtime/internal/tools/create-pi-custom-tools";

function executionLimits(snapshot: HarnessSnapshot): ExtensionFactory {
  return (pi) => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const clear = () => {
      if (timer) clearTimeout(timer);
      timer = undefined;
    };
    pi.on("agent_start", (_event, ctx) => {
      clear();
      timer = setTimeout(() => ctx.abort(), snapshot.harness.loop.timeoutSeconds * 1000);
      timer.unref();
    });
    pi.on("turn_start", (event, ctx) => {
      if (event.turnIndex >= snapshot.harness.loop.maxTurns) ctx.abort();
    });
    pi.on("agent_end", clear);
    pi.on("session_shutdown", clear);
  };
}

/** Loads only explicitly configured extensions and context; no ambient package auto-discovery. */
export async function createHarnessResources(
  snapshot: HarnessSnapshot,
  specialistPrompt?: string,
  skillNames?: readonly string[]
): Promise<{resourceLoader: ResourceLoader; settingsManager: SettingsManager}> {
  const {harness, project} = snapshot;
  await toolCredentials.loadIntoRuntime();
  const contextFiles: string[] = [];
  const projectRoot = await realpath(project.path);
  for (const file of harness.context.files) {
    if (isAbsolute(file)) throw new Error("Additional context files must be project-relative.");
    const target = await realpath(resolve(projectRoot, file));
    const rel = relative(projectRoot, target);
    if (rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel)) throw new Error("Context file escapes the project directory.");
    if ((await stat(target)).size > 128000) throw new Error(`Context file is too large: ${file}`);
    contextFiles.push(`Project context file: ${file}\n\n${await readFile(target, "utf8")}`);
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
    extensionFactories: [executionLimits(snapshot)],
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
          ? `Harness specialists available through subagent:\n${harness.agents.map((agent) => `${agent.name}: ${agent.description}`).join("\n")}\nThe configured handoff workflow can be invoked with harness_workflow. Delegation is explicit; no specialist is running until invoked.`
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
  agent: Type.Optional(Type.String()),
  task: Type.Optional(Type.String({minLength: 1, maxLength: 100000})),
  chain: Type.Optional(Type.Array(delegationTask, {minItems: 1, maxItems: 12})),
  tasks: Type.Optional(Type.Array(delegationTask, {minItems: 1, maxItems: 3})),
});
const workflowParameters = Type.Object({task: Type.String({minLength: 1, maxLength: 100000})});
const labParameters = Type.Object({projectId: Type.String(), task: Type.String({minLength: 1, maxLength: 100000})});

/** Runs configured specialists in isolated in-memory sessions with explicit tool allowlists. */
export function createHarnessTools(snapshot: HarnessSnapshot, piSdk: PiSdkServiceShape, trace?: {chatId: string; store: HarnessRunStore; parentRunId?: string}): ToolDefinition[] {
  const runSession = async (child: HarnessSnapshot, name: string, task: string, ctx: ExtensionContext, signal?: AbortSignal, agent?: HarnessAgent): Promise<string> => {
    const now = new Date().toISOString();
    let receipt: HarnessRun | undefined = trace
      ? {
          id: randomUUID(),
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
    try {
      if (signal?.aborted) throw new Error("Delegation cancelled.");
      const execution = {...child.harness.execution, ...agent?.execution};
      const reference = execution?.model;
      const model = reference ? piSdk.modelRuntime.getAvailableSnapshot().find((item) => item.id === reference.id && item.provider === reference.providerId) : ctx.model;
      if (reference && !model) throw new Error(`Model unavailable for ${name}: ${reference.providerId}/${reference.id}. Update its model in Agents.`);
      const inheritedEffort = ctx.sessionManager?.getBranch().findLast((entry) => entry.type === "thinking_level_change")?.thinkingLevel;
      const thinkingLevel = toPiThinkingLevel(execution?.effort ?? reference?.thinkingLevel ?? inheritedEffort);
      if (model && execution?.effort && !getSupportedThinkingLevels(model).includes(thinkingLevel))
        throw new Error(`The selected model does not support ${execution.effort} effort for ${name}.`);
      const resources = await createHarnessResources(child, agent?.systemPrompt, agent?.skillNames);
      const {session} = await piSdk.createAgentSession({
        ...resources,
        cwd: child.project.path,
        modelRuntime: piSdk.modelRuntime,
        model,
        thinkingLevel,
        sessionManager: SessionManager.inMemory(child.project.path),
        ...(agent && {tools: [...agent.tools]}),
        customTools: [...createPiCustomTools(), ...(!agent ? createHarnessTools(child, piSdk, trace ? {...trace, parentRunId: receipt?.id} : undefined) : [])],
        excludeTools: agent ? ["subagent", "harness_workflow", "lab_agent", "manage_lab_view"] : ["lab_agent"],
      });
      const unsubscribe = trace
        ? session.subscribe((event) => {
            if (event.type === "agent_start") {
              const runtime = captureHarnessContext(session, resources.resourceLoader);
              update({status: "running", activity: "Working", runtime, model: runtime.model});
            }
            if (event.type === "tool_execution_start" || event.type === "tool_execution_end") {
              const activity = `${event.type === "tool_execution_start" ? "Using" : "Finished"} ${event.toolName}`;
              update({activity, events: [...(receipt?.events ?? []), {at: new Date().toISOString(), message: activity}].slice(-200)});
            }
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
        if (signal?.aborted) throw new Error("Delegation cancelled.");
        const answer = session.state.messages.filter((message) => message.role === "assistant").at(-1);
        const text =
          answer?.content
            .filter((part) => part.type === "text")
            .map((part) => part.text)
            .join("\n") ?? "";
        if (!answer || answer.stopReason === "error" || answer.stopReason === "aborted")
          throw new Error(`Specialist ${name} did not complete: ${answer?.errorMessage || answer?.stopReason || "no response"}`);
        update({status: "completed", output: text, activity: "Completed", finishedAt: new Date().toISOString()});
        await writes;
        if (writeError) throw new Error(`Worker finished but its activity could not be saved: ${String(writeError)}`);
        return `${name}\n${text}`;
      } finally {
        unsubscribe?.();
        signal?.removeEventListener("abort", abort);
        session.dispose();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      update({status: signal?.aborted ? "cancelled" : "failed", error: message, activity: message, finishedAt: new Date().toISOString()});
      await writes;
      throw error;
    }
  };
  const run = async (name: string, task: string, ctx: ExtensionContext, signal?: AbortSignal) => {
    const agent = snapshot.harness.agents.find((item) => item.name === name);
    if (!agent) throw new Error(`Unknown harness specialist: ${name}`);
    return runSession(snapshot, name, task, ctx, signal, agent);
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
  const delegate: ToolDefinition<typeof delegateParameters> = {
    name: "subagent",
    label: "Harness specialists",
    description: "Delegate to this harness's specialists. Use agent/task, chain for sequential handoffs, or up to three parallel tasks. Specialists cannot recursively delegate.",
    parameters: delegateParameters,
    executionMode: "sequential",
    async execute(_id, params, signal, _update, ctx) {
      if (Number(Boolean(params.agent && params.task)) + Number(Boolean(params.chain)) + Number(Boolean(params.tasks)) !== 1)
        throw new Error("Choose exactly one delegation mode: agent/task, chain, or tasks.");
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
    description: "Explicitly run the configured specialist handoff graph for a task. Does not start experiments or an autonomous outer loop.",
    parameters: workflowParameters,
    executionMode: "sequential",
    async execute(_id, params, signal, _update, ctx) {
      if (!snapshot.harness.graph.steps.length) throw new Error("No workflow steps configured for this harness.");
      const text = await chain(
        snapshot.harness.graph.steps.map((agent) => ({agent, task: params.task})),
        ctx,
        signal
      );
      return {content: [{type: "text", text}], details: {steps: snapshot.harness.graph.steps}};
    },
  };
  const lab: ToolDefinition<typeof labParameters> = {
    name: "lab_agent",
    label: "Lab orchestrator",
    description:
      "Delegate a bounded task to a lab under Science Space. The lab gets its own working directory, instructions, model, skills, and specialists. No experiment approval is implied.",
    parameters: labParameters,
    executionMode: "sequential",
    async execute(_id, params, signal, _update, ctx) {
      const project = snapshot.delegation?.projects.find((item) => item.id === params.projectId);
      if (!project || !snapshot.delegation) throw new Error("This lab does not report to this head orchestrator.");
      const child = resolveHarnessProject(snapshot.delegation.harness, project, snapshot.revision);
      const text = await runSession(child, project.name, params.task, ctx, signal);
      return {content: [{type: "text", text}], details: {projectId: project.id, agentName: project.name}};
    },
  };
  const view = createHarnessViewTool(snapshot, harnessStore);
  return snapshot.delegation?.projects.length ? [delegate, workflow, lab, view] : [delegate, workflow, view];
}
