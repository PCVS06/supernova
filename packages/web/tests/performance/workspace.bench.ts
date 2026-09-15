import {createHash} from "node:crypto";
import type {HarnessLibrary} from "@supernova/contracts/harnesses/schemas";
import type {WorkspaceOverviewResult} from "@supernova/contracts/harnesses/procedures";
import {workflowLayers} from "@supernova/contracts/harnesses/workflow-graph";
import {buildWorkspaceModel} from "@/features/workspace/lib/build-workspace-model";

/** Exercises configured and unmanaged destinations, large chat histories and output handoffs. */
function workspaceFixture(size: number): {library: HarnessLibrary; overview: WorkspaceOverviewResult} {
  const at = "2026-09-13T19:00:00Z";
  const projects = Array.from({length: Math.min(200, size)}, (_, i) => ({
    id: `p${i}`,
    harnessId: "h",
    name: `Project ${i}`,
    path: `/project/${i}`,
    systemPrompt: "",
    contextInstructions: "",
    agents: [],
  }));
  const library: HarnessLibrary = {
    revision: 1,
    projects,
    harnesses: [
      {
        id: "h",
        name: "Harness",
        description: "",
        coordinatorProjectId: "p0",
        systemPrompt: "",
        agents: [],
        skills: [],
        extensions: [],
        context: {instructions: "", files: [], includeProjectInstructions: true, autoCompaction: true, reserveTokens: 1000, keepRecentTokens: 2000},
        graph: {steps: []},
        loop: {maxTurns: 10, timeoutSeconds: 120},
      },
    ],
  };
  const overview: WorkspaceOverviewResult = {
    revision: 1,
    capturedAt: at,
    errors: [],
    activityTotals: [],
    curators: [],
    controls: [],
    projects: projects.map((project) => ({
      projectId: project.id,
      projectPath: project.path,
      total: 50,
      sessions: Array.from({length: 50}, (_, i) => ({id: `${project.id}:s${i}`, title: `Chat ${i}`, updatedAt: at})),
    })),
    runs: Array.from({length: size}, (_, i) => ({
      id: `r${i}`,
      chatId: `p${i % projects.length}:s0`,
      projectId: i % 2 ? `p${i % projects.length}` : "removed",
      harnessId: "h",
      projectName: "Project",
      agentName: "Verifier",
      role: "specialist",
      status: "completed",
      task: "Inspect",
      startedAt: at,
      updatedAt: at,
    })),
    workflows: [
      {
        id: "w",
        chatId: "p0:s0",
        projectId: "removed",
        harnessId: "h",
        workflowId: "research",
        workflowRevision: 1,
        workflowName: "Research",
        task: "Review",
        status: "completed",
        cursor: size,
        stepCount: size,
        spentUsd: 0,
        startedAt: at,
        updatedAt: at,
        stepStates: Array.from({length: size}, (_, i) => ({
          stepId: `step${i}`,
          agent: "Verifier",
          status: "completed",
          reads: i ? [`step${i - 1}`] : [],
          dependsOn: [],
          attempt: 1,
        })),
      },
    ],
  };
  return {library, overview};
}

/** Warms each path and reports its median independently of render, I/O or agent-provider time. */
function measure(run: () => unknown) {
  const output = JSON.stringify(run());
  for (let i = 0; i < 4; i++) run();
  const samples = Array.from({length: 15}, () => {
    const start = performance.now();
    run();
    return performance.now() - start;
  }).sort((a, b) => a - b);
  return {medianMs: samples[7], p95Ms: samples[14], sha256: createHash("sha256").update(output).digest("hex")};
}

const results = [100, 1000, 5000].map((size) => {
  const input = workspaceFixture(size);
  const chain = Array.from({length: size}, (_, i) => ({id: `s${i}`, reads: i ? [`s${i - 1}`] : []})).reverse();
  return {
    agents: size,
    steps: size,
    projects: input.library.projects.length,
    chats: input.library.projects.length * 50,
    workspace: measure(() => buildWorkspaceModel(input)),
    layers: measure(() => workflowLayers(chain)),
  };
});
console.log(JSON.stringify(results, null, 2));
