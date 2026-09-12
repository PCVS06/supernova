import type {ReactNode} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {beforeEach, describe, expect, it, vi} from "vitest";
import type {HarnessRunSummary, WorkflowRunSummary} from "@supernova/contracts/harnesses/schemas";
import ChatRunList from "@/features/harnesses/components/chat-run-list";
import ChatDelegatedWork from "@/features/harnesses/components/chat-delegated-work";
import InstructionReceipt from "@/features/harnesses/components/instruction-receipt";
import AgentMark from "@/features/harnesses/components/agent-mark";

const state = vi.hoisted(() => ({runs: [] as HarnessRunSummary[], workflows: [] as WorkflowRunSummary[], pathname: "/session/chat", workerError: false, workflowError: false}));
vi.mock("@/features/harnesses/hooks/api/use-harness-runs", () => ({useHarnessRuns: () => ({data: state.runs, error: state.workerError})}));
vi.mock("@/features/harnesses/hooks/api/use-workflow-runs", () => ({useWorkflowRuns: () => ({data: state.workflows, error: state.workflowError})}));
vi.mock("@tanstack/react-router", () => ({
  useLocation: () => ({pathname: state.pathname}),
  Link: ({children, to, params, ...props}: {children: ReactNode; to: string; params: Record<string, string>}) => (
    <a {...props} href={Object.entries(params).reduce((path, [key, value]) => path.replace(`$${key}`, value), to)}>
      {children}
    </a>
  ),
}));

function workerRun(overrides: Partial<HarnessRunSummary> = {}): HarnessRunSummary {
  return {
    id: "worker",
    chatId: "chat",
    harnessId: "science",
    projectId: "lab",
    projectName: "Lab",
    agentName: "source-verifier",
    role: "specialist",
    status: "running",
    task: "Verify the study",
    activity: "Checking the cited source",
    startedAt: "2026-09-11T10:00:00Z",
    updatedAt: "2026-09-11T10:01:00Z",
    ...overrides,
  };
}

describe("chat organization", () => {
  beforeEach(() => {
    state.runs = [];
    state.workflows = [];
    state.pathname = "/session/chat";
    state.workerError = false;
    state.workflowError = false;
  });
  it("does not fabricate workers for a chat with no delegations", () => {
    expect(renderToStaticMarkup(<ChatRunList sessionId="chat" />)).toBe("");
  });
  it("identifies a worker's delegating lead without pushing its name into deeper indentation", () => {
    const lead: HarnessRunSummary = {
      id: "lead",
      chatId: "chat",
      harnessId: "science",
      projectId: "lab",
      projectName: "Lab",
      agentName: "Lab",
      role: "lab-orchestrator",
      status: "completed",
      task: "Investigate",
      startedAt: "2026-09-11T10:00:00Z",
      updatedAt: "2026-09-11T10:01:00Z",
    };
    state.runs = [lead, {...lead, id: "worker", parentRunId: "lead", agentName: "source-verifier", role: "specialist", status: "running"}];
    const html = renderToStaticMarkup(<ChatRunList sessionId="chat" />);
    expect(html).toContain("/session/chat/run/lead");
    expect(html).toContain("/session/chat/run/worker");
    expect(html).toContain("via Lab");
    expect(html).toContain('aria-label="Open Source verifier conversation"');
    expect(html).toContain("1 agent working");
    expect(html.indexOf("Source verifier")).toBeLessThan(html.indexOf("Past activity"));
    expect(html).toContain('data-state="working"');
  });
  it("lists a workflow run and its progress above the workers it started", () => {
    state.workflows = [
      {
        id: "wf-1",
        chatId: "chat",
        harnessId: "science",
        projectId: "lab",
        workflowId: "review",
        workflowName: "Evidence review",
        workflowRevision: 7,
        task: "Check the claims in the draft",
        status: "running",
        cursor: 1,
        stepCount: 2,
        spentUsd: 0.2,
        startedAt: "2026-09-11T10:00:00Z",
        updatedAt: "2026-09-11T10:01:00Z",
      },
    ];
    state.runs = [
      {
        id: "worker",
        chatId: "chat",
        harnessId: "science",
        projectId: "lab",
        projectName: "Lab",
        agentName: "source-verifier",
        role: "specialist",
        status: "running",
        task: "Verify",
        startedAt: "2026-09-11T10:00:00Z",
        updatedAt: "2026-09-11T10:01:00Z",
      },
    ];
    const html = renderToStaticMarkup(<ChatRunList sessionId="chat" />);
    expect(html).toContain('href="/session/chat/workflow/wf-1"');
    expect(html).toContain("Evidence review");
    expect(html).toContain("1/2 steps");
    expect(html).toContain(">Working<");
    expect(html.indexOf("Evidence review")).toBeLessThan(html.indexOf("Source verifier"));
  });
  it("still renders the workflow timeline when no worker has started yet", () => {
    state.workflows = [
      {
        id: "wf-2",
        chatId: "chat",
        harnessId: "science",
        projectId: "lab",
        workflowId: "review",
        workflowName: "Evidence review",
        workflowRevision: 7,
        task: "Check the claims",
        status: "completed",
        cursor: 2,
        stepCount: 2,
        spentUsd: 0.4,
        startedAt: "2026-09-11T10:00:00Z",
        updatedAt: "2026-09-11T10:01:00Z",
      },
    ];
    const html = renderToStaticMarkup(<ChatRunList sessionId="chat" />);
    expect(html).toContain('href="/session/chat/workflow/wf-2"');
    expect(html).not.toContain('aria-label="Workers in this chat"');
  });
  it.each([
    ["starting", "Starting"],
    ["running", "Working"],
    ["failed", "Failed"],
    ["interrupted", "Interrupted"],
  ] as const)("keeps %s work visible outside past activity", (status, label) => {
    state.runs = [workerRun({status})];
    const html = renderToStaticMarkup(<ChatRunList sessionId="chat" live />);
    expect(html).toContain(`>${label}<`);
    expect(html).toContain("Checking the cited source");
    expect(html).not.toContain("<details");
    expect(html.includes('data-state="working"')).toBe(status === "starting" || status === "running");
  });
  it.each(["completed", "cancelled"] as const)("keeps %s results in a single expandable history", (status) => {
    state.runs = [workerRun({status})];
    const html = renderToStaticMarkup(<ChatRunList sessionId="chat" />);
    expect(html).toContain("Past activity");
    expect(html).toContain('href="/session/chat/run/worker"');
    expect(html).not.toMatch(/<details[^>]*open/);
    expect(html).not.toContain('data-state="working"');
  });
  it("opens the selected past run's history and marks its exact destination", () => {
    state.runs = [workerRun({status: "completed"})];
    state.pathname = "/session/chat/run/worker";
    const html = renderToStaticMarkup(<ChatRunList sessionId="chat" />);
    expect(html).toMatch(/<details[^>]*open/);
    expect(html).toContain('aria-current="page"');
  });
  it("keeps all run destinations reachable even with deep or missing parent records", () => {
    state.runs = Array.from({length: 8}, (_, index) =>
      workerRun({id: `worker-${index}`, agentName: `reviewer-${index}`, parentRunId: index === 0 ? "missing-parent" : `worker-${index - 1}`})
    );
    const html = renderToStaticMarkup(<ChatRunList sessionId="chat" />);
    for (const run of state.runs) expect(html).toContain(`href="/session/chat/run/${run.id}"`);
    expect(html).toContain("via Reviewer 6");
    expect(html).toContain("8 agents working");
  });
  it.each([
    [true, false, "Worker activity unavailable"],
    [false, true, "Workflow activity unavailable"],
  ] as const)("shows fetch failures without hiding the other recorded activity (%s, %s)", (workerError, workflowError, message) => {
    state.workerError = workerError;
    state.workflowError = workflowError;
    state.runs = [workerRun()];
    state.workflows = [
      {
        id: "review",
        chatId: "chat",
        harnessId: "science",
        projectId: "lab",
        workflowId: "review",
        workflowName: "Evidence review",
        workflowRevision: 1,
        task: "Review",
        status: "running",
        cursor: 0,
        stepCount: 2,
        spentUsd: 0,
        startedAt: "2026-09-11T10:00:00Z",
        updatedAt: "2026-09-11T10:01:00Z",
      },
    ];
    const html = renderToStaticMarkup(<ChatRunList sessionId="chat" live />);
    expect(html).toContain(message);
    expect(html).toContain("showing last known state");
    expect(html).toContain('href="/session/chat/workflow/review"');
    expect(html).toContain('href="/session/chat/run/worker"');
  });
  it("gives every role the same rune ring and separates specialists by color alone", () => {
    const worker = renderToStaticMarkup(<AgentMark name="reviewer" color="#7dd3fc" />);
    const lead = renderToStaticMarkup(<AgentMark name="science-space" color="#ffffff" kind="lead" />);
    const working = renderToStaticMarkup(<AgentMark name="reviewer" working />);
    for (const html of [worker, lead, working]) {
      expect(html).toContain("pi-orb-particles");
      expect(html).not.toContain("pi-specialist-orbit");
      expect(html).not.toContain("data-variant");
    }
    expect(worker).toContain("Specialist worker");
    expect(worker).toContain('style="color:#7dd3fc"');
    expect(lead).toContain("Project lead");
    expect(lead).toContain('style="color:#ffffff"');
    expect(working).toContain('data-state="working"');
    expect(worker).toContain('data-state="still"');
  });
  it("does not present configuration as an observed runtime prompt", () => {
    const html = renderToStaticMarkup(<InstructionReceipt layers={[{kind: "shared", owner: "Science Space", label: "Shared manual", content: "Scientific rules"}]} />);
    expect(html).toContain("No runtime receipt yet");
    expect(html).toContain("Scientific rules");
    expect(html).not.toContain("Exact runtime system prompt");
  });
  it("hides the delegated-work card for chats without any recorded work", () => {
    expect(renderToStaticMarkup(<ChatDelegatedWork sessionId="chat" live />)).toBe("");
  });
  it("shows actual assignments and status in the conversation card with the same worker destination", () => {
    state.runs = [workerRun()];
    const html = renderToStaticMarkup(<ChatDelegatedWork sessionId="chat" live />);
    expect(html).toContain('aria-label="Delegated work"');
    expect(html).toContain(">Verify the study<");
    expect(html).toContain(">Checking the cited source<");
    expect(html).toContain(">Working<");
    expect(html).toContain('href="/session/chat/run/worker"');
    expect(html).toContain('aria-label="Open Source verifier conversation"');
  });
  it("does not animate stale worker observations as current activity", () => {
    state.runs = [workerRun()];
    state.workerError = true;
    const html = renderToStaticMarkup(<ChatDelegatedWork sessionId="chat" live />);
    expect(html).toContain("last seen working");
    expect(html).toContain('aria-label="Working · last observed"');
    expect(html).not.toContain('data-state="working"');
    expect(html).not.toContain("animate-spin");
  });
});
