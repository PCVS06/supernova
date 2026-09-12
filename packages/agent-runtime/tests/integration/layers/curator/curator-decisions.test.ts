import {randomUUID} from "node:crypto";
import {readFile, writeFile} from "node:fs/promises";
import {join} from "node:path";
import {afterEach, beforeEach, describe, expect, it} from "vitest";
import type {CurationProposal} from "@supernova/contracts/harnesses/schemas";
import {decideCuration, rollbackCuration} from "@supernova/agent-runtime/layers/curator/curator-decisions";
import {latestMemoryRecords, readMemoryEvents} from "@supernova/agent-runtime/layers/curator/lib/memory-ledger";
import {createCuratorFixture, writeLedger} from "@tests/support/layers/curator-test-utils";
import type {CuratorFixture} from "@tests/support/layers/curator-test-utils";

const harnessPrompt = "Always cite the source.\nNever cite the source.";

describe("curation decisions", () => {
  let fixture: CuratorFixture;
  beforeEach(async () => {
    fixture = await createCuratorFixture({harnessPrompt});
  });
  afterEach(async () => {
    await fixture.cleanup();
  });

  async function pending(overrides: Partial<CurationProposal> = {}): Promise<CurationProposal> {
    return fixture.curation.addProposal({
      id: randomUUID(),
      harnessId: fixture.harnessId,
      reviewId: "review-1",
      target: {kind: "harness", harnessId: fixture.harnessId},
      change: {type: "text", find: "\nNever cite the source.", replace: ""},
      tier: "approval",
      rationale: "Contradicts the rule above it.",
      evidence: [{kind: "run", ref: "run-1", quote: "cited nothing"}],
      status: "pending",
      createdAt: new Date().toISOString(),
      ...overrides,
    });
  }

  const dependencies = () => ({store: fixture.store, curation: fixture.curation});

  it("applies an approved text change, bumps the revision and keeps the previous text", async () => {
    const proposal = await pending();

    const decided = await decideCuration({...dependencies(), proposalId: proposal.id, decision: "approve", expectedRevision: 2});

    expect(decided.proposal).toMatchObject({status: "applied", appliedRevision: 3});
    expect(decided.proposal.decidedAt).toBeDefined();
    expect(decided.library.revision).toBe(3);
    expect(decided.library.harnesses[0]?.systemPrompt).toBe("Always cite the source.");
    expect(await fixture.store.readVersion({kind: "harness", harnessId: fixture.harnessId}, 2)).toBe(harnessPrompt);
    await expect(decideCuration({...dependencies(), proposalId: proposal.id, decision: "approve", expectedRevision: 3})).rejects.toThrow("already applied");
  });

  it("applies the user's edited replacement and keeps it for the rollback", async () => {
    const proposal = await pending();

    const decided = await decideCuration({...dependencies(), proposalId: proposal.id, decision: "approve", replace: "\nCite the source exactly once.", expectedRevision: 2});

    expect(decided.library.harnesses[0]?.systemPrompt).toBe("Always cite the source.\nCite the source exactly once.");
    expect(decided.proposal.change).toEqual({type: "text", find: "\nNever cite the source.", replace: "\nCite the source exactly once."});

    const rolled = await rollbackCuration({...dependencies(), proposalId: proposal.id, expectedRevision: 3});
    expect(rolled.proposal.status).toBe("rolled-back");
    expect(rolled.library.harnesses[0]?.systemPrompt).toBe(harnessPrompt);
  });

  it("records a rejection reason and refuses a rejection without one", async () => {
    const proposal = await pending();

    await expect(decideCuration({...dependencies(), proposalId: proposal.id, decision: "reject", expectedRevision: 2})).rejects.toThrow("needs a reason");
    const decided = await decideCuration({...dependencies(), proposalId: proposal.id, decision: "reject", reason: "The rule is deliberate.", expectedRevision: 2});

    expect(decided.proposal).toMatchObject({status: "rejected", decisionReason: "The rule is deliberate."});
    expect(decided.library.harnesses[0]?.systemPrompt).toBe(harnessPrompt);
    expect((await fixture.store.list()).revision).toBe(2);
  });

  it("fails an approval whose text was edited by hand, and leaves a stale caller's proposal pending", async () => {
    const proposal = await pending();
    await fixture.store.save({...(await fixture.store.list()).harnesses[0]!, systemPrompt: "Always cite the source."}, 2);

    const decided = await decideCuration({...dependencies(), proposalId: proposal.id, decision: "approve", expectedRevision: 3});
    expect(decided.proposal.status).toBe("failed");
    expect(decided.proposal.error).toContain("find matched 0 times");

    const other = await pending();
    await expect(decideCuration({...dependencies(), proposalId: other.id, decision: "approve", expectedRevision: 2})).rejects.toThrow("changed elsewhere");
    expect((await fixture.curation.getProposal(other.id))?.status).toBe("pending");
  });

  it("refuses a rollback once the applied text is gone, pointing at the version history", async () => {
    const proposal = await pending();
    await decideCuration({...dependencies(), proposalId: proposal.id, decision: "approve", expectedRevision: 2});
    await fixture.store.save({...(await fixture.store.list()).harnesses[0]!, systemPrompt: "Rewritten by hand."}, 3);

    await expect(rollbackCuration({...dependencies(), proposalId: proposal.id, expectedRevision: 4})).rejects.toThrow("restore it from the version history");
    expect((await fixture.curation.getProposal(proposal.id))?.status).toBe("applied");
    expect(await fixture.store.readVersion({kind: "harness", harnessId: fixture.harnessId}, 2)).toBe(harnessPrompt);
  });

  it("applies and rolls back a plan log line", async () => {
    const plan = join(fixture.projectPath, "PLAN.md");
    await writeFile(plan, "# Plan\n\nFerment at 12 degrees.\n");
    await fixture.store.saveProject({...(await fixture.store.list()).projects[0]!, planningDocuments: ["PLAN.md"]}, 2);
    const proposal = await pending({
      target: {kind: "document", harnessId: fixture.harnessId, projectId: fixture.projectId, path: "PLAN.md"},
      change: {type: "log", line: "Closed the temperature decision"},
    });

    const decided = await decideCuration({...dependencies(), proposalId: proposal.id, decision: "approve", expectedRevision: 3});
    expect(decided.proposal.status).toBe("applied");
    expect(await readFile(plan, "utf8")).toContain("## Curator log");
    expect(await readFile(plan, "utf8")).toMatch(/- \d{4}-\d{2}-\d{2} · Closed the temperature decision/);

    const rolled = await rollbackCuration({...dependencies(), proposalId: proposal.id, expectedRevision: 3});
    expect(rolled.proposal.status).toBe("rolled-back");
    const contents = await readFile(plan, "utf8");
    expect(contents).not.toContain("Closed the temperature decision");
    expect(contents).toContain("## Curator log");
    await expect(rollbackCuration({...dependencies(), proposalId: proposal.id, expectedRevision: 3})).rejects.toThrow("Only an applied proposal");
  });

  it("applies an approved memory transition and refuses to roll it back", async () => {
    await writeLedger(fixture.projectPath, [
      {recordId: "C-1", statement: "Fermentation stalls below 14 degrees."},
      {recordId: "C-2", statement: "Fermentation stalls below 12 degrees."},
    ]);
    const proposal = await pending({
      target: {kind: "memory", harnessId: fixture.harnessId, projectId: fixture.projectId, recordId: "C-1"},
      change: {type: "memory", op: "supersede", supersededBy: "C-2", reason: "Duplicate of C-2."},
    });

    const decided = await decideCuration({...dependencies(), proposalId: proposal.id, decision: "approve", expectedRevision: 2});

    expect(decided.proposal).toMatchObject({status: "applied", appliedRevision: 2});
    const state = latestMemoryRecords(await readMemoryEvents(fixture.projectPath));
    expect(state.get("C-1")?.record.epistemicState).toBe("superseded");
    expect(state.get("C-1")?.record.supersededBy).toBe("C-2");
    await expect(rollbackCuration({...dependencies(), proposalId: proposal.id, expectedRevision: 2})).rejects.toThrow("append-only");
  });

  it("reports a missing proposal rather than guessing", async () => {
    await expect(decideCuration({...dependencies(), proposalId: "unknown", decision: "approve", expectedRevision: 2})).rejects.toThrow("not found");
  });
});
