import type {ReactNode} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {beforeEach, describe, expect, it, vi} from "vitest";
import type {HarnessRunSummary, WorkflowRunSummary} from "@supernova/contracts/harnesses/schemas";
import ChatRunList from "@/features/harnesses/components/chat-run-list";
import InstructionReceipt from "@/features/harnesses/components/instruction-receipt";
import AgentMark from "@/features/harnesses/components/agent-mark";

const state = vi.hoisted(() => ({runs: [] as HarnessRunSummary[], workflows: [] as WorkflowRunSummary[]}));
vi.mock("@/features/harnesses/hooks/api/use-harness-runs", () => ({useHarnessRuns: () => ({data: state.runs})}));
vi.mock("@/features/harnesses/hooks/api/use-workflow-runs", () => ({useWorkflowRuns: () => ({data: state.workflows})}));
vi.mock("@tanstack/react-router", () => ({
  Link: ({children, to, params}: {children: ReactNode; to: string; params: Record<string, string>}) => (
    <a href={Object.entries(params).reduce((path, [key, value]) => path.replace(`$${key}`, value), to)}>{children}</a>
  ),
}));

describe("chat organization", () => {
  beforeEach(() => {
    state.runs = [];
    state.workflows = [];
  });
  it("does not fabricate workers for a chat with no delegations", () => {
    expect(renderToStaticMarkup(<ChatRunList sessionId="chat" />)).toBe("");
  });
  it("nests actual specialists beneath the delegated lab lead and links each receipt to its chat", () => {
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
    expect(html).toMatch(/Lab lead.*<ul.*Source verifier.*Worker/s);
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
    expect(html).toContain("running · 1/2");
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
});
