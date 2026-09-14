import {describe, expect, it} from "vitest";
import type {HarnessConfig, HarnessLibrary, HarnessProject, HarnessRunSummary, WorkflowRunSummary} from "@supernova/contracts/harnesses/schemas";
import type {WorkspaceOverviewResult} from "@supernova/contracts/harnesses/procedures";
import {buildWorkspaceModel, workspaceActivity} from "@/features/workspace/lib/build-workspace-model";
const harness: HarnessConfig = {
  id: "science",
  name: "Science",
  description: "Research",
  systemPrompt: "",
  coordinatorProjectId: "lead",
  agents: [{name: "unused-agent", description: "", systemPrompt: "", tools: []}],
  extensions: [],
  skills: [],
  context: {instructions: "", files: [], includeProjectInstructions: true, autoCompaction: true, reserveTokens: 1000, keepRecentTokens: 2000},
  graph: {steps: []},
  loop: {maxTurns: 10, timeoutSeconds: 120},
  curator: {enabled: false, maxCostUsdPerRun: 1, maxCostUsdPerDay: 2, autoApply: {memory: false, planningLog: false}},
};
const project: HarnessProject = {id: "lead", harnessId: "science", name: "Science Space", path: "/science", systemPrompt: "", contextInstructions: "", agents: []};
const library: HarnessLibrary = {revision: 1, harnesses: [harness], projects: [project, {...project, id: "research", name: "Research", path: "/science/research"}]};
const run: HarnessRunSummary = {
  id: "lead-run",
  chatId: "chat",
  harnessId: "science",
  projectId: "research",
  projectName: "Research",
  agentName: "Research lead",
  role: "lab-orchestrator",
  status: "running",
  task: "Evaluate sources",
  startedAt: "2026-09-13T08:00:00Z",
  updatedAt: "2026-09-13T08:01:00Z",
};

const overview: WorkspaceOverviewResult = {
  revision: 1,
  capturedAt: "2026-09-13T08:01:00Z",
  projects: [{projectId: "lead", projectPath: "/science", total: 1, sessions: [{id: "chat", title: "Compare costs", updatedAt: "2026-09-13T08:01:00Z"}]}],
  runs: [],
  workflows: [],
  controls: [],
  curators: [],
  errors: [],
  activityTotals: [],
};
describe("shared workspace ownership", () => {
  it("resolves a removed destination through the owning chat and includes unconfigured projects", () => {
    const model = buildWorkspaceModel({
      library,
      overview: {
        ...overview,
        projects: [...overview.projects, {projectId: "outside", projectPath: "/outside", total: 1, sessions: [{id: "outside-chat", title: "Outside", updatedAt: run.updatedAt}]}],
        runs: [
          {...run, projectId: "removed"},
          {...run, id: "outside-run", projectId: "outside", chatId: "outside-chat"},
        ],
      },
    });
    expect(model.items.find((item) => item.id === "run:lead-run")).toMatchObject({projectId: "lead"});
    expect(model.items.find((item) => item.id === "run:outside-run")).toMatchObject({projectId: "outside"});
    expect(model.links).toContainEqual({from: "project:outside", to: "session:outside-chat", kind: "contains", label: "Project conversation"});
  });
  it("counts distinct consumers within each workflow and keeps ordering separate from output reads", () => {
    const workflow: WorkflowRunSummary = {
      id: "review",
      chatId: "chat",
      projectId: "removed",
      harnessId: "science",
      workflowId: "review",
      workflowName: "Review",
      workflowRevision: 1,
      task: "Review",
      status: "completed",
      cursor: 3,
      stepCount: 3,
      spentUsd: 0,
      startedAt: run.startedAt,
      updatedAt: run.updatedAt,
      stepStates: [
        {stepId: "source", agent: "researcher", reads: [], dependsOn: [], status: "completed", attempt: 1},
        {stepId: "reviewer", agent: "verifier", reads: ["source", "source"], dependsOn: ["source"], status: "completed", attempt: 1},
        {stepId: "publisher", agent: "editor", reads: [], dependsOn: ["source"], status: "completed", attempt: 1},
      ],
    };
    const model = buildWorkspaceModel({library, overview: {...overview, workflows: [workflow, {...workflow, id: "independent", stepStates: [workflow.stepStates![0]!]}]}});
    expect(model.items.find((item) => item.id === "result:review:source")).toMatchObject({detail: "Validated output · 1 consumers", projectId: "lead"});
    expect(model.items.find((item) => item.id === "result:independent:source")).toMatchObject({detail: "Validated output · 0 consumers"});
    expect(model.links.filter((link) => link.from === "step:review:source" && link.to === "step:review:reviewer")).toEqual([
      {from: "step:review:source", to: "step:review:reviewer", kind: "output", label: "Shares validated output"},
    ]);
    expect(model.links).toContainEqual({from: "step:review:source", to: "step:review:publisher", kind: "depends", label: "Waits for completion"});
  });
  it("does not count a workflow and its active steps twice", () => {
    const owner = {label: "Review", detail: "", status: "running", sessionId: "chat", runId: "w", active: true};
    expect(
      workspaceActivity(
        [
          {...owner, id: "workflow", kind: "workflow"},
          {...owner, id: "a", kind: "step"},
          {...owner, id: "b", kind: "step"},
          {...owner, id: "output", kind: "result"},
        ],
        "chat"
      )
    ).toEqual({working: 2, attention: 0});
  });
  it("uses configured identities without inventing agent runs", () => {
    const model = buildWorkspaceModel({library, overview});
    expect(model.items.find((item) => item.id === "project:lead")?.role).toBe("orchestrator");
    expect(model.items.find((item) => item.id === "project:research")?.role).toBe("project");
    expect(model.items.find((item) => item.kind === "curator")).toMatchObject({status: "Off", role: "curator"});
    expect(model.items.filter((item) => item.kind === "agent")).toEqual([]);
  });
  it("shows actual nested delegation and cross-project work without duplicating the task", () => {
    const child: HarnessRunSummary = {...run, id: "child", parentRunId: run.id, agentName: "Verifier", role: "specialist"};
    const model = buildWorkspaceModel({library, overview: {...overview, runs: [child, run]}});
    expect(model.links).toEqual(
      expect.arrayContaining([
        expect.objectContaining({from: "session:chat", to: "run:lead-run", kind: "delegates"}),
        expect.objectContaining({from: "run:lead-run", to: "run:child", kind: "delegates"}),
        expect.objectContaining({from: "run:lead-run", to: "project:research", kind: "works-in"}),
      ])
    );
    expect(model.items.find((item) => item.id === "run:child")?.role).toBe("specialist");
    expect(model.items.filter((item) => item.detail === child.task)).toHaveLength(2);
    expect(model.links.some((link) => link.from === "session:chat" && link.to === "run:child")).toBe(false);
  });
  it.each(["missing", "child"])("does not invent a delegation when the parent is %s", (parentRunId) => {
    const model = buildWorkspaceModel({library, overview: {...overview, runs: [{...run, id: "child", parentRunId}]}});
    expect(model.items.some((item) => item.id === "run:child")).toBe(true);
    expect(model.links.filter((link) => link.kind === "delegates")).toEqual([]);
  });
  it.each(["completed", "cancelled", "failed", "interrupted"] as const)("keeps %s work addressable without activity", (status) => {
    const model = buildWorkspaceModel({library, overview: {...overview, runs: [{...run, status}]}});
    expect(model.items.find((item) => item.id === "run:lead-run")).toMatchObject({status, active: false});
  });
  it("marks a result read only at its explicitly saved revision", () => {
    const snapshot = {...overview, runs: [{...run, status: "completed" as const}]};
    expect(buildWorkspaceModel({library, overview: snapshot}).items.find((item) => item.id === "run:lead-run")?.unread).toBe(true);
    expect(buildWorkspaceModel({library, overview: snapshot, readAt: {"run:lead-run": run.updatedAt}}).items.find((item) => item.id === "run:lead-run")?.unread).toBe(false);
  });
});
