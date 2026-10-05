import {SettingsManager} from "@earendil-works/pi-coding-agent";
import {realpath} from "node:fs/promises";
import type {AgentSession} from "@earendil-works/pi-coding-agent";
import type {HarnessSnapshot} from "@supernova/contracts/harnesses/schemas";
import {readActiveSessionHarness} from "@supernova/agent-runtime/layers/session-runtime/internal/session-controls-store";
import {compileCollaborationPreset, collaborationReadTools} from "@supernova/agent-runtime/layers/harnesses/lib/collaboration-presets";
import {CollaborationRuntime} from "@supernova/agent-runtime/layers/harnesses/internal/collaboration-runtime";
import {Context, Effect, Layer} from "effect";
import {PiSdkService} from "@supernova/agent-runtime/layers/pi-sdk";
import type {PiSessionManager} from "@supernova/agent-runtime/layers/shared/internal/pi-session-store";
import {createPiCustomTools} from "@supernova/agent-runtime/layers/session-runtime/internal/tools/create-pi-custom-tools";
import {harnessStore} from "@supernova/agent-runtime/layers/harnesses/internal/harness-store";
import {createHarnessResources, createHarnessTools} from "@supernova/agent-runtime/layers/harnesses/internal/harness-runtime";
import {harnessRunStore} from "@supernova/agent-runtime/layers/harnesses/internal/harness-run-store";
import {captureHarnessContext} from "@supernova/agent-runtime/layers/harnesses/internal/harness-run-context";
import {createReportGoalResultTool} from "@supernova/agent-runtime/layers/session-runtime/internal/tools/report-goal-result-tool";

export interface PiAgentSessionFactoryShape {
  readonly createAgentSession: (input: {
    readonly cwd: string;
    readonly sessionManager: PiSessionManager;
    readonly harnessSnapshot?: HarnessSnapshot;
    readonly reportGoalResult?: (goalId: string, status: "completed" | "blocked", summary: string) => Promise<void>;
  }) => Promise<{readonly session: AgentSession}>;
}

/** Private capability for creating Pi agent sessions. */
export class PiAgentSessionFactory extends Context.Service<PiAgentSessionFactory, PiAgentSessionFactoryShape>()("supernova/agent-runtime/PiAgentSessionFactory") {}

export const PiAgentSessionFactoryLive = Layer.effect(
  PiAgentSessionFactory,
  Effect.gen(function* () {
    const piSdk = yield* PiSdkService;

    return {
      createAgentSession: async ({cwd, sessionManager, reportGoalResult, harnessSnapshot}) => {
        const goalTools = reportGoalResult ? [createReportGoalResultTool(reportGoalResult)] : [];
        const harness =
          harnessSnapshot ??
          (await readActiveSessionHarness(sessionManager.getSessionFile(), sessionManager.getSessionId())) ??
          (await harnessStore.forSession(sessionManager.getSessionId(), cwd));
        if (harness) {
          if ((await realpath(harness.project.path)) !== (await realpath(cwd))) throw new Error("The saved harness does not belong to this chat's workspace.");
          const compiled = compileCollaborationPreset(harness);
          const harnessTools = createHarnessTools(compiled, piSdk, {chatId: sessionManager.getSessionId(), store: harnessRunStore});
          const collaboration =
            harness.selection && harness.selection.mode !== "solo"
              ? new CollaborationRuntime(harnessTools.find((tool) => tool.name === "harness_workflow")!, harnessRunStore, sessionManager.getSessionId())
              : undefined;
          const resources = await createHarnessResources(compiled, undefined, undefined, undefined, collaboration ? [collaboration.extension] : []);
          const created = await piSdk.createAgentSession({
            cwd,
            ...resources,
            modelRuntime: piSdk.modelRuntime,
            sessionManager,
            ...(collaboration ? {tools: [...collaborationReadTools, ...goalTools.map((tool) => tool.name)]} : {}),
            customTools: [...createPiCustomTools(), ...goalTools, ...(collaboration ? [] : harnessTools)],
          });
          try {
            await created.session.bindExtensions({});
            collaboration?.bind(created.session);
          } catch (error) {
            created.session.dispose();
            throw error;
          }
          let contextWrites = Promise.resolve();
          created.session.subscribe((event) => {
            if (event.type !== "agent_start") return;
            const context = captureHarnessContext(created.session, resources.resourceLoader);
            contextWrites = contextWrites
              .then(() => harnessRunStore.saveContext(sessionManager.getSessionId(), context))
              .catch((error) => {
                console.warn("Radian could not save the chat's runtime receipt:", error instanceof Error ? error.message : String(error));
              });
          });
          return created;
        }
        const resourceLoader = piSdk.createResourceLoader({projectPath: cwd});
        await resourceLoader.reload();

        const created = await piSdk.createAgentSession({
          cwd,
          customTools: [...createPiCustomTools(), ...goalTools],
          modelRuntime: piSdk.modelRuntime,
          resourceLoader,
          sessionManager,
          settingsManager: SettingsManager.inMemory(),
        });
        created.session.setActiveToolsByName([...new Set([...created.session.getActiveToolNames(), "web_fetch"])]);
        return created;
      },
    };
  })
);
