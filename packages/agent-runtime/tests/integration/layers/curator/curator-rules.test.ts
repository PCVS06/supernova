import {writeFile} from "node:fs/promises";
import {join} from "node:path";
import {afterEach, describe, expect, it} from "vitest";
import type {CurationEvidence, CurationProposal} from "@supernova/contracts/harnesses/schemas";
import {callTool, createCuratorFixture, reviewTools, writeReceipt, writeWorkflowFailures} from "@tests/support/layers/curator-test-utils";
import type {CuratorFixture, CuratorFixtureOptions} from "@tests/support/layers/curator-test-utils";

const dayMs = 24 * 60 * 60 * 1000;
const ago = (days: number) => new Date(Date.now() - days * dayMs).toISOString();
const rolePrompt = "Review the evidence. Name the run you rejected.";

function proposal(overrides: Partial<CurationProposal>): CurationProposal {
  return {
    id: "proposal-1",
    harnessId: "coding",
    target: {kind: "harness", harnessId: "coding"},
    change: {type: "text", find: "Never cite the source.", replace: ""},
    tier: "approval",
    rationale: "Contradicts the rule above it.",
    evidence: [{kind: "run", ref: "run-1", quote: "cited nothing"}],
    status: "rejected",
    createdAt: ago(3),
    ...overrides,
  };
}

describe("curator proposal rules", () => {
  const fixtures: CuratorFixture[] = [];
  afterEach(async () => {
    while (fixtures.length) await fixtures.pop()!.cleanup();
  });

  async function fixture(options: CuratorFixtureOptions = {}) {
    const created = await createCuratorFixture(options);
    fixtures.push(created);
    await created.store.bindSession("chat-1", await created.store.resolveProject(created.projectId));
    return created;
  }

  /** Failed runs of one role, all of the same kind unless the test asks for a second one. */
  async function failures(created: CuratorFixture, kinds: readonly string[]): Promise<string[]> {
    const runIds: string[] = [];
    for (const [index] of kinds.entries()) {
      runIds.push(
        await writeReceipt(created.runs, {
          chatId: "chat-1",
          projectId: created.projectId,
          projectPath: created.projectPath,
          startedAt: ago(index + 1),
          error: "no JSON object in the answer",
        })
      );
    }
    await writeWorkflowFailures(created.runs, {
      chatId: "chat-1",
      projectId: created.projectId,
      steps: runIds.map((runId, index) => ({runId, agent: "reviewer", failureKind: kinds[index] as "malformed_output"})),
    });
    return runIds;
  }

  const cite = (runIds: readonly string[]): CurationEvidence[] => runIds.map((ref) => ({kind: "run", ref, quote: "no JSON object in the answer"}));

  const roleChange = {target: {kind: "role", agentName: "reviewer"}, find: "Name the run you rejected.", replace: "Answer with JSON only.", rationale: "Three malformed answers."};

  describe("the three-run rule", () => {
    const withRole = {agents: [{name: "reviewer", description: "Reviewer", systemPrompt: rolePrompt, tools: []}]};

    it("accepts a role change backed by three failed runs of one group", async () => {
      const created = await fixture(withRole);
      const runIds = await failures(created, ["malformed_output", "malformed_output", "malformed_output"]);

      const filed = await callTool(reviewTools(created).tool("propose_change"), {...roleChange, evidence: cite(runIds)});

      expect(filed).toMatch(/^Filed proposal /);
      expect((await created.curation.listProposals(created.harnessId))[0]?.target).toMatchObject({kind: "role", agentName: "reviewer"});
    });

    it("names how many failed runs were cited when there are too few", async () => {
      const created = await fixture(withRole);
      const runIds = await failures(created, ["malformed_output", "malformed_output"]);

      expect(await callTool(reviewTools(created).tool("propose_change"), {...roleChange, evidence: cite(runIds)})).toBe(
        "2 failed runs of reviewer cited; the rule needs 3 from one failure group."
      );
      expect(await created.curation.listProposals(created.harnessId)).toEqual([]);
    });

    it("refuses three failures that are three different problems", async () => {
      const created = await fixture(withRole);
      const runIds = await failures(created, ["malformed_output", "malformed_output", "provider"]);

      expect(await callTool(reviewTools(created).tool("propose_change"), {...roleChange, evidence: cite(runIds)})).toBe(
        "3 failed runs of reviewer cited from 2 failure groups; the rule needs 3 from one failure group."
      );
    });

    it("lets a duplicate be cut out of a role prompt on the quoted text alone, but nothing be added on it", async () => {
      const created = await fixture(withRole);
      const quote = [{kind: "document" as const, ref: "instructions:role-reviewer", quote: "Name the run you rejected."}];

      const filed = await callTool(reviewTools(created).tool("propose_change"), {
        target: {kind: "role", agentName: "reviewer"},
        find: " Name the run you rejected.",
        replace: "",
        rationale: "The scout role says the same sentence.",
        evidence: quote,
      });
      expect(filed).toMatch(/^Filed proposal /);

      const refused = await callTool(reviewTools(created).tool("propose_change"), {
        target: {kind: "role", agentName: "reviewer"},
        find: "Name the run you rejected.",
        replace: "Name the run you rejected, and say why.",
        rationale: "It would read better.",
        evidence: quote,
      });
      expect(refused).toBe("0 failed runs of reviewer cited; the rule needs 3 from one failure group.");
    });

    it("lets a request from a chat stand in for one run, but not for two", async () => {
      const created = await fixture(withRole);
      const runIds = await failures(created, ["malformed_output", "malformed_output"]);
      const request = await created.curation.addRequest({
        id: "request-1",
        harnessId: created.harnessId,
        projectId: created.projectId,
        chatId: "chat-1",
        kind: "problem",
        agentName: "reviewer",
        text: "reviewer keeps answering with prose instead of JSON",
        at: ago(1),
      });
      const citation: CurationEvidence = {kind: "request", ref: request.id, quote: request.text};

      expect(await callTool(reviewTools(created).tool("propose_change"), {...roleChange, evidence: [...cite(runIds.slice(0, 1)), citation]})).toBe(
        "1 failed run of reviewer cited; the rule needs 3 from one failure group."
      );
      expect(await callTool(reviewTools(created).tool("propose_change"), {...roleChange, evidence: [...cite(runIds), citation]})).toMatch(/^Filed proposal /);
    });
  });

  describe("the cooldown", () => {
    it("refuses an artefact decided within the cooldown and takes newer evidence", async () => {
      const created = await fixture();
      const decidedAt = ago(2);
      await created.curation.addProposal(proposal({decidedAt, decisionReason: "Still needed."}));
      const stale = await writeReceipt(created.runs, {chatId: "chat-1", projectId: created.projectId, projectPath: created.projectPath, startedAt: ago(5)});
      const fresh = await writeReceipt(created.runs, {chatId: "chat-1", projectId: created.projectId, projectPath: created.projectPath, startedAt: ago(1)});
      const change = {target: {kind: "harness"}, find: "\nNever cite the source.", replace: "", rationale: "Contradicts the rule above it."};

      expect(await callTool(reviewTools(created).tool("propose_change"), {...change, evidence: cite([stale])})).toBe(
        `harness instructions was decided 2 days ago; cite evidence newer than ${decidedAt.slice(0, 10)} or wait 5 days.`
      );
      expect(await callTool(reviewTools(created).tool("propose_change"), {...change, evidence: cite([fresh])})).toMatch(/^Filed proposal /);
    });

    it("lets the artefact be proposed against again once the cooldown has passed", async () => {
      const created = await fixture({curator: {cooldownDays: 1}});
      await created.curation.addProposal(proposal({decidedAt: ago(2), status: "applied"}));
      const stale = await writeReceipt(created.runs, {chatId: "chat-1", projectId: created.projectId, projectPath: created.projectPath, startedAt: ago(5)});

      const filed = await callTool(reviewTools(created).tool("propose_change"), {
        target: {kind: "harness"},
        find: "\nNever cite the source.",
        replace: "",
        rationale: "Contradicts the rule above it.",
        evidence: cite([stale]),
      });

      expect(filed).toMatch(/^Filed proposal /);
    });

    it("holds a memory operation and a plan log to the same rest", async () => {
      const created = await fixture({planningDocuments: ["PLAN.md"], autoApply: {planningLog: true}});
      await writeFile(join(created.projectPath, "PLAN.md"), "# Plan\n\nFerment at 12 degrees.\n");
      await created.curation.addProposal(
        proposal({target: {kind: "document", harnessId: "coding", projectId: created.projectId, path: "PLAN.md"}, decidedAt: ago(1), status: "applied"})
      );
      const stale = await writeReceipt(created.runs, {chatId: "chat-1", projectId: created.projectId, projectPath: created.projectPath, startedAt: ago(5)});

      const refused = await callTool(reviewTools(created).tool("append_curator_log"), {
        projectId: created.projectId,
        line: "Decided to ferment at 12 degrees",
        evidence: cite([stale]),
      });

      expect(refused).toContain("planning document PLAN.md was decided 1 days ago");
    });
  });

  describe("the budget gate", () => {
    it("refuses a replacement longer than what it replaces once the budget is over eighty per cent", async () => {
      const created = await fixture();
      const runId = await writeReceipt(created.runs, {chatId: "chat-1", projectId: created.projectId, projectPath: created.projectPath});
      const {tool} = reviewTools(created, {budgetPercent: 92});

      expect(
        await callTool(tool("propose_change"), {
          target: {kind: "harness"},
          find: "Never cite the source.",
          replace: "Never cite the source unless the user asks for it.",
          rationale: "The steer asked for it.",
          evidence: cite([runId]),
        })
      ).toBe("Budget at 92%: only removals and merges.");
      expect(
        await callTool(tool("propose_change"), {
          target: {kind: "harness"},
          find: "\nNever cite the source.",
          replace: "",
          rationale: "Contradicts the rule above it.",
          evidence: cite([runId]),
        })
      ).toMatch(/^Filed proposal /);
    });

    it("leaves planning documents out of the gate, because they share no budget", async () => {
      const created = await fixture({planningDocuments: ["PLAN.md"]});
      await writeFile(join(created.projectPath, "PLAN.md"), "# Plan\n\nFerment at 12 degrees.\n");
      const runId = await writeReceipt(created.runs, {chatId: "chat-1", projectId: created.projectId, projectPath: created.projectPath});

      const filed = await callTool(reviewTools(created, {budgetPercent: 92}).tool("propose_change"), {
        target: {kind: "document", projectId: created.projectId, path: "PLAN.md"},
        find: "Ferment at 12 degrees.",
        replace: "Ferment at 12 degrees, holding the temperature for three days.",
        rationale: "The run recorded the hold.",
        evidence: cite([runId]),
      });

      expect(filed).toMatch(/^Filed proposal /);
    });
  });
});
