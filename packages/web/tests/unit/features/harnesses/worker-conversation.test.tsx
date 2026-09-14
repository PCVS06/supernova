import type {ReactNode} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {beforeEach, describe, expect, it, vi} from "vitest";
import type {HarnessRun} from "@supernova/contracts/harnesses/schemas";
import HarnessRunPage from "@/features/harnesses/pages/harness-run-page";
import WorkerConversation from "@/features/harnesses/components/worker-run/worker-conversation";
import WorkerRunDetail from "@/features/harnesses/components/worker-run/worker-run-detail";
import WorkerActivity from "@/features/harnesses/components/worker-run/worker-activity";

const query = vi.hoisted(() => ({data: undefined as HarnessRun | undefined, error: undefined as Error | undefined, refetch: vi.fn()}));
vi.mock("@/features/harnesses/hooks/api/use-harness-runs", () => ({useHarnessRun: () => query, useHarnessRuns: () => ({data: [], isSuccess: true})}));
vi.mock("@/features/harnesses/hooks/api/use-workflow-runs", () => ({useWorkflowRuns: () => ({data: [], isSuccess: true})}));
vi.mock("@tanstack/react-router", () => ({
  Link: ({children, to, params, ...props}: {children: ReactNode; to: string; params: Record<string, string>}) => (
    <a {...props} href={Object.entries(params).reduce((path, [key, value]) => path.replace(`$${key}`, value), to)}>
      {children}
    </a>
  ),
}));

const run: HarnessRun = {
  id: "review-1",
  chatId: "owning-chat",
  parentRunId: "lab-lead",
  harnessId: "science",
  projectId: "lab",
  projectName: "Research lab",
  projectPath: "/research/lab",
  agentName: "source-verifier",
  role: "specialist",
  status: "running",
  task: "Check the research claims.",
  startedAt: "2026-09-12T10:00:00Z",
  updatedAt: "2026-09-12T10:01:00Z",
  revision: 4,
  instructions: [{kind: "role", label: "Role", owner: "Verifier", content: "ROLE INSTRUCTIONS ARE NOT CHAT"}],
  output: "",
  activity: "Using read",
  events: [{at: "2026-09-12T10:00:10Z", message: "Using read"}],
  transcript: {
    omittedEntries: 0,
    entries: [
      {id: "a1", kind: "assistant", at: "2026-09-12T10:00:02Z", text: "The **primary source** is available.", streaming: false, truncated: false},
      {
        id: "t1",
        kind: "tool",
        at: "2026-09-12T10:00:10Z",
        toolName: "read",
        status: "running",
        input: '{"path":"evidence.md"}',
        inputTruncated: false,
        outputTruncated: false,
        mediaOmitted: false,
      },
    ],
  },
};

describe("worker conversation inspection", () => {
  beforeEach(() => {
    query.data = undefined;
    query.error = undefined;
  });

  it("puts the result first, keeps context closed, and links the owning chat", () => {
    query.data = run;
    const html = renderToStaticMarkup(<HarnessRunPage sessionId={run.chatId} runId={run.id} />);
    expect(html).toContain('aria-label="Worker conversation"');
    expect(html).toContain("Check the research claims.");
    expect(html).toContain("<strong>primary source</strong>");
    expect(html).toContain('href="/session/owning-chat"');
    expect(html).not.toContain('href="/session/owning-chat/run/lab-lead"');
    expect(html).toContain("Back to chat");
    expect(html).not.toContain("ROLE INSTRUCTIONS ARE NOT CHAT");
    expect(html).not.toContain("No transcript recorded");
    expect(html).toContain('aria-expanded="false"');
    expect(html).not.toContain("evidence.md");
  });

  it("labels a historical final result honestly instead of inventing a conversation", () => {
    const html = renderToStaticMarkup(<WorkerConversation run={{...run, status: "completed", transcript: undefined, output: "Archived result"}} />);
    expect(html).toContain("No transcript recorded for this run");
    expect(html).toContain('aria-label="Agent result"');
    expect(html).toContain("Archived result");
    expect(html).not.toContain("Updates automatically");
    expect(html).not.toContain("Writing…");
  });

  it.each(["failed", "cancelled", "interrupted", "completed"] as const)("does not claim a tool is still running after the run is %s", (status) => {
    const html = renderToStaticMarkup(<WorkerConversation run={{...run, status}} />);
    expect(html).toContain("No completion recorded");
    expect(html).not.toContain("This worker is no longer running");
    expect(html).not.toContain("Updates automatically");
  });

  it("keeps partial output visible but stops live claims when polling fails", () => {
    query.data = {
      ...run,
      transcript: {omittedEntries: 0, entries: [{id: "a1", at: run.startedAt, kind: "assistant", text: "Partial public finding", streaming: true, truncated: false}]},
    };
    query.error = new Error("Offline");
    const html = renderToStaticMarkup(<HarnessRunPage sessionId={run.chatId} runId={run.id} />);
    expect(html).toContain("Showing the last saved observation");
    expect(html).toContain("Partial public finding");
    expect(html).toContain("Partial response");
    expect(html).toContain("last observed");
    expect(html).not.toContain('data-state="working"');
  });

  it("does not repeat the returned answer already recorded in the conversation", () => {
    const html = renderToStaticMarkup(<WorkerConversation run={{...run, status: "completed", output: "The **primary source** is available."}} />);
    expect(html.match(/<strong>primary source<\/strong>/g)).toHaveLength(1);
    expect(html).not.toContain("Returned result");
  });

  it("reports shortened history and messages without claiming full coverage", () => {
    const html = renderToStaticMarkup(
      <WorkerConversation
        run={{...run, transcript: {omittedEntries: 12, entries: [{id: "a1", at: run.startedAt, kind: "assistant", text: "Excerpt", streaming: false, truncated: true}]}}}
      />
    );
    expect(html).toContain("12 earlier conversation entries omitted");
    expect(html).toContain("Message shortened in this recording");
  });

  it("distinguishes a newly started empty recording from a historical missing recording", () => {
    const html = renderToStaticMarkup(<WorkerConversation run={{...run, status: "starting", transcript: {entries: [], omittedEntries: 0}}} />);
    expect(html).toContain("Working on the assignment…");
    expect(html).not.toContain("No transcript recorded");
  });

  it("shows the actual timestamped event history in its separate activity view", () => {
    const html = renderToStaticMarkup(<WorkerActivity run={run} />);
    expect(html).toContain('dateTime="2026-09-12T10:00:10Z"');
    expect(html).toContain("Using read");
    expect(html).not.toContain("primary source");
  });

  it("keeps a run failure visible and does not mark it as successful", () => {
    const html = renderToStaticMarkup(<WorkerRunDetail run={{...run, status: "failed", error: "Provider unavailable"}} />);
    expect(html).toContain('role="alert"');
    expect(html).toContain("Provider unavailable");
    expect(html).not.toContain('data-state="working"');
  });
});
