import {mkdir, readFile, writeFile} from "node:fs/promises";
import {join} from "node:path";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {HarnessRunStore} from "@supernova/agent-runtime/layers/harnesses/internal/harness-run-store";
import type {PiSessionRuntime} from "@supernova/agent-runtime/layers/session-runtime/internal/pi-session-runtime";
import {steerSession} from "@supernova/agent-runtime/layers/session-runtime/operations/steer-session";
import {createCuratorFixture, writeReceipt} from "@tests/support/layers/curator-test-utils";
import type {CuratorFixture} from "@tests/support/layers/curator-test-utils";

describe("steer log", () => {
  let fixture: CuratorFixture;
  beforeEach(async () => {
    fixture = await createCuratorFixture();
  });
  afterEach(async () => {
    await fixture.cleanup();
  });

  it("records every steer beside the chat's receipts, newest first", async () => {
    await fixture.runs.appendSteer("chat-1", "Stop rewriting the plan", "2026-09-10T09:00:00.000Z");
    await fixture.runs.appendSteer("chat-1", "Cite the source", "2026-09-10T10:00:00.000Z");
    await fixture.runs.appendSteer("chat-2", "Different chat", "2026-09-10T11:00:00.000Z");

    expect((await fixture.runs.listSteers("chat-1")).map((steer) => steer.text)).toEqual(["Cite the source", "Stop rewriting the plan"]);
    expect(await fixture.runs.listSteers("chat-3")).toEqual([]);
    const lines = (await readFile(join(fixture.root, "config", "runs", "chat-1", "steers.jsonl"), "utf8")).trim().split("\n");
    expect(lines.map((line) => JSON.parse(line))).toEqual([
      {chatId: "chat-1", at: "2026-09-10T09:00:00.000Z", text: "Stop rewriting the plan"},
      {chatId: "chat-1", at: "2026-09-10T10:00:00.000Z", text: "Cite the source"},
    ]);
  });

  it("skips a damaged or foreign line instead of hiding the steers around it", async () => {
    const directory = join(fixture.root, "config", "runs", "chat-1");
    await mkdir(directory, {recursive: true});
    await writeFile(
      join(directory, "steers.jsonl"),
      ["not json", '{"chatId":"chat-1","at":"2026-09-10T09:00:00.000Z","text":"Kept"}', '{"chatId":"other","at":"2026-09-10T09:30:00.000Z","text":"Foreign"}', ""].join("\n")
    );

    expect((await fixture.runs.listSteers("chat-1")).map((steer) => steer.text)).toEqual(["Kept"]);
  });

  it("groups a project's steers through the chat's pinned project", async () => {
    const snapshot = await fixture.store.resolveProject(fixture.projectId);
    await fixture.store.bindSession("chat-1", snapshot);
    await fixture.runs.appendSteer("chat-1", "In the project", "2026-09-10T10:00:00.000Z");
    await fixture.runs.appendSteer("chat-unbound", "No project of its own", "2026-09-10T11:00:00.000Z");

    expect((await fixture.runs.listSteersForProject({id: fixture.projectId})).map((steer) => steer.text)).toEqual(["In the project"]);
    expect((await fixture.runs.listSteersForProject({path: fixture.projectPath})).map((steer) => steer.text)).toEqual(["In the project"]);
    expect(await fixture.runs.listSteersForProject({id: "other"})).toEqual([]);
  });

  it("falls back to the project a chat's receipts name", async () => {
    await writeReceipt(fixture.runs, {chatId: "chat-legacy", projectId: fixture.projectId, projectPath: fixture.projectPath});
    await fixture.runs.appendSteer("chat-legacy", "Recorded anyway");

    expect((await fixture.runs.listSteersForProject({id: fixture.projectId})).map((steer) => steer.text)).toEqual(["Recorded anyway"]);
  });

  it("forwards the steer, records it for a harness chat and never fails the steer when the log cannot be written", async () => {
    const runtime = {steer: vi.fn(async (text: string) => text)} as unknown as PiSessionRuntime;
    await fixture.store.bindSession("chat-1", await fixture.store.resolveProject(fixture.projectId));
    await steerSession(runtime, {sessionId: "chat-1", text: "Use the newer source"}, fixture.runs);

    expect(runtime.steer).toHaveBeenCalledWith("Use the newer source", undefined);
    expect((await fixture.runs.listSteers("chat-1")).map((steer) => steer.text)).toEqual(["Use the newer source"]);

    // A chat outside every harness project has no instructions to curate, so nothing is kept for it.
    await steerSession(runtime, {sessionId: "chat-unknown", text: "Nowhere to file this"}, fixture.runs);
    expect(await fixture.runs.listSteers("chat-unknown")).toEqual([]);

    const broken = {appendSteer: vi.fn(async () => Promise.reject(new Error("disk full")))} as unknown as HarnessRunStore;
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    await expect(steerSession(runtime, {sessionId: "chat-1", text: "Still delivered"}, broken)).resolves.toBe("Still delivered");
    expect(runtime.steer).toHaveBeenCalledWith("Still delivered", undefined);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
