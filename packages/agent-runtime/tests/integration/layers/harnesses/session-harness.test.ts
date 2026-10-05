import {mkdtemp, mkdir, readFile, rm, writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {createAgentSession, DefaultResourceLoader, SessionManager} from "@earendil-works/pi-coding-agent";
import {Effect} from "effect";
import {afterEach, describe, expect, it} from "vitest";
import type {CollaborationMode} from "@supernova/contracts/harnesses/schemas";
import {HarnessStore} from "@supernova/agent-runtime/layers/harnesses/internal/harness-store";
import {createDefaultHarness, validateHarness} from "@supernova/agent-runtime/layers/harnesses/lib/harness-config";
import {resolveSessionHarness} from "@supernova/agent-runtime/layers/harnesses/lib/session-harness";
import {compileCollaborationPreset} from "@supernova/agent-runtime/layers/harnesses/lib/collaboration-presets";
import {SessionControlsStore, readActiveSessionHarness} from "@supernova/agent-runtime/layers/session-runtime/internal/session-controls-store";
import {PiAgentSessionFactory, PiAgentSessionFactoryLive} from "@supernova/agent-runtime/layers/session-runtime/internal/pi-agent-session-factory";
import {PiSdkService} from "@supernova/agent-runtime/layers/pi-sdk";
import {createPiTestRuntime} from "@tests/support/layers/pi-session-test-utils";

const roots: string[] = [];

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "radian-session-setup-"));
  roots.push(root);
  const cwd = join(root, "project");
  await mkdir(cwd);
  const store = new HarnessStore(join(root, "harnesses"));
  const initial = await store.resolveNewSession(cwd);
  const sessionId = "test-chat";
  await store.bindSession(sessionId, initial);
  const library = await store.list();
  await store.save({...createDefaultHarness("research", "Research"), systemPrompt: "Research instruction"}, library.revision);
  return {root, cwd, store, initial, sessionId};
}

afterEach(async () => {
  for (const root of roots.splice(0)) await rm(root, {recursive: true, force: true});
});

describe("chat-local harness setup", () => {
  it("recreates the active tools and instructions from storage without applying a pending setup", async () => {
    const f = await fixture();
    const pi = await createPiTestRuntime({sessionDir: join(f.root, "sessions")});
    try {
      const {manager} = pi.createSession(f.cwd);
      const id = manager.getSessionId();
      const active = await resolveSessionHarness(f.sessionId, f.cwd, "research", "advisor", undefined, f.store);
      const pending = await resolveSessionHarness(id, f.cwd, "coding", "solo", active, f.store);
      const controls = new SessionControlsStore();
      const record = await controls.load(id, manager);
      await controls.save({
        ...record,
        harnessSnapshot: active,
        pendingHarnessSnapshot: pending,
        state: {...record.state, harness: active.selection, pendingHarness: pending.selection},
      });
      const factory = await Effect.runPromise(
        Effect.service(PiAgentSessionFactory).pipe(
          Effect.provide(PiAgentSessionFactoryLive),
          Effect.provideService(PiSdkService, {
            createAgentSession,
            SessionManager,
            modelRuntime: pi.modelRuntime,
            createResourceLoader: ({projectPath}) => new DefaultResourceLoader({cwd: projectPath, agentDir: join(f.root, "agent")}),
          })
        )
      );
      const {session} = await factory.createAgentSession({cwd: f.cwd, sessionManager: manager});
      try {
        expect(session.systemPrompt).toContain("Research instruction");
        expect(session.systemPrompt).toContain("Selected collaboration: Advisor");
        expect(session.getActiveToolNames().toSorted()).toEqual(["find", "grep", "ls", "read", "web_fetch"]);
      } finally {
        session.dispose();
      }
    } finally {
      await pi.unregister();
    }
  });

  it.each(["solo", "advisor", "compare", "fuse"] as const)("selects %s without moving the project or editing the library and original snapshot", async (mode) => {
    const f = await fixture();
    const before = await f.store.list();
    const selected = await resolveSessionHarness(f.sessionId, f.cwd, "research", mode, undefined, f.store);
    expect(selected).toMatchObject({harness: {id: "research", systemPrompt: "Research instruction"}, project: {path: f.initial.project.path}, selection: {mode}});
    expect(await f.store.list()).toEqual(before);
    expect(await f.store.forSession(f.sessionId, f.cwd)).toEqual(f.initial);
    const compiled = compileCollaborationPreset(selected);
    expect(() => validateHarness(compiled.harness)).not.toThrow();
    if (mode !== "solo") {
      expect(compiled.harness.extensions).toEqual([]);
      expect(compiled.harness.workflows?.[0]?.steps.every((step) => step.effects === "none")).toBe(true);
      expect(compiled.harness.workflows?.[0]?.limits).toEqual({maxCostUsd: 3, maxWallClockSeconds: 300});
    }
  });

  it("keeps pinned instructions when changing only the mode after the library was edited", async () => {
    const f = await fixture();
    const selected = await resolveSessionHarness(f.sessionId, f.cwd, "research", "solo", undefined, f.store);
    const library = await f.store.list();
    await f.store.save({...selected.harness, systemPrompt: "Changed later"}, library.revision);
    const changed = await resolveSessionHarness(f.sessionId, f.cwd, "research", "advisor", selected, f.store);
    expect(changed.harness.systemPrompt).toBe("Research instruction");
    expect(changed.selection?.id).not.toBe(selected.selection?.id);
  });

  it("rejects a missing harness before capturing a setup", async () => {
    const f = await fixture();
    await expect(resolveSessionHarness(f.sessionId, f.cwd, "missing", "solo", undefined, f.store)).rejects.toThrow("Harness not found");
  });

  it.each(["solo", "advisor", "compare", "fuse"] satisfies CollaborationMode[])(
    "recovers active and pending %s selections separately after a controls-store restart",
    async (mode) => {
      const f = await fixture();
      const manager = SessionManager.create(f.cwd, join(f.root, "sessions"));
      const id = manager.getSessionId();
      const active = await resolveSessionHarness(f.sessionId, f.cwd, "coding", "solo", undefined, f.store);
      const pending = await resolveSessionHarness(id, f.cwd, "research", mode, active, f.store);
      const controls = new SessionControlsStore();
      const record = await controls.load(id, manager);
      await controls.save({
        ...record,
        harnessSnapshot: active,
        pendingHarnessSnapshot: pending,
        state: {...record.state, harness: active.selection, pendingHarness: pending.selection},
      });
      const recovered = await new SessionControlsStore().load(id, manager);
      expect(recovered.harnessSnapshot).toEqual(active);
      expect(recovered.pendingHarnessSnapshot).toEqual(pending);
      expect(recovered.state).toMatchObject({queuePaused: true, harness: active.selection, pendingHarness: pending.selection});
      expect(await readActiveSessionHarness(manager.getSessionFile(), id)).toEqual(active);
      const path = `${manager.getSessionFile()}.controls.json`;
      const saved = JSON.parse(await readFile(path, "utf8"));
      await writeFile(path, JSON.stringify({...saved, state: {...saved.state, sessionId: "another-chat"}}));
      await expect(readActiveSessionHarness(manager.getSessionFile(), id)).rejects.toThrow("do not belong");
    }
  );
});
