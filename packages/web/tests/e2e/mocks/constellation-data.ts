import type {HarnessLibrary, HarnessProject, HarnessRun, WorkflowRun} from "@supernova/contracts/harnesses/schemas";
import type {Session} from "@supernova/contracts/sessions/schemas";
import {TIMELINE_PROJECT_NAME, TIMELINE_PROJECT_PATH, TIMELINE_SESSION_ID, timelineModel} from "@e2e/mocks/timeline-data";

const project: HarnessProject = {
  id: "science-space",
  harnessId: "science",
  name: TIMELINE_PROJECT_NAME,
  path: TIMELINE_PROJECT_PATH,
  systemPrompt: "",
  contextInstructions: "",
  agents: [],
};

export const constellationLibrary: HarnessLibrary = {
  revision: 1,
  harnesses: [
    {
      id: "science",
      name: "Science",
      description: "Connected scientific work",
      systemPrompt: "",
      coordinatorProjectId: project.id,
      context: {instructions: "", files: [], includeProjectInstructions: true, autoCompaction: true, reserveTokens: 1000, keepRecentTokens: 4000},
      agents: [],
      extensions: [],
      skills: [],
      graph: {steps: []},
      loop: {maxTurns: 12, timeoutSeconds: 120},
      curator: {enabled: true, maxCostUsdPerRun: 1, maxCostUsdPerDay: 5, autoApply: {memory: false, planningLog: false}},
    },
  ],
  projects: [
    project,
    {...project, id: "research", name: "Research", path: `${TIMELINE_PROJECT_PATH}/research`},
    {...project, id: "modeling", name: "Cost modeling", path: `${TIMELINE_PROJECT_PATH}/modeling`},
  ],
};

const run: HarnessRun = {
  id: "research-lead",
  chatId: TIMELINE_SESSION_ID,
  harnessId: "science",
  projectId: "research",
  projectName: "Research",
  projectPath: `${TIMELINE_PROJECT_PATH}/research`,
  agentName: "Research lead",
  role: "lab-orchestrator",
  status: "running",
  task: "Compare the deployment-cost evidence.",
  startedAt: "2026-09-13T08:00:00Z",
  updatedAt: "2026-09-13T08:01:00Z",
  revision: 1,
  instructions: [],
  output: "",
  events: [],
  transcript: {
    omittedEntries: 0,
    entries: [
      {
        id: "response",
        at: "2026-09-13T08:00:15Z",
        kind: "assistant",
        text: "I’m comparing hardware, integration and ongoing support costs using the same utilization assumptions.",
        streaming: false,
        truncated: false,
      },
    ],
  },
};

/** Real contract-shaped records used only by the isolated browser client. */
export function constellationRuns(status: "running" | "completed" | "failed"): HarnessRun[] {
  return [
    {...run, status},
    {...run, id: "literature", parentRunId: run.id, agentName: "Literature researcher", role: "specialist", task: "Find comparable cost sources.", status},
    {...run, id: "reviewer", parentRunId: run.id, agentName: "Critical reviewer", role: "specialist", task: "Check utilization and support assumptions.", status},
    {
      ...run,
      id: "nested-verifier",
      parentRunId: "literature",
      agentName: "Source verifier with a deliberately long name",
      role: "specialist",
      task: "Verify a quoted estimate against the original report and record the limits of the comparison.",
      status,
    },
  ];
}

/** Supplies a separate project's conversations so navigation can detect leaked query data. */
export function constellationSessions(): Session[] {
  return Array.from({length: 7}, (_, index) => ({
    id: `research-${index}`,
    title: index === 0 ? "Evidence review" : `Research conversation ${index}`,
    projectPath: `${TIMELINE_PROJECT_PATH}/research`,
    context: {contextWindow: 200000, usedTokens: 1500},
    modelReference: timelineModel,
    turns: [],
    undoneTurns: [],
    updatedAt: "2026-09-13T08:00:00Z",
  }));
}

export const constellationWorkflow: WorkflowRun = {
  id: "evidence-workflow",
  chatId: TIMELINE_SESSION_ID,
  harnessId: "science",
  projectId: "science-space",
  workflowId: "evidence",
  workflowName: "Evidence review",
  workflowRevision: 1,
  invocationId: "research-lead:workflow-call",
  stepStates: [
    {stepId: "collect", agent: "Literature researcher", status: "completed", runId: "literature", reads: [], dependsOn: [], attempt: 1},
    {stepId: "review", agent: "Critical reviewer", status: "running", runId: "reviewer", reads: ["collect"], dependsOn: ["collect"], attempt: 1},
  ],
  task: "Review the cost evidence",
  status: "running",
  cursor: 1,
  stepCount: 2,
  spentUsd: 0.1,
  startedAt: "2026-09-13T08:00:00Z",
  updatedAt: "2026-09-13T08:01:00Z",
  workflow: {
    id: "evidence",
    name: "Evidence review",
    description: "",
    limits: {maxWallClockSeconds: 120},
    steps: [
      {id: "collect", agent: "Literature researcher", instructions: "Find evidence", reads: [], output: {fields: []}, effects: "none"},
      {id: "review", agent: "Critical reviewer", instructions: "Review evidence", reads: ["collect"], output: {fields: []}, effects: "none"},
    ],
  },
  steps: [
    {stepId: "collect", agent: "Literature researcher", actionId: "collect", attempt: 1, status: "completed", input: {}, runId: "literature"},
    {stepId: "review", agent: "Critical reviewer", actionId: "review", attempt: 1, status: "running", input: {}, runId: "reviewer"},
  ],
};
