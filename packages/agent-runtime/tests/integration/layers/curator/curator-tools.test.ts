import {readFile, writeFile} from "node:fs/promises";
import {join} from "node:path";
import {afterEach, describe, expect, it} from "vitest";
import type {ExtensionContext, ToolDefinition} from "@earendil-works/pi-coding-agent";
import {createCuratorTools} from "@supernova/agent-runtime/layers/curator/curator-tools";
import type {CuratorReviewTally} from "@supernova/agent-runtime/layers/curator/curator-tools";
import {latestMemoryRecords, readMemoryEvents} from "@supernova/agent-runtime/layers/curator/lib/memory-ledger";
import {createCuratorFixture, writeLedger, writeReceipt} from "@tests/support/layers/curator-test-utils";
import type {CuratorFixture, CuratorFixtureOptions} from "@tests/support/layers/curator-test-utils";

const harnessPrompt = "Always cite the source.\nNever cite the source.";

async function call(tool: ToolDefinition, params: unknown): Promise<string> {
  const result = await tool.execute("call-1", params, undefined, undefined, {} as ExtensionContext);
  return result.content.map((part) => ("text" in part ? part.text : "")).join("");
}

describe("curator tools", () => {
  const fixtures: CuratorFixture[] = [];
  afterEach(async () => {
    while (fixtures.length) await fixtures.pop()!.cleanup();
  });

  /** A review in progress: the tools, the tally they write into, and a receipt and steer they can cite. */
  async function review(options: CuratorFixtureOptions = {}) {
    const fixture = await createCuratorFixture({harnessPrompt, ...options});
    fixtures.push(fixture);
    const snapshot = await fixture.store.resolveProject(fixture.projectId);
    await fixture.store.bindSession("chat-1", snapshot);
    const runId = await writeReceipt(fixture.runs, {chatId: "chat-1", projectId: fixture.projectId, projectPath: fixture.projectPath, error: "cited nothing"});
    await fixture.runs.appendSteer("chat-1", "Cite the source", "2026-09-10T10:00:00.000Z");
    const tally: CuratorReviewTally = {proposals: 0, applied: 0, targets: new Set<string>()};
    const tools = createCuratorTools(
      {
        harnessId: fixture.harnessId,
        reviewId: "review-1",
        scope: "full",
        projectId: fixture.projectId,
        autoApply: {memory: options.autoApply?.memory ?? false, planningLog: options.autoApply?.planningLog ?? false},
        actor: {modelProvider: "pi-plus", modelId: "curator", sessionId: "review-1"},
        store: fixture.store,
        curation: fixture.curation,
        runs: fixture.runs,
      },
      tally
    );
    const tool = (name: string) => tools.find((item) => item.name === name)!;
    return {fixture, tools, tally, tool, runId, evidence: [{kind: "run" as const, ref: runId, quote: "cited nothing"}]};
  }

  it("reads the instruction layers with their sizes and budget", async () => {
    const {tool} = await review();

    const report = JSON.parse(await call(tool("read_instructions"), {})) as {
      budget: {assembledChars: number; percent: number};
      pieces: {label: string; chars: number; text: string}[];
    };
    expect(report.budget.assembledChars).toBe(harnessPrompt.length + "This project studies fermentation.".length);
    expect(report.budget.percent).toBe(0);
    expect(report.pieces.find((piece) => piece.label === "harness instructions")?.text).toBe(harnessPrompt);
    expect(report.pieces.find((piece) => piece.label.startsWith("project instructions"))?.chars).toBe("This project studies fermentation.".length);
  });

  it("files a text proposal that cites a receipt and refuses a second one for the same artefact", async () => {
    const {tool, tally, fixture, evidence} = await review();

    const filed = await call(tool("propose_change"), {
      target: {kind: "harness"},
      find: "\nNever cite the source.",
      replace: "",
      rationale: "Contradicts the rule above it.",
      evidence,
    });
    expect(filed).toMatch(/^Filed proposal /);
    expect(tally).toMatchObject({proposals: 1, applied: 0});
    const [proposal] = await fixture.curation.listProposals(fixture.harnessId);
    expect(proposal).toMatchObject({status: "pending", tier: "approval", reviewId: "review-1", target: {kind: "harness", harnessId: "coding"}});
    expect(proposal?.change).toEqual({type: "text", find: "\nNever cite the source.", replace: ""});
    // The instructions are untouched until somebody approves it.
    expect((await fixture.store.list()).harnesses[0]?.systemPrompt).toBe(harnessPrompt);

    const second = await call(tool("propose_change"), {target: {kind: "harness"}, find: "Always cite the source.", replace: "Cite sources.", rationale: "Shorter.", evidence});
    expect(second).toContain("One proposal per artefact per review");
    expect(tally.proposals).toBe(1);
  });

  it("accepts the instruction text as evidence for a duplicate only when the quote really occurs in it", async () => {
    const {tool, tally} = await review();
    const cite = (quote: string) => [{kind: "document" as const, ref: "instructions:harness", quote}];
    expect(
      await call(tool("propose_change"), {target: {kind: "harness"}, find: "Always cite the source.", replace: "", rationale: "Duplicated.", evidence: cite("never in the text")})
    ).toContain("do not resolve");
    const filed = await call(tool("propose_change"), {
      target: {kind: "harness"},
      find: "Always cite the source.",
      replace: "",
      rationale: "Duplicated below.",
      evidence: cite("Always cite the source."),
    });
    expect(filed).not.toContain("do not resolve");
    expect(tally.proposals).toBe(1);
  });
  it("refuses a find that does not match exactly once, and says how often it did", async () => {
    const {tool, fixture} = await review({harnessPrompt: "Cite the source.\nCite the source.\nCite the source."});
    const runId = await writeReceipt(fixture.runs, {chatId: "chat-1", projectId: fixture.projectId, projectPath: fixture.projectPath});
    const evidence = [{kind: "run" as const, ref: runId, quote: "cited nothing"}];

    expect(await call(tool("propose_change"), {target: {kind: "harness"}, find: "Cite the source.", replace: "", rationale: "Duplicated.", evidence})).toBe(
      "find matched 3 times in the harness instructions; it has to match exactly once."
    );
    expect(await call(tool("propose_change"), {target: {kind: "harness"}, find: "Never written.", replace: "", rationale: "Absent.", evidence})).toBe(
      "find matched 0 times in the harness instructions; it has to match exactly once."
    );
    expect(await fixture.curation.listProposals(fixture.harnessId)).toEqual([]);
  });

  it("refuses a citation that does not resolve, a rationale of three sentences and an unknown artefact", async () => {
    const {tool, fixture, evidence} = await review();

    expect(
      await call(tool("propose_change"), {
        target: {kind: "harness"},
        find: "Never cite the source.",
        replace: "",
        rationale: "Taste.",
        evidence: [{kind: "run", ref: "11111111-2222-3333-4444-555555555555", quote: "nothing"}],
      })
    ).toContain("do not resolve");
    expect(await call(tool("propose_change"), {target: {kind: "harness"}, find: "Never cite the source.", replace: "", rationale: "One. Two. Three.", evidence})).toBe(
      "A rationale is at most two sentences."
    );
    expect(await call(tool("propose_change"), {target: {kind: "role", agentName: "ghost"}, find: "x", replace: "", rationale: "Gone.", evidence})).toContain(
      "no longer defines that role"
    );
    expect(await call(tool("propose_change"), {target: {kind: "project"}, find: "x", replace: "", rationale: "Gone.", evidence})).toBe("A project proposal needs a projectId.");
    expect(await fixture.curation.listProposals(fixture.harnessId)).toEqual([]);

    // A steer citation resolves on the chat and timestamp the steer log returns.
    const accepted = await call(tool("propose_change"), {
      target: {kind: "harness"},
      find: "Never cite the source.",
      replace: "",
      rationale: "The user corrected this mid-turn.",
      evidence: [{kind: "steer", ref: "chat-1@2026-09-10T10:00:00.000Z", quote: "Cite the source"}],
    });
    expect(accepted).toMatch(/^Filed proposal /);
  });

  it("refuses a replacement that would push the piece over its budget", async () => {
    const {tool, fixture, evidence} = await review({harnessPrompt: `${"x".repeat(199900)}\nNever cite the source.`});

    const refused = await call(tool("propose_change"), {
      target: {kind: "harness"},
      find: "Never cite the source.",
      replace: "y".repeat(200),
      rationale: "Longer rule.",
      evidence,
    });
    expect(refused).toContain("over the 200,000 character limit");
    expect(await fixture.curation.listProposals(fixture.harnessId)).toEqual([]);
  });

  it("files a memory transition for approval while auto-apply is off", async () => {
    const {tool, fixture, evidence} = await review();
    await writeLedger(fixture.projectPath, [
      {recordId: "C-1", statement: "Fermentation stalls below 14 degrees."},
      {recordId: "C-2", statement: "Fermentation stalls below 12 degrees."},
    ]);

    const filed = await call(tool("apply_memory_op"), {
      projectId: fixture.projectId,
      recordId: "C-1",
      op: "supersede",
      supersededBy: "C-2",
      reason: "Duplicate of C-2.",
      evidence,
    });
    expect(filed).toContain("waits for approval");
    const [proposal] = await fixture.curation.listProposals(fixture.harnessId);
    expect(proposal).toMatchObject({status: "pending", tier: "approval", target: {kind: "memory", recordId: "C-1"}});
    expect(proposal?.change).toEqual({type: "memory", op: "supersede", supersededBy: "C-2", reason: "Duplicate of C-2."});
    expect(await readMemoryEvents(fixture.projectPath)).toHaveLength(2);
  });

  it("applies a memory transition at once when auto-apply is on, and refuses an unknown record", async () => {
    const {tool, fixture, tally, evidence} = await review({autoApply: {memory: true}});
    await writeLedger(fixture.projectPath, [
      {recordId: "C-1", statement: "Fermentation stalls below 14 degrees."},
      {recordId: "C-2", statement: "Fermentation stalls below 12 degrees."},
    ]);

    expect(await call(tool("apply_memory_op"), {projectId: fixture.projectId, recordId: "C-9", op: "retract", reason: "Not there.", evidence})).toContain("No memory record C-9");
    const applied = await call(tool("apply_memory_op"), {
      projectId: fixture.projectId,
      recordId: "C-1",
      op: "supersede",
      supersededBy: "C-2",
      reason: "Duplicate of C-2.",
      evidence,
    });

    expect(applied).toContain("is now superseded");
    expect(tally).toMatchObject({proposals: 1, applied: 1});
    const [proposal] = await fixture.curation.listProposals(fixture.harnessId);
    expect(proposal).toMatchObject({status: "applied", tier: "silent"});
    expect(proposal?.decidedAt).toBeDefined();
    const state = latestMemoryRecords(await readMemoryEvents(fixture.projectPath));
    expect(state.get("C-1")?.record.epistemicState).toBe("superseded");
  });

  it("appends the plan log under a heading it creates in the project's first planning document", async () => {
    const {tool, fixture, evidence} = await review({autoApply: {planningLog: true}, planningDocuments: ["PLAN.md"]});
    const plan = join(fixture.projectPath, "PLAN.md");
    await writeFile(plan, "# Plan\n\nFerment at 12 degrees.\n");

    const logged = await call(tool("append_curator_log"), {projectId: fixture.projectId, line: "Decided to ferment at 12 degrees", evidence});

    expect(logged).toContain("Logged in PLAN.md");
    const contents = await readFile(plan, "utf8");
    expect(contents).toContain("# Plan\n\nFerment at 12 degrees.\n\n## Curator log\n\n- ");
    expect(contents).toMatch(/- \d{4}-\d{2}-\d{2} · Decided to ferment at 12 degrees\n$/);
    const [proposal] = await fixture.curation.listProposals(fixture.harnessId);
    expect(proposal).toMatchObject({status: "applied", tier: "notify", target: {kind: "document", path: "PLAN.md"}});
    // The document was already registered, so the library is untouched.
    expect((await fixture.store.list()).revision).toBe(2);
  });

  it("creates CURATOR.md and registers it when the project has no plan", async () => {
    const {tool, fixture, evidence} = await review({autoApply: {planningLog: true}});

    const logged = await call(tool("append_curator_log"), {projectId: fixture.projectId, line: "Recorded the first decision", evidence});

    expect(logged).toContain("Logged in CURATOR.md");
    const contents = await readFile(join(fixture.projectPath, "CURATOR.md"), "utf8");
    expect(contents.startsWith("## Curator log\n\n- ")).toBe(true);
    const library = await fixture.store.list();
    expect(library.projects[0]?.planningDocuments).toEqual(["CURATOR.md"]);
    expect(library.revision).toBe(3);
  });

  it("keeps a memory review to the ledger: no text tool is even present", async () => {
    const fixture = await createCuratorFixture({harnessPrompt});
    fixtures.push(fixture);
    const tools = createCuratorTools(
      {
        harnessId: fixture.harnessId,
        reviewId: "review-2",
        scope: "memory",
        projectId: fixture.projectId,
        autoApply: {memory: true, planningLog: true},
        actor: {modelProvider: "pi-plus", modelId: "curator"},
        store: fixture.store,
        curation: fixture.curation,
        runs: fixture.runs,
      },
      {proposals: 0, applied: 0, targets: new Set<string>()}
    );

    expect(tools.map((tool) => tool.name)).toEqual(["read_receipts", "read_steers", "read_ledger", "apply_memory_op"]);
  });
});
