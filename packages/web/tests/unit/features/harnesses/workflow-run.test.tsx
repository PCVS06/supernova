import type {ReactNode} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {beforeEach, describe, expect, it, vi} from "vitest";
import type {HarnessConfig, HarnessLibrary, WorkflowRun} from "@supernova/contracts/harnesses/schemas";
import type {Tool} from "@supernova/contracts/sessions/schemas";
import WorkflowRunPage from "@/features/harnesses/pages/workflow-run-page";
import ToolTitle from "@/features/sessions/components/timeline/items/assistant/tools/tool-title";

const state = vi.hoisted(() => ({run: undefined as WorkflowRun | undefined, library: undefined as HarnessLibrary | undefined}));
vi.mock("@/features/harnesses/hooks/api/use-workflow-runs", () => ({useWorkflowRun: () => ({data: state.run})}));
vi.mock("@/features/harnesses/hooks/api/use-harnesses", () => ({useHarnessLibrary: () => ({data: state.library})}));
vi.mock("@/features/harnesses/stores/harness-navigation-store", () => ({
  useHarnessNavigationStore: () => ({activeHarnessId: "science", activeProjectId: "lab"}),
}));
vi.mock("@tanstack/react-router", () => ({
  Link: ({children, to, params}: {children: ReactNode; to: string; params?: Record<string, string>}) => (
    <a href={Object.entries(params ?? {}).reduce((path, [key, value]) => path.replace(`$${key}`, value), to)}>{children}</a>
  ),
}));

const harness: HarnessConfig = {
  id: "science",
  name: "Science Pi",
  description: "Research",
  systemPrompt: "Shared rules",
  agents: [
    {name: "literature-scout", description: "Finds candidate sources", systemPrompt: "Scout", tools: ["read"]},
    {name: "source-verifier", description: "Checks claims", systemPrompt: "Verify", tools: ["read"]},
  ],
  extensions: [],
  skills: [],
  context: {instructions: "", files: [], includeProjectInstructions: true, autoCompaction: true, reserveTokens: 1000, keepRecentTokens: 1000},
  graph: {steps: ["legacy-agent"]},
  workflows: [
    {
      id: "review",
      name: "Evidence review",
      description: "Collect sources, then verify them",
      steps: [
        {
          id: "scout",
          agent: "literature-scout",
          instructions: "Collect candidate sources.",
          reads: [],
          output: {fields: [{name: "sources", type: "string[]", required: true}]},
          effects: "none",
        },
        {
          id: "verify",
          agent: "source-verifier",
          instructions: "Verify every source.",
          reads: ["scout"],
          output: {fields: [{name: "verdict", type: "string", required: true}]},
          effects: "external",
        },
      ],
      limits: {maxWallClockSeconds: 1800},
    },
    {
      id: "triage",
      name: "Triage",
      description: "One pass",
      steps: [
        {
          id: "scout",
          agent: "literature-scout",
          instructions: "Skim only.",
          reads: [],
          output: {fields: [{name: "summary", type: "string", required: true}]},
          effects: "none",
        },
      ],
      limits: {maxWallClockSeconds: 600},
    },
  ],
  loop: {maxTurns: 10, timeoutSeconds: 60},
};
const run: WorkflowRun = {
  id: "wf-1",
  chatId: "chat",
  harnessId: "science",
  projectId: "lab",
  workflowId: "review",
  workflowName: "Evidence review",
  workflowRevision: 7,
  task: "Check the claims in the draft",
  status: "failed",
  cursor: 1,
  stepCount: 2,
  spentUsd: 0.42,
  startedAt: "2026-09-11T10:00:00Z",
  updatedAt: "2026-09-11T10:05:00Z",
  workflow: harness.workflows![0]!,
  steps: [
    {
      stepId: "scout",
      agent: "literature-scout",
      actionId: "action-scout-1",
      attempt: 1,
      status: "completed",
      runId: "worker-1",
      input: {task: "Check the claims in the draft"},
      output: {sources: ["doi:10.0000/example"]},
      usage: {inputTokens: 1200, outputTokens: 300, costUsd: 0.2},
    },
    {
      stepId: "verify",
      agent: "source-verifier",
      actionId: "action-verify-1",
      attempt: 2,
      status: "failed",
      runId: "worker-2",
      input: {sources: ["doi:10.0000/example"]},
      rawOutput: "Looks fine to me",
      error: "Output did not match the contract.",
      failureKind: "malformed_output",
    },
  ],
};

describe("workflow run inspection", () => {
  beforeEach(() => {
    state.run = run;
    state.library = {revision: 7, harnesses: [harness], projects: []};
  });
  it("shows what each step actually did, with its receipt and failure kind", () => {
    const html = renderToStaticMarkup(<WorkflowRunPage sessionId="chat" runId="wf-1" />);
    expect(html).toContain("Evidence review");
    expect(html).toContain("failed · 1 of 2 complete · $0.42 spent");
    expect(html).toContain("Check the claims in the draft");
    expect(html).toContain("completed · attempt 1 · none effects");
    expect(html).toContain("failed · attempt 2 · external effects");
    expect(html).toContain("action-verify-1");
    expect(html).toContain("doi:10.0000/example");
    expect(html).toContain("Unvalidated output as returned");
    expect(html).toContain("Looks fine to me");
    expect(html).toContain("malformed output · Output did not match the contract.");
    expect(html).toContain('href="/session/chat/run/worker-1"');
  });
  it("gives the exact resume instruction, allowing an external rerun only when the blocked step has external effects", () => {
    const external = renderToStaticMarkup(<WorkflowRunPage sessionId="chat" runId="wf-1" />);
    expect(external).toContain("Run harness_workflow with resumeRunId wf-1 and allowExternalRetry true");
    expect(external).toContain("continues unfinished branches and keeps the same run");
    expect(external).toContain("Completed steps are not run again");
    state.run = {...run, cursor: 0, steps: [{...run.steps[0]!, status: "failed", output: undefined, error: "The provider refused.", failureKind: "provider"}]};
    const contained = renderToStaticMarkup(<WorkflowRunPage sessionId="chat" runId="wf-1" />);
    expect(contained).toContain("Run harness_workflow with resumeRunId wf-1");
    expect(contained).toContain("continues unfinished branches");
    expect(contained).not.toContain("allowExternalRetry");
  });
  it("does not offer a resume while the run is still going", () => {
    state.run = {...run, status: "running"};
    expect(renderToStaticMarkup(<WorkflowRunPage sessionId="chat" runId="wf-1" />)).not.toContain("Resume this run");
  });
});

describe("workflow tool title", () => {
  beforeEach(() => {
    state.library = {revision: 7, harnesses: [harness], projects: []};
  });
  const render = (tool: Tool) => renderToStaticMarkup(<ToolTitle event={{id: "event", timestamp: "2026-09-11T10:00:00Z", type: "tool", tool}} />);
  it("names the agents of the workflow the tool call addressed", () => {
    const html = render({kind: "custom", name: "harness_workflow", status: "pending", input: {workflowId: "triage", task: "Skim"}});
    expect(html).toContain("Literature scout");
    expect(html).not.toContain("Source verifier");
    expect(html).not.toContain("Legacy agent");
  });
  it("falls back to the first workflow when the call names none", () => {
    const html = render({kind: "custom", name: "harness_workflow", status: "pending", input: {task: "Check"}});
    expect(html).toContain("Literature scout");
    expect(html).toContain("Source verifier");
  });
  it("falls back to the legacy handoff list for a harness saved before workflows", () => {
    state.library = {revision: 7, harnesses: [{...harness, workflows: undefined}], projects: []};
    expect(render({kind: "custom", name: "harness_workflow", status: "pending", input: {task: "Check"}})).toContain("Legacy agent");
  });
});
