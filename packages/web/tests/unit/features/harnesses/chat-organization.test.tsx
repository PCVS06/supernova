import type {ReactNode} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {beforeEach, describe, expect, it, vi} from "vitest";
import type {HarnessRunSummary} from "@supernova/contracts/harnesses/schemas";
import ChatRunList from "@/features/harnesses/components/chat-run-list";
import InstructionReceipt from "@/features/harnesses/components/instruction-receipt";
import AgentMark from "@/features/harnesses/components/agent-mark";

const state = vi.hoisted(() => ({runs: [] as HarnessRunSummary[]}));
vi.mock("@/features/harnesses/hooks/api/use-harness-runs", () => ({useHarnessRuns: () => ({data: state.runs})}));
vi.mock("@tanstack/react-router", () => ({
  Link: ({children, params}: {children: ReactNode; params: {sessionId: string; runId: string}}) => <a href={`/session/${params.sessionId}/run/${params.runId}`}>{children}</a>,
}));

describe("chat organization", () => {
  beforeEach(() => {
    state.runs = [];
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
  it("distinguishes a worker by shape, not only color", () => {
    const worker = renderToStaticMarkup(<AgentMark name="reviewer" color="#7dd3fc" />);
    const lead = renderToStaticMarkup(<AgentMark name="reviewer" color="#7dd3fc" kind="lead" />);
    expect(worker).toContain("Specialist worker");
    expect(worker).toContain('data-variant="specialist"');
    expect(worker).toContain("pi-specialist-orbit");
    expect(lead).toContain('data-variant="orb"');
    expect(lead).not.toContain("pi-specialist-orbit");
  });
  it("does not present configuration as an observed runtime prompt", () => {
    const html = renderToStaticMarkup(<InstructionReceipt layers={[{kind: "shared", owner: "Science Space", label: "Shared manual", content: "Scientific rules"}]} />);
    expect(html).toContain("No runtime receipt yet");
    expect(html).toContain("Scientific rules");
    expect(html).not.toContain("Exact runtime system prompt");
  });
});
