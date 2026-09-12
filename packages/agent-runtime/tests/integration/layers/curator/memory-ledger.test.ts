import {existsSync} from "node:fs";
import {readFile} from "node:fs/promises";
import {join} from "node:path";
import {afterEach, beforeEach, describe, expect, it} from "vitest";
import {appendMemoryTransition, latestMemoryRecords, readMemoryEvents} from "@supernova/agent-runtime/layers/curator/lib/memory-ledger";
import type {MemoryEvent} from "@supernova/agent-runtime/layers/curator/lib/memory-ledger";
import {createCuratorFixture, writeLedger} from "@tests/support/layers/curator-test-utils";
import type {CuratorFixture} from "@tests/support/layers/curator-test-utils";

/**
 * The memory extension owns this format. The first tests pin the exact bytes the curator appends; the last one
 * reads the result back with the extension's own reader and audit, and is skipped where that checkout is absent.
 */
const extensionCore = "/Users/philippcarlvictorstrieder/Developer/pi-scientific-tools/extensions/memory/core.ts";

interface ExtensionReader {
  readMemoryLedger: (cwd: string) => Promise<{events: {record: {recordId: string; epistemicState: string; supersededBy?: string}}[]; rejected: unknown[]}>;
  materializeMemory: (events: unknown[]) => Map<string, {record: {recordId: string; epistemicState: string; supersededBy?: string}; eventCount: number; ledgerLine: number}>;
  memoryStatus: (cwd: string) => Promise<{recordCount: number; eventCount: number; findings: unknown[]; countsByState: Record<string, number>}>;
}

const actor = {modelProvider: "pi-plus", modelId: "curator", sessionId: "review-1"};

describe("memory ledger transitions", () => {
  let fixture: CuratorFixture;
  let ledger: string;
  beforeEach(async () => {
    fixture = await createCuratorFixture();
    ledger = await writeLedger(fixture.projectPath, [
      {recordId: "C-1", statement: "Fermentation stalls below 14 degrees."},
      {recordId: "C-2", statement: "Fermentation stalls below 12 degrees, measured twice."},
    ]);
  });
  afterEach(async () => {
    await fixture.cleanup();
  });

  it("appends one transition event, keeps the record's fields and rebuilds the index", async () => {
    const event = await appendMemoryTransition(fixture.projectPath, {recordId: "C-1", nextState: "supersede", reason: "Duplicate of C-2.", supersededBy: "C-2"}, actor);

    expect(event.schemaVersion).toBe(1);
    expect(event.action).toBe("transition");
    expect(event.reason).toBe("Duplicate of C-2.");
    expect(event.actor).toEqual(actor);
    expect(event.eventId).toMatch(/^SME-\d{8}T\d{6}Z-[0-9a-f]{8}$/);
    expect(event.record.epistemicState).toBe("superseded");
    expect(event.record.supersededBy).toBe("C-2");
    // The statement, kind, certainty, evidence and creation metadata are carried over untouched.
    expect(event.record.statement).toBe("Fermentation stalls below 14 degrees.");
    expect(event.record.createdAt).toBe("2026-09-01T10:00:00.000Z");
    expect(event.record.evidence).toEqual([{kind: "source", ref: "doi:10.1000/example"}]);
    expect(event.record.updatedAt).not.toBe(event.record.createdAt);

    const lines = (await readFile(ledger, "utf8")).split("\n");
    expect(lines[3]).toBe("");
    expect(JSON.parse(lines[2]!)).toEqual(event);

    const index = JSON.parse(await readFile(join(fixture.projectPath, ".science-memory", "index.json"), "utf8")) as {
      schemaVersion: number;
      eventCount: number;
      recordCount: number;
      records: {recordId: string; epistemicState: string; ledgerLine: number; eventCount: number}[];
    };
    expect(index.schemaVersion).toBe(1);
    expect(index.eventCount).toBe(3);
    expect(index.recordCount).toBe(2);
    expect(index.records.map((record) => [record.recordId, record.epistemicState, record.ledgerLine, record.eventCount])).toEqual([
      ["C-1", "superseded", 3, 2],
      ["C-2", "reported", 2, 1],
    ]);
    // The extension's own directory furniture, written the same way and only when missing.
    expect(existsSync(join(fixture.projectPath, ".science-memory", "README.md"))).toBe(true);
    expect(await readFile(join(fixture.projectPath, ".science-memory", ".gitignore"), "utf8")).toContain("index.json");
    expect(existsSync(join(fixture.projectPath, ".science-memory", ".ledger.lock"))).toBe(false);
  });

  it("retracts without a successor and keeps the ledger readable", async () => {
    const event = await appendMemoryTransition(fixture.projectPath, {recordId: "C-2", nextState: "retract", reason: "Measurement was withdrawn."}, actor);

    expect(event.record.epistemicState).toBe("retracted");
    expect(event.record.supersededBy).toBeUndefined();
    const state = latestMemoryRecords(await readMemoryEvents(fixture.projectPath));
    expect(state.get("C-2")?.record.epistemicState).toBe("retracted");
    expect(state.get("C-1")?.record.epistemicState).toBe("reported");
  });

  it("applies the extension's own transition rules", async () => {
    await expect(appendMemoryTransition(fixture.projectPath, {recordId: "C-9", nextState: "retract", reason: "Not there at all."}, actor)).rejects.toThrow(
      "Unknown scientific-memory record: C-9"
    );
    await expect(appendMemoryTransition(fixture.projectPath, {recordId: "C-1", nextState: "supersede", reason: "No successor named."}, actor)).rejects.toThrow(
      "A superseded record requires supersededBy"
    );
    await expect(appendMemoryTransition(fixture.projectPath, {recordId: "C-1", nextState: "supersede", reason: "Itself.", supersededBy: "C-1"}, actor)).rejects.toThrow(
      "different existing scientific-memory record"
    );
    await expect(appendMemoryTransition(fixture.projectPath, {recordId: "C-1", nextState: "retract", reason: "no"}, actor)).rejects.toThrow("at least 5 characters");
    expect(await readMemoryEvents(fixture.projectPath)).toHaveLength(2);

    await appendMemoryTransition(fixture.projectPath, {recordId: "C-1", nextState: "supersede", reason: "Duplicate of C-2.", supersededBy: "C-2"}, actor);
    await expect(appendMemoryTransition(fixture.projectPath, {recordId: "C-1", nextState: "retract", reason: "Already terminal."}, actor)).rejects.toThrow(
      "Terminal scientific-memory record cannot transition"
    );
    // A supersession chain that would close back on itself leaves no live record to read.
    await expect(appendMemoryTransition(fixture.projectPath, {recordId: "C-2", nextState: "supersede", reason: "Cycle back.", supersededBy: "C-1"}, actor)).rejects.toThrow(
      "supersession cycle"
    );
  });

  it.skipIf(!existsSync(extensionCore))("is read back by the memory extension's own reader and audit", async () => {
    const appended: MemoryEvent = await appendMemoryTransition(
      fixture.projectPath,
      {recordId: "C-1", nextState: "supersede", reason: "Duplicate of C-2.", supersededBy: "C-2"},
      actor
    );
    const core = (await import(/* @vite-ignore */ extensionCore)) as ExtensionReader;

    const {events, rejected} = await core.readMemoryLedger(fixture.projectPath);
    expect(rejected).toEqual([]);
    expect(events).toHaveLength(3);
    const state = core.materializeMemory(events);
    expect(state.get("C-1")?.record.epistemicState).toBe("superseded");
    expect(state.get("C-1")?.record.supersededBy).toBe(appended.record.supersededBy);
    expect(state.get("C-1")?.eventCount).toBe(2);
    const status = await core.memoryStatus(fixture.projectPath);
    expect(status.findings).toEqual([]);
    expect(status.recordCount).toBe(2);
    expect(status.countsByState).toEqual({superseded: 1, reported: 1});
  });
});
