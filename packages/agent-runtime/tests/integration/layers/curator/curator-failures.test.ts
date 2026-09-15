import {afterEach, describe, expect, it} from "vitest";
import {callTool, createCuratorFixture, reviewTools, writeReceipt, writeWorkflowFailures} from "@tests/support/layers/curator-test-utils";
import type {CuratorFixture} from "@tests/support/layers/curator-test-utils";

const dayMs = 24 * 60 * 60 * 1000;
const ago = (days: number) => new Date(Date.now() - days * dayMs).toISOString();

const shared = [
  "Cite every claim with the identifier of the run it came from.",
  "Never answer from memory when the ledger already holds the record.",
  "Write the result as JSON with a result field and nothing else.",
];

function agent(name: string, sentences: readonly string[]) {
  return {name, description: name, systemPrompt: sentences.join("\n"), tools: []};
}

interface FailureGroupRow {
  agentName: string;
  kind?: string;
  signature?: string;
  runIds: string[];
  count: number;
  meetsRule: boolean;
  lastError?: string;
}

describe("curator failure and overlap reads", () => {
  const fixtures: CuratorFixture[] = [];
  afterEach(async () => {
    while (fixtures.length) await fixtures.pop()!.cleanup();
  });

  async function fixture(options: Parameters<typeof createCuratorFixture>[0] = {}) {
    const created = await createCuratorFixture(options);
    fixtures.push(created);
    await created.store.bindSession("chat-1", await created.store.resolveProject(created.projectId));
    return created;
  }

  it("groups repeated failures per agent and marks the ones that meet the three-run rule", async () => {
    const created = await fixture({agents: [agent("reviewer", shared), agent("scout", shared.slice(0, 1))]});
    const chat = {chatId: "chat-1", projectId: created.projectId, projectPath: created.projectPath};
    const malformed = [];
    for (const days of [1, 2, 3]) malformed.push(await writeReceipt(created.runs, {...chat, startedAt: ago(days), error: "no JSON object in the answer"}));
    const timedOut = [
      await writeReceipt(created.runs, {...chat, startedAt: ago(4), error: "Timed out after 900 seconds"}),
      await writeReceipt(created.runs, {...chat, startedAt: ago(5), error: "Timed out after 120 seconds"}),
    ];
    // One failure of its own is not a pattern, and a failure outside the window is not recent.
    await writeReceipt(created.runs, {...chat, agentName: "scout", startedAt: ago(6), error: "Provider refused the request"});
    const old = await writeReceipt(created.runs, {...chat, startedAt: ago(40), error: "no JSON object in the answer"});
    await writeWorkflowFailures(created.runs, {
      chatId: "chat-1",
      projectId: created.projectId,
      steps: [...malformed, old].map((runId) => ({runId, agent: "reviewer", failureKind: "malformed_output" as const})),
    });

    const groups = JSON.parse(await callTool(reviewTools(created).tool("read_failures"), {})) as FailureGroupRow[];

    expect(groups).toHaveLength(2);
    expect(groups[0]).toMatchObject({agentName: "reviewer", kind: "malformed_output", count: 3, meetsRule: true, runIds: malformed});
    expect(groups[0]?.signature).toBeUndefined();
    expect(groups[1]).toMatchObject({agentName: "reviewer", signature: "timed out after seconds", count: 2, meetsRule: false, runIds: timedOut});
    expect(groups[1]?.lastError).toBe("Timed out after 900 seconds");
  });

  it("reports the roles that repeat each other, with one of the shared sentences", async () => {
    const created = await fixture({agents: [agent("reviewer", [...shared, "Reject a claim whose evidence does not resolve."]), agent("scout", shared)]});

    const report = JSON.parse(await callTool(reviewTools(created).tool("read_instructions"), {})) as {
      overlaps: {agents: string[]; shared: number; sample: string}[];
    };

    expect(report.overlaps).toEqual([{agents: ["reviewer", "scout"], shared: 3, sample: shared[0]!.toLowerCase()}]);
  });

  it("reads nothing into a harness whose roles only share a sentence or two", async () => {
    const created = await fixture({agents: [agent("reviewer", shared.slice(0, 2)), agent("scout", shared)]});

    const report = JSON.parse(await callTool(reviewTools(created).tool("read_instructions"), {})) as {overlaps: unknown[]};

    expect(report.overlaps).toEqual([]);
  });
});
