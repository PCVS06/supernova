import {describe, expect, it} from "vitest";
import {failureSignature, groupFailures} from "@supernova/agent-runtime/layers/curator/lib/curator-failures";
import type {FailureReceipt} from "@supernova/agent-runtime/layers/curator/lib/curator-failures";

function receipt(overrides: Partial<FailureReceipt> & {runId: string}): FailureReceipt {
  const error = overrides.error;
  return {
    chatId: "chat-1",
    projectId: "project-a",
    agentName: "reviewer",
    startedAt: "2026-09-10T10:00:00.000Z",
    failed: true,
    ...(error && !overrides.failureKind ? {signature: failureSignature(error)} : {}),
    ...overrides,
  };
}

describe("curator failure grouping", () => {
  it("strips what differs between two runs of the same failure", () => {
    const first = failureSignature("Step 3 returned malformed JSON at /Users/ada/lab/out-17.json (run 8f3c19ab)");
    const second = failureSignature("Step 7 returned malformed JSON at /Users/ada/lab/out-4.json (run 2b91ccde)");

    expect(first).toBe(second);
    expect(first).toBe("step returned malformed json at run");
    expect(failureSignature("x".repeat(400))).toHaveLength(120);
  });

  it("groups by failure kind, and by error signature when there is none", () => {
    const groups = groupFailures([
      receipt({runId: "run-1", failureKind: "malformed_output", startedAt: "2026-09-10T12:00:00.000Z", error: "no JSON object in the answer"}),
      receipt({runId: "run-2", failureKind: "malformed_output", startedAt: "2026-09-09T12:00:00.000Z", error: "no JSON object in the answer"}),
      receipt({runId: "run-3", failureKind: "limit", startedAt: "2026-09-08T12:00:00.000Z"}),
      receipt({runId: "run-4", startedAt: "2026-09-07T12:00:00.000Z", error: "Timed out after 900 seconds"}),
      receipt({runId: "run-5", startedAt: "2026-09-06T12:00:00.000Z", error: "Timed out after 120 seconds"}),
    ]);

    expect(groups.map((group) => [group.kind ?? group.signature, group.count])).toEqual([
      ["malformed_output", 2],
      ["timed out after seconds", 2],
      ["limit", 1],
    ]);
    const malformed = groups[0]!;
    expect(malformed).toMatchObject({
      agentName: "reviewer",
      projectId: "project-a",
      runIds: ["run-1", "run-2"],
      firstSeen: "2026-09-09T12:00:00.000Z",
      lastSeen: "2026-09-10T12:00:00.000Z",
      lastError: "no JSON object in the answer",
    });
  });

  it("keeps each agent's failures to itself and ignores runs that did not fail", () => {
    const groups = groupFailures([
      receipt({runId: "run-1", agentName: "reviewer", failureKind: "provider"}),
      receipt({runId: "run-2", agentName: "scout", failureKind: "provider"}),
      receipt({runId: "run-3", agentName: "reviewer", failed: false, failureKind: undefined}),
    ]);

    expect(groups.map((group) => [group.agentName, group.count])).toEqual([
      ["reviewer", 1],
      ["scout", 1],
    ]);
  });

  it("counts a run once however often it is handed in", () => {
    const twice = receipt({runId: "run-1", failureKind: "provider"});

    expect(groupFailures([twice, twice])[0]).toMatchObject({count: 1, runIds: ["run-1"]});
  });
});
