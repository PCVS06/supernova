import "@/environment";
import {existsSync, mkdirSync, writeFileSync, appendFileSync} from "node:fs";
import {setTimeout} from "node:timers/promises";
import type {Context} from "@earendil-works/pi-ai";
import {fauxAssistantMessage, registerFauxProvider} from "@earendil-works/pi-ai/compat";
import type {FauxResponseFactory} from "@earendil-works/pi-ai/providers/faux";
import {harnessStore} from "@supernova/agent-runtime/layers/harnesses/internal/harness-store";
import {startServer} from "@/server";

const E2E_PROVIDER_ID = "supernova-e2e";
const E2E_MODEL_ID = "supernova-e2e-model";
const TITLE_PROMPT_PREFIX = "Generate a concise title for this coding session";
const heldPrompts = new Map([
  ["Duplicate regression message", "duplicate-message"],
  ["Abort recovery message", "abort-recovery"],
  ["Reload during streaming message", "reload-streaming"],
  ["Concurrent session A message", "concurrent-session-a"],
  ["Queue acceptance message", "queue-acceptance"],
  ["Steering acceptance message", "steering-acceptance"],
  ["Hold delegated steering worker", "delegated-steering-worker"],
  ["Continue the active goal: Validate the workspace controls", "goal-acceptance"],
]);

function messageText(context: Context): string {
  const content = context.messages.findLast((message) => message.role === "user")?.content;
  if (typeof content === "string") return content;
  return content?.flatMap((part) => (part.type === "text" ? [part.text] : [])).join("") ?? "";
}

/** Holds selected provider calls until Playwright releases or aborts them. */
async function waitForRelease(controlDir: string, controlId: string, signal: AbortSignal | undefined): Promise<void> {
  writeFileSync(`${controlDir}/started-${controlId}`, "");
  while (!existsSync(`${controlDir}/release-${controlId}`)) {
    await setTimeout(10, undefined, {signal});
  }
}

const e2eRoot = process.env.SUPERNOVA_E2E_ROOT;
if (!e2eRoot) throw new Error("SUPERNOVA_E2E_ROOT is required.");

const controlDir = `${e2eRoot}/control`;
const agentDir = process.env.PI_CODING_AGENT_DIR;
if (!agentDir) throw new Error("PI_CODING_AGENT_DIR was not configured.");
mkdirSync(controlDir, {recursive: true});
mkdirSync(agentDir, {recursive: true});

const faux = registerFauxProvider({
  api: "faux:supernova-e2e",
  models: [{id: E2E_MODEL_ID, name: "Supernova E2E Model", reasoning: false}],
  provider: E2E_PROVIDER_ID,
  tokenSize: {max: 8, min: 4},
  tokensPerSecond: 1_000,
});

const response: FauxResponseFactory = async (context, options) => {
  faux.appendResponses([response]);
  const prompt = messageText(context);
  if (context.systemPrompt?.startsWith(TITLE_PROMPT_PREFIX)) return fauxAssistantMessage(prompt);

  if (prompt === "Provider failure message") {
    return fauxAssistantMessage("", {errorMessage: "Synthetic provider failure.", stopReason: "error"});
  }

  if (prompt === "Orchestrate steering acceptance") {
    const delegated = context.messages.find((message) => message.role === "toolResult" && message.toolName === "subagent");
    const receipt = delegated?.role === "toolResult" ? delegated.content.flatMap((part) => (part.type === "text" ? [part.text] : [])).join("") : "";
    const runId = receipt.match(/Run IDs: ([a-f0-9]{32})/)?.[1];
    if (delegated && !runId) throw new Error(`Delegation did not return a run ID: ${receipt}`);
    if (runId) writeFileSync(`${controlDir}/waiting-delegation-steering`, "");
    return fauxAssistantMessage(
      {
        type: "toolCall",
        id: runId ? "join-steering-worker" : "start-steering-worker",
        name: "subagent",
        arguments: runId ? {action: "wait", runIds: [runId]} : {agent: "workflow-reviewer", task: "Hold delegated steering worker", background: true},
      },
      {stopReason: "toolUse"}
    );
  }

  if (prompt === "Run parallel acceptance workflow") {
    const lastUser = context.messages.findLastIndex((message) => message.role === "user");
    if (context.messages.slice(lastUser + 1).some((message) => message.role === "toolResult" && message.toolName === "harness_workflow"))
      return fauxAssistantMessage("Parallel workflow completed.");
    return fauxAssistantMessage(
      {
        type: "toolCall",
        id: `parallel-acceptance-${context.messages.filter((message) => message.role === "user").length}`,
        name: "harness_workflow",
        arguments: {workflowId: "parallel-acceptance", task: "Compare the evidence once"},
      },
      {stopReason: "toolUse"}
    );
  }
  const workflowStep = prompt.match(/^Workflow Parallel acceptance, step \d+ of \d+ \(([^)]+)\)/)?.[1];
  if (workflowStep) {
    appendFileSync(`${controlDir}/workflow-steps.jsonl`, `${JSON.stringify({step: workflowStep, at: Date.now()})}\n`);
    if (workflowStep === "technical" || workflowStep === "economic") await waitForRelease(controlDir, `workflow-${workflowStep}`, options?.signal);
    return fauxAssistantMessage(JSON.stringify({result: `${workflowStep} validated result`}));
  }

  const controlId = heldPrompts.get(prompt.split("\n\n")[0] ?? prompt);
  if (controlId) await waitForRelease(controlDir, controlId, options?.signal);
  return fauxAssistantMessage(`Runtime response: ${prompt}`);
};
faux.setResponses([response]);

writeFileSync(
  `${agentDir}/models.json`,
  `${JSON.stringify(
    {
      providers: {
        [E2E_PROVIDER_ID]: {
          api: faux.api,
          apiKey: "e2e-key",
          baseUrl: "https://faux.local",
          models: [{id: E2E_MODEL_ID, name: "Supernova E2E Model", contextWindow: 200_000, maxTokens: 8_192}],
        },
      },
    },
    null,
    2
  )}\n`
);

const library = await harnessStore.list();
const coding = library.harnesses.find((harness) => harness.id === "coding")!;
await harnessStore.save(
  {
    ...coding,
    agents: [{name: "workflow-reviewer", description: "Reviews a bounded input", systemPrompt: "Return the required JSON result.", tools: ["read"]}],
    workflows: [
      {
        id: "parallel-acceptance",
        name: "Parallel acceptance",
        description: "One shared source, two parallel reviews, one join",
        maxParallel: 3,
        limits: {maxWallClockSeconds: 120},
        steps: ["source", "technical", "economic", "join"].map((id) => ({
          id,
          agent: "workflow-reviewer",
          instructions: id,
          reads: id === "source" ? [] : id === "join" ? ["technical", "economic"] : ["source"],
          effects: "none",
          output: {fields: [{name: "result", type: "string", required: true}]},
        })),
      },
    ],
  },
  library.revision
);

const server = await startServer({host: "127.0.0.1", port: Number(process.env.SUPERNOVA_SERVER_PORT ?? 4318)});
console.log(`Supernova runtime E2E server listening at ${server.url}`);

const close = async (): Promise<void> => {
  faux.unregister();
  await server.close();
  process.exit(0);
};
process.once("SIGINT", () => void close());
process.once("SIGTERM", () => void close());
