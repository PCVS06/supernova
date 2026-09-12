import type {SendMessagePayload} from "@supernova/contracts/session-runtime/procedures";
import type {SessionGoal} from "@supernova/contracts/session-runtime/schemas";
import {randomUUID} from "node:crypto";
import type {PiModel} from "@supernova/agent-runtime/layers/shared/internal/pi-model-catalog";
import {prepareSendMessageContext} from "@supernova/agent-runtime/layers/session-runtime/lib/user-message/send-message-context";
import {PiSessionRuntime} from "@supernova/agent-runtime/layers/session-runtime/internal/pi-session-runtime";
import type {PiSessionTitleGeneratorShape} from "@supernova/agent-runtime/layers/session-runtime/internal/pi-session-title-generator";

type GenerateSessionTitleOptions = {
  readonly input: SendMessagePayload;
  readonly model: PiModel;
  readonly titleGenerator: PiSessionTitleGeneratorShape;
};

async function generateSessionTitle(options: GenerateSessionTitleOptions): Promise<string | undefined> {
  const title = await options.titleGenerator.generateSessionTitle({contentParts: options.input.contentParts, model: options.model}).catch(() => undefined);
  return title?.trim() || undefined;
}

/** Accepts a user message and starts provider work on the long-lived session runtime. */
export async function sendMessage(
  runtime: PiSessionRuntime,
  titleGenerator: PiSessionTitleGeneratorShape,
  input: SendMessagePayload,
  controls?: {
    readonly goal?: SessionGoal;
    readonly bounded?: boolean;
    readonly onSettled: (error: string | undefined) => Promise<void>;
  }
): Promise<void> {
  runtime.beginWork(controls?.bounded);

  try {
    const sessionManager = await runtime.getSessionManager();
    const selectedModel = input.modelReference;
    const model = runtime.resolveModel(selectedModel);

    const titlePending =
      sessionManager.getSessionName() === undefined && !sessionManager.buildSessionContext().messages.some((message) => message.role === "user")
        ? generateSessionTitle({input, model, titleGenerator})
        : undefined;
    const messageContext = await prepareSendMessageContext(input, {
      projectPath: sessionManager.getCwd(),
      resourceCatalog: runtime.resourceCatalog,
    });

    const captureCheckpoints = input.captureCheckpoints ?? true;
    const checkpointId = randomUUID();
    const checkpointStatus = await runtime.createCheckpoint(checkpointId, captureCheckpoints);
    await runtime.selectModel(selectedModel);

    const goal = controls?.goal;
    await runtime.setGoalReporting(!!goal);
    const context = goal
      ? {
          ...messageContext,
          prompt: `${messageContext.prompt}\n\nActive chat goal (${goal.id}), turn ${goal.turnsUsed + 1}/${goal.maxTurns}:\n${goal.objective}\nMake bounded progress within the user's permissions. Use report_goal_result with this goalId and completed or blocked plus a factual summary when finished or when user input/permission is needed. Completion is your report, not independent verification. Do not broaden authority or repeat failed external actions.`,
        }
      : messageContext;
    const {completion} = runtime.startTurn({beforeCheckpoint: {checkpointId, status: checkpointStatus}, captureCheckpoints, messageContext: context, title: undefined});
    void titlePending
      ?.then((title) => {
        if (title) return runtime.applyGeneratedTitle(title);
      })
      .catch(() => undefined);

    let failure: string | undefined;
    void completion
      .catch(async (cause) => {
        failure = cause instanceof Error ? cause.message : "Failed to send message.";
        if (!runtime.isCancelled()) {
          await runtime.publishEvent({
            type: "session.error",
            sessionId: runtime.sessionId,
            error: cause instanceof Error ? cause.message : "Failed to send message.",
          });
        }
      })
      .finally(async () => {
        runtime.endWork();
        await controls?.onSettled(failure ?? runtime.getTurnFailure());
      })
      .catch(async (cause) => {
        await runtime.publishEvent({type: "session.error", sessionId: runtime.sessionId, error: cause instanceof Error ? cause.message : "Could not settle chat controls."});
      });
  } catch (cause) {
    runtime.endWork();
    throw cause;
  }
}
