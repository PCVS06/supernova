import {Schema} from "effect";
import {ModelReference} from "@supernova/contracts/sessions/schemas";
import {HarnessWorkflow} from "@supernova/contracts/harnesses/schemas/workflow";

export const HarnessExecution = Schema.Struct({model: Schema.optional(ModelReference), effort: Schema.optional(Schema.String)});

export const HarnessAgent = Schema.Struct({
  name: Schema.String,
  description: Schema.String,
  systemPrompt: Schema.String,
  tools: Schema.Array(Schema.String),
  execution: Schema.optional(HarnessExecution),
  skillNames: Schema.optional(Schema.Array(Schema.String)),
  color: Schema.optional(Schema.String),
});

export const HarnessConfig = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  description: Schema.String,
  systemPrompt: Schema.String,
  orchestratorPrompt: Schema.optional(Schema.String),
  execution: Schema.optional(HarnessExecution),
  coordinatorProjectId: Schema.optional(Schema.String),
  enabledSkills: Schema.optional(Schema.Array(Schema.String)),
  agents: Schema.Array(HarnessAgent),
  extensions: Schema.Array(Schema.String),
  skills: Schema.Array(Schema.String),
  context: Schema.Struct({
    instructions: Schema.String,
    files: Schema.Array(Schema.String),
    includeProjectInstructions: Schema.Boolean,
    autoCompaction: Schema.Boolean,
    reserveTokens: Schema.Number,
    keepRecentTokens: Schema.Number,
  }),
  /** Legacy handoff list. Mirrors the first workflow's agent order; the runtime executes `workflows`. */
  graph: Schema.Struct({steps: Schema.Array(Schema.String)}),
  /** Named sequential workflows with typed handoffs. Absent in libraries saved before workflows existed. */
  workflows: Schema.optional(Schema.Array(HarnessWorkflow)),
  loop: Schema.Struct({maxTurns: Schema.Number, timeoutSeconds: Schema.Number}),
  source: Schema.optional(Schema.Struct({packagePath: Schema.String, rootPath: Schema.String})),
});

export const HarnessProject = Schema.Struct({
  id: Schema.String,
  harnessId: Schema.String,
  name: Schema.String,
  path: Schema.String,
  systemPrompt: Schema.String,
  contextInstructions: Schema.String,
  agents: Schema.Array(HarnessAgent),
  parentProjectId: Schema.optional(Schema.String),
  orchestratorPrompt: Schema.optional(Schema.String),
  execution: Schema.optional(HarnessExecution),
  enabledSkills: Schema.optional(Schema.Array(Schema.String)),
  color: Schema.optional(Schema.String),
  order: Schema.optional(Schema.Number),
  /** Project-relative Markdown files that extend the project instructions: plans, goals, roadmaps agents must see. */
  planningDocuments: Schema.optional(Schema.Array(Schema.String)),
  /** Computed when the library is read: the project folder no longer exists on disk, so chats cannot start. Never persisted. */
  folderMissing: Schema.optional(Schema.Boolean),
});

export const HarnessLibrary = Schema.Struct({
  revision: Schema.Number,
  harnesses: Schema.Array(HarnessConfig),
  projects: Schema.Array(HarnessProject),
});

export const HarnessSnapshot = Schema.Struct({
  revision: Schema.Number,
  sharedInstructions: Schema.optional(Schema.String),
  harness: HarnessConfig,
  project: HarnessProject,
  delegation: Schema.optional(Schema.Struct({harness: HarnessConfig, projects: Schema.Array(HarnessProject)})),
});

/** The three user-owned instruction layers, kept distinct from Pi's engine prompt. */
export const HarnessPromptLayer = Schema.Struct({
  kind: Schema.Literals(["shared", "project", "role", "context"]),
  label: Schema.String,
  owner: Schema.String,
  content: Schema.String,
});
export const HarnessRunStatus = Schema.Literals(["starting", "running", "completed", "failed", "cancelled", "interrupted"]);
export const HarnessRunSummary = Schema.Struct({
  id: Schema.String,
  chatId: Schema.String,
  parentRunId: Schema.optional(Schema.String),
  harnessId: Schema.String,
  projectId: Schema.String,
  projectName: Schema.String,
  agentName: Schema.String,
  role: Schema.Literals(["lab-orchestrator", "specialist"]),
  color: Schema.optional(Schema.String),
  status: HarnessRunStatus,
  task: Schema.String,
  startedAt: Schema.String,
  updatedAt: Schema.String,
  finishedAt: Schema.optional(Schema.String),
  activity: Schema.optional(Schema.String),
  model: Schema.optional(ModelReference),
});
export const HarnessRuntimeContext = Schema.Struct({
  capturedAt: Schema.String,
  systemPrompt: Schema.String,
  tools: Schema.Array(Schema.String),
  skills: Schema.Array(Schema.String),
  contextFiles: Schema.Array(Schema.String),
  model: Schema.optional(ModelReference),
});
export const HarnessRun = Schema.Struct({
  ...HarnessRunSummary.fields,
  projectPath: Schema.String,
  revision: Schema.Number,
  instructions: Schema.Array(HarnessPromptLayer),
  runtime: Schema.optional(HarnessRuntimeContext),
  output: Schema.String,
  error: Schema.optional(Schema.String),
  events: Schema.Array(Schema.Struct({at: Schema.String, message: Schema.String})),
});
export const ChatHarnessContext = Schema.Struct({
  captured: Schema.Boolean,
  snapshot: Schema.optional(HarnessSnapshot),
  instructions: Schema.Array(HarnessPromptLayer),
  runtime: Schema.optional(HarnessRuntimeContext),
});

export type HarnessExecution = typeof HarnessExecution.Type;
export type HarnessAgent = typeof HarnessAgent.Type;
export type HarnessConfig = typeof HarnessConfig.Type;
export type HarnessProject = typeof HarnessProject.Type;
export type HarnessLibrary = typeof HarnessLibrary.Type;
export type HarnessSnapshot = typeof HarnessSnapshot.Type;
export type HarnessPromptLayer = typeof HarnessPromptLayer.Type;
export type HarnessRunSummary = typeof HarnessRunSummary.Type;
export type HarnessRun = typeof HarnessRun.Type;
export type HarnessRuntimeContext = typeof HarnessRuntimeContext.Type;
export type ChatHarnessContext = typeof ChatHarnessContext.Type;
