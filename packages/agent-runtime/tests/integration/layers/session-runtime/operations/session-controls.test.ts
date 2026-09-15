import {mkdtemp, readFile, stat, writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {Effect} from "effect";
import {afterEach, describe, expect, it, vi} from "vitest";
import type {SessionControlsAction} from "@supernova/contracts/session-runtime/procedures";
import {SessionRuntimeService} from "@supernova/agent-runtime/services/session-runtime-service";
import {SessionControlsStore} from "@supernova/agent-runtime/layers/session-runtime/internal/session-controls-store";
import {AUTOMATIC_TURN_TIMEOUT_MS} from "@supernova/agent-runtime/layers/session-runtime/lib/turns/automatic-turn-limits";
import {createPiTestRuntime, fauxAssistantMessage, imageAttachment, selectedModelReference, waitUntil} from "@tests/support/layers/pi-session-test-utils";
import {cleanupTempDirs} from "@tests/support/layers/test-utils";

function deferred() {
  let resolve = () => {};
  const promise = new Promise<void>((accept) => {
    resolve = accept;
  });
  return {promise, resolve};
}

describe("server-owned session goals and queues", () => {
  const runtimes: Awaited<ReturnType<typeof createPiTestRuntime>>[] = [];
  const tempDirs: string[] = [];
  const gates: ReturnType<typeof deferred>[] = [];

  async function fixture(input?: Parameters<typeof createPiTestRuntime>[0]) {
    const sessionDir = await mkdtemp(join(tmpdir(), "pi-controls-test-"));
    tempDirs.push(sessionDir);
    const pi = await createPiTestRuntime({...input, sessionDir});
    runtimes.push(pi);
    const {info, manager} = pi.createSession();
    const controls = () => pi.runWithSessionRuntime(Effect.flatMap(Effect.service(SessionRuntimeService), (service) => service.getSessionControls(info.id)));
    const update = (action: SessionControlsAction) =>
      pi.runWithSessionRuntime(Effect.flatMap(Effect.service(SessionRuntimeService), (service) => service.updateSessionControls({sessionId: info.id, action})));
    const send = (text: string) =>
      pi.runWithSessionRuntime(
        Effect.flatMap(Effect.service(SessionRuntimeService), (service) =>
          service.sendMessage({sessionId: info.id, modelReference: selectedModelReference, contentParts: [{type: "text", text}], captureCheckpoints: false})
        )
      );
    const stop = () => pi.runWithSessionRuntime(Effect.flatMap(Effect.service(SessionRuntimeService), (service) => service.abortSession(info.id)));
    const enqueue = (text: string) => update({type: "enqueue", contentParts: [{type: "text", text}], modelReference: selectedModelReference, captureCheckpoints: false});
    const goal = (maxTurns = 10) => update({type: "start_goal", objective: "Verify the result", modelReference: selectedModelReference, captureCheckpoints: false, maxTurns});
    const gate = () => {
      const value = deferred();
      gates.push(value);
      return value;
    };
    return {pi, manager, info, controls, update, send, stop, enqueue, goal, gate};
  }

  afterEach(async () => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    for (const gate of gates.splice(0)) gate.resolve();
    for (const pi of runtimes.splice(0)) {
      await pi.runtime.dispose();
      pi.unregister();
    }
    cleanupTempDirs(tempDirs);
  });

  it("persists full queued messages and delivers them FIFO as separate checkpointed turns", async () => {
    const f = await fixture();
    const first = f.gate();
    const lastTexts: string[] = [];
    f.pi.faux.setResponses([
      async () => {
        await first.promise;
        return fauxAssistantMessage("First");
      },
      (context) => {
        lastTexts.push(JSON.stringify(context.messages.at(-1)));
        return fauxAssistantMessage("Second");
      },
      (context) => {
        lastTexts.push(JSON.stringify(context.messages.at(-1)));
        return fauxAssistantMessage("Third");
      },
    ]);
    await f.send("Initial");
    const withImage = await f.update({
      type: "enqueue",
      contentParts: [{type: "text", text: "Image next"}, imageAttachment],
      modelReference: selectedModelReference,
      captureCheckpoints: false,
    });
    const queued = await f.enqueue("Last");
    expect(queued.queue.map((item) => item.contentParts[0])).toEqual([
      {type: "text", text: "Image next"},
      {type: "text", text: "Last"},
    ]);
    expect(withImage.queue[0]).toMatchObject({modelReference: selectedModelReference, captureCheckpoints: false, contentParts: [expect.anything(), imageAttachment]});
    const saved = JSON.parse(await readFile(`${f.manager.getSessionFile()}.controls.json`, "utf8"));
    expect(saved.state.queue).toHaveLength(2);
    expect((await stat(`${f.manager.getSessionFile()}.controls.json`)).mode & 0o777).toBe(0o600);
    first.resolve();
    await waitUntil(async () => {
      expect(f.pi.faux.state.callCount).toBe(3);
      expect((await f.controls()).queue).toEqual([]);
      expect(f.manager.getBranch().filter((entry) => entry.type === "custom" && entry.customType === "supernova.checkpoint")).toHaveLength(6);
    });
    expect(lastTexts[0]).toContain("Image next");
    expect(lastTexts[0]).toContain(imageAttachment.contentBase64);
    expect(lastTexts[1]).toContain("Last");
  });

  it("pauses only queued work while the current turn finishes, retaining edits until explicit resume", async () => {
    const f = await fixture();
    const held = f.gate();
    f.pi.faux.setResponses([
      async () => {
        await held.promise;
        return fauxAssistantMessage("Current finished");
      },
      fauxAssistantMessage("Queued finished"),
    ]);
    await f.send("Current");
    const queued = await f.enqueue("Next");
    await expect(f.update({type: "edit_queued", id: queued.queue[0]!.id, text: "Revised", expectedRevision: queued.revision})).rejects.toThrow("Pause the queue");
    const paused = await f.update({type: "pause_queue"});
    await f.update({type: "edit_queued", id: queued.queue[0]!.id, text: "Revised", expectedRevision: paused.revision});
    held.resolve();
    await waitUntil(() => expect(f.manager.getBranch().filter((entry) => entry.type === "custom" && entry.customType === "supernova.checkpoint")).toHaveLength(2));
    expect((await f.controls()).queue).toHaveLength(1);
    expect(f.pi.faux.state.callCount).toBe(1);
    await f.update({type: "resume_queue"});
    await waitUntil(() => expect(f.pi.faux.state.callCount).toBe(2));
  });

  it("edits and reorders saved queue entries without dropping attachments, then delivers the new order once", async () => {
    const f = await fixture();
    await f.stop();
    await f.update({type: "enqueue", contentParts: [{type: "text", text: "Original"}, imageAttachment], modelReference: selectedModelReference, captureCheckpoints: false});
    const initial = await f.enqueue("Second");
    const firstId = initial.queue[0]!.id;
    const secondId = initial.queue[1]!.id;
    const edited = await f.update({type: "edit_queued", id: firstId, text: "Revised", expectedRevision: initial.revision});
    expect(edited.queue[0]!.contentParts).toEqual([{type: "text", text: "Revised"}, imageAttachment]);
    await expect(f.update({type: "edit_queued", id: firstId, text: "Stale", expectedRevision: initial.revision})).rejects.toThrow("changed");
    const reordered = await f.update({type: "move_queued", id: secondId, direction: "up", expectedRevision: edited.revision});
    expect(reordered.queue.map((message) => message.id)).toEqual([secondId, firstId]);
    expect((await new SessionControlsStore().load(f.info.id, f.manager)).state.queue).toEqual(reordered.queue);
    await expect(f.update({type: "move_queued", id: secondId, direction: "up", expectedRevision: reordered.revision})).rejects.toThrow();
    const delivered: string[] = [];
    f.pi.faux.setResponses(
      [0, 1].map(() => (context) => {
        delivered.push(JSON.stringify(context.messages.at(-1)));
        return fauxAssistantMessage("Delivered");
      })
    );
    await f.update({type: "resume_queue"});
    await waitUntil(async () => expect((await f.controls()).queue).toEqual([]));
    await waitUntil(() => expect(delivered).toHaveLength(2));
    expect(delivered[0]).toContain("Second");
    expect(delivered[1]).toContain("Revised");
    expect(delivered[1]).toContain(imageAttachment.contentBase64);
    await expect(f.update({type: "edit_queued", id: firstId, text: "Too late", expectedRevision: (await f.controls()).revision})).rejects.toThrow();
  });

  it("never dispatches queued work between prompt completion and after-turn checkpoint commitment", async () => {
    const checkpoint = deferred();
    const reached = deferred();
    gates.push(checkpoint);
    let captures = 0;
    const f = await fixture({
      checkpointStore: {
        capture: async () => {
          captures++;
          if (captures === 2) {
            reached.resolve();
            await checkpoint.promise;
          }
        },
        restore: async () => {},
        deleteSession: async () => {},
      },
    });
    f.pi.faux.setResponses([fauxAssistantMessage("Done"), fauxAssistantMessage("Queued answer")]);
    await f.pi.runWithSessionRuntime(
      Effect.flatMap(Effect.service(SessionRuntimeService), (service) =>
        service.sendMessage({sessionId: f.info.id, modelReference: selectedModelReference, contentParts: [{type: "text", text: "First"}]})
      )
    );
    await reached.promise;
    await f.enqueue("Second");
    expect(f.pi.faux.state.callCount).toBe(1);
    expect((await f.controls()).queue).toHaveLength(1);
    checkpoint.resolve();
    await waitUntil(() => expect(f.pi.faux.state.callCount).toBe(2));
  });

  it("removes only pending messages and cannot promote or dispatch a removed item", async () => {
    const f = await fixture();
    await f.stop();
    const state = await f.enqueue("Remove me");
    await f.update({type: "remove_queued", id: state.queue[0]!.id});
    await expect(f.update({type: "steer_queued", id: state.queue[0]!.id})).rejects.toThrow("not found");
    await f.update({type: "resume_queue"});
    expect((await f.controls()).queue).toEqual([]);
    expect(f.pi.faux.state.callCount).toBe(0);
  });

  it("promotes queued work once into the current run, preserving images", async () => {
    const f = await fixture();
    const first = f.gate();
    let steered = "";
    f.pi.faux.setResponses([
      async () => {
        await first.promise;
        return fauxAssistantMessage("Working");
      },
      (context) => {
        steered = JSON.stringify(context.messages);
        return fauxAssistantMessage("Steered");
      },
    ]);
    await f.send("First");
    const queued = await f.update({type: "enqueue", contentParts: [{type: "text", text: "Focus here"}, imageAttachment], modelReference: selectedModelReference});
    const id = queued.queue[0]!.id;
    expect((await f.update({type: "steer_queued", id})).queue).toEqual([]);
    await expect(f.update({type: "steer_queued", id})).rejects.toThrow("not found");
    first.resolve();
    await waitUntil(() => expect(steered).toContain("Focus here"));
    expect(steered).toContain(imageAttachment.contentBase64);
    expect(f.pi.faux.state.callCount).toBe(2);
  });

  it("recovers accepted but undelivered steering before stop clears Pi's queue", async () => {
    const f = await fixture();
    const first = f.gate();
    f.pi.faux.setResponses([
      async () => {
        await first.promise;
        return fauxAssistantMessage("Aborted");
      },
    ]);
    await f.send("First");
    const queued = await f.enqueue("Preserve this correction");
    await f.update({type: "steer_queued", id: queued.queue[0]!.id});
    const stopped = f.stop();
    first.resolve();
    await stopped;
    await waitUntil(async () => expect((await f.controls()).queue).toEqual(queued.queue));
    expect((await f.controls()).queuePaused).toBe(true);
    expect(f.pi.faux.state.callCount).toBe(1);
  });

  it.each(["pause_goal", "stop"] as const)("%s suppresses goal continuation without losing the objective", async (action) => {
    const f = await fixture();
    const first = f.gate();
    f.pi.faux.setResponses([
      async () => {
        await first.promise;
        return fauxAssistantMessage("Partial");
      },
    ]);
    await f.goal();
    await waitUntil(() => expect(f.pi.faux.state.callCount).toBe(1));
    const stopped = action === "stop" ? f.stop() : f.update({type: "pause_goal"});
    first.resolve();
    await stopped;
    await waitUntil(async () => expect((await f.controls()).goal).toMatchObject({status: "paused", objective: "Verify the result", turnsUsed: 1}));
    f.pi.faux.setResponses([fauxAssistantMessage("Resumed")]);
    await f.update({type: "resume_goal"});
    await waitUntil(() => expect(f.pi.faux.state.callCount).toBeGreaterThanOrEqual(2));
    await f.update({type: "pause_goal"});
  });

  it("stops at the cumulative goal turn limit and refuses an unbounded resume", async () => {
    const f = await fixture();
    f.pi.faux.setResponses([fauxAssistantMessage("Progress 1"), fauxAssistantMessage("Progress 2")]);
    await f.goal(2);
    await waitUntil(async () => expect((await f.controls()).goal).toMatchObject({status: "paused", turnsUsed: 2, maxTurns: 2}));
    expect(f.pi.faux.state.callCount).toBe(2);
    await expect(f.update({type: "resume_goal"})).rejects.toThrow("turn limit");
  });

  it("edits a running goal at the next boundary and rejects the superseded result", async () => {
    const f = await fixture();
    const first = f.gate();
    let oldId = "";
    let revisedPrompt = "";
    f.pi.faux.setResponses([
      async () => {
        await first.promise;
        return fauxAssistantMessage([{type: "toolCall", id: "old-result", name: "report_goal_result", arguments: {goalId: oldId, status: "completed", summary: "Old work done"}}], {
          stopReason: "toolUse",
        });
      },
      fauxAssistantMessage("Old response finished"),
      (context) => {
        revisedPrompt = JSON.stringify(context.messages.at(-1));
        return fauxAssistantMessage("Revised work done");
      },
    ]);
    oldId = (await f.goal(1)).goal!.id;
    await waitUntil(() => expect(f.pi.faux.state.callCount).toBe(1));
    const revised = await f.update({
      type: "update_goal",
      id: oldId,
      objective: "Verify the corrected objective",
      modelReference: selectedModelReference,
      captureCheckpoints: false,
    });
    expect(revised.goal).toMatchObject({objective: "Verify the corrected objective", status: "active", turnsUsed: 0, maxTurns: 1});
    expect(revised.goal!.id).not.toBe(oldId);
    expect(f.pi.faux.state.callCount).toBe(1);
    await expect(f.update({type: "update_goal", id: oldId, objective: "Stale browser edit", modelReference: selectedModelReference})).rejects.toThrow("goal changed");
    first.resolve();
    await waitUntil(async () => expect((await f.controls()).goal).toMatchObject({id: revised.goal!.id, status: "paused", turnsUsed: 1}));
    expect(revisedPrompt).toContain("Verify the corrected objective");
    expect(f.pi.faux.state.callCount).toBe(3);
  });

  it.each(["pause_goal", "complete_goal"] as const)("edits and resubmits a goal after %s without clearing it", async (type) => {
    const f = await fixture();
    const first = f.gate();
    f.pi.faux.setResponses([
      async () => {
        await first.promise;
        return fauxAssistantMessage("First");
      },
      fauxAssistantMessage("Updated"),
    ]);
    const initial = await f.goal(1);
    await waitUntil(() => expect(f.pi.faux.state.callCount).toBe(1));
    await f.update({type});
    const result = await f.update({type: "update_goal", id: initial.goal!.id, objective: "Updated objective", modelReference: selectedModelReference, captureCheckpoints: false});
    expect(result.goal).toMatchObject({objective: "Updated objective", status: "active", createdAt: initial.goal!.createdAt});
    first.resolve();
    await waitUntil(async () => expect((await f.controls()).goal).toMatchObject({status: "paused", turnsUsed: 1}));
    expect(f.pi.faux.state.callCount).toBe(2);
  });

  it("promotes a queued correction after Pi finishes and delivers it first exactly once", async () => {
    const checkpoint = deferred();
    const reached = deferred();
    gates.push(checkpoint);
    let captures = 0;
    const f = await fixture({
      checkpointStore: {
        capture: async () => {
          if (++captures === 2) {
            reached.resolve();
            await checkpoint.promise;
          }
        },
        restore: async () => {},
        deleteSession: async () => {},
      },
    });
    const delivered: string[] = [];
    f.pi.faux.setResponses([
      fauxAssistantMessage("First"),
      (context) => {
        delivered.push(JSON.stringify(context.messages.at(-1)));
        return fauxAssistantMessage("Correction");
      },
      (context) => {
        delivered.push(JSON.stringify(context.messages.at(-1)));
        return fauxAssistantMessage("Ordinary");
      },
    ]);
    await f.pi.runWithSessionRuntime(
      Effect.flatMap(Effect.service(SessionRuntimeService), (service) =>
        service.sendMessage({sessionId: f.info.id, modelReference: selectedModelReference, contentParts: [{type: "text", text: "First"}]})
      )
    );
    await reached.promise;
    await f.enqueue("Ordinary queued work");
    const queued = await f.enqueue("Correction at next opportunity");
    const id = queued.queue[1]!.id;
    const promoted = await f.update({type: "steer_queued", id});
    expect(promoted.queue.map((message) => message.id)).toEqual([id, queued.queue[0]!.id]);
    checkpoint.resolve();
    await waitUntil(async () => {
      expect((await f.controls()).queue).toEqual([]);
      expect(f.pi.faux.state.callCount).toBe(3);
    });
    expect(delivered[0]).toContain("Correction at next opportunity");
    expect(delivered[1]).toContain("Ordinary queued work");
  });

  it("pauses the queue and blocks the goal on a settled provider error", async () => {
    const f = await fixture({settings: {retry: {enabled: false}}});
    const first = f.gate();
    f.pi.faux.setResponses([
      async () => {
        await first.promise;
        return fauxAssistantMessage("", {stopReason: "error", errorMessage: "Provider guardrail configuration rejected"});
      },
    ]);
    await f.goal();
    await waitUntil(() => expect(f.pi.faux.state.callCount).toBe(1));
    await f.enqueue("Must wait");
    first.resolve();
    await waitUntil(async () =>
      expect(await f.controls()).toMatchObject({queuePaused: true, goal: {status: "blocked", message: expect.stringContaining("guardrail")}, queue: [expect.anything()]})
    );
    expect(f.pi.faux.state.callCount).toBe(1);
  });

  it("aborts a hanging goal turn at the wall-clock deadline", async () => {
    const f = await fixture();
    const first = f.gate();
    let signal: AbortSignal | undefined;
    f.pi.faux.setResponses([
      async (_context, options) => {
        signal = options?.signal;
        await first.promise;
        return fauxAssistantMessage("Partial");
      },
    ]);
    vi.useFakeTimers({toFake: ["setTimeout", "clearTimeout"]});
    await f.goal();
    // Real polling lets dispatch reach the provider before advancing the actual timeout under test.
    await vi.waitFor(() => expect(f.pi.faux.state.callCount).toBe(1));
    await vi.advanceTimersByTimeAsync(AUTOMATIC_TURN_TIMEOUT_MS);
    expect(signal?.aborted).toBe(true);
    first.resolve();
    vi.useRealTimers();
    await waitUntil(async () => expect((await f.controls()).goal).toMatchObject({status: "blocked", message: expect.stringContaining("time limit")}));
  });

  it.each(["completed", "blocked"] as const)("records explicit agent-reported %s through the real tool", async (status) => {
    const f = await fixture();
    let goalId = "";
    const first = f.gate();
    f.pi.faux.setResponses([
      async (context) => {
        expect(context.tools?.some((tool) => tool.name === "report_goal_result")).toBe(true);
        await first.promise;
        return fauxAssistantMessage(
          [{type: "toolCall", id: "goal-result-1", name: "report_goal_result", arguments: {goalId, status, summary: "Tests checked; reported result."}}],
          {stopReason: "toolUse"}
        );
      },
      fauxAssistantMessage("Final summary"),
    ]);
    goalId = (await f.goal()).goal!.id;
    first.resolve();
    await waitUntil(async () => expect((await f.controls()).goal).toMatchObject({status, message: `Agent-reported ${status}: Tests checked; reported result.`}));
    expect((await f.controls()).goal?.turnsUsed).toBe(1);
  });

  it("rejects unknown sessions and wrong-owner persisted controls", async () => {
    const f = await fixture();
    await expect(f.pi.runWithSessionRuntime(Effect.flatMap(Effect.service(SessionRuntimeService), (service) => service.getSessionControls("missing")))).rejects.toThrow(
      "Session not found"
    );
    const state = await f.controls();
    await writeFile(`${f.manager.getSessionFile()}.controls.json`, JSON.stringify({state: {...state, sessionId: "someone-else"}, steering: []}));
    await expect(new SessionControlsStore().load(f.info.id, f.manager)).rejects.toThrow("do not belong");
  });

  it("recovers active goals paused and ambiguous deliveries uncertain, preserving original contents", async () => {
    const f = await fixture();
    await f.stop();
    const state = await f.enqueue("Maybe delivered");
    const store = new SessionControlsStore();
    const record = await store.load(f.info.id, f.manager);
    await store.save({
      ...record,
      inFlight: state.queue[0],
      state: {
        ...record.state,
        goal: {
          id: "g1",
          objective: "Resume carefully",
          status: "active",
          turnsUsed: 1,
          maxTurns: 10,
          modelReference: selectedModelReference,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      },
    });
    const recovered = await new SessionControlsStore().load(f.info.id, f.manager);
    expect(recovered.state).toMatchObject({
      queuePaused: true,
      goal: {status: "paused", turnsUsed: 1},
      queue: [{id: state.queue[0]!.id, deliveryStatus: "uncertain", contentParts: state.queue[0]!.contentParts}],
    });
    expect(f.pi.faux.state.callCount).toBe(0);
  });

  it("fails closed on durable write failure and keeps the last saved queue intact", async () => {
    const f = await fixture();
    await f.stop();
    const saved = await f.enqueue("Keep me");
    const write = vi.spyOn(SessionControlsStore.prototype, "save").mockRejectedValueOnce(new Error("Disk full"));
    await expect(f.enqueue("Not accepted")).rejects.toThrow("Disk full");
    write.mockRestore();
    expect(await f.controls()).toMatchObject({queue: saved.queue, queuePaused: true, error: expect.stringContaining("could not be saved")});
    await expect(f.update({type: "resume_queue"})).rejects.toThrow("could not be saved");
    expect(JSON.parse(await readFile(`${f.manager.getSessionFile()}.controls.json`, "utf8")).state.queue).toEqual(saved.queue);
    expect(f.pi.faux.state.callCount).toBe(0);
  });

  it("never replays a delivery whose acceptance receipt could not be saved", async () => {
    const f = await fixture();
    await f.stop();
    const queued = await f.enqueue("Deliver once");
    const first = f.gate();
    const entered = f.gate();
    f.pi.faux.setResponses([
      async () => {
        entered.resolve();
        await first.promise;
        return fauxAssistantMessage("Delivered");
      },
    ]);
    const save = SessionControlsStore.prototype.save;
    let deliveryStarted = false;
    vi.spyOn(SessionControlsStore.prototype, "save").mockImplementation(async function (this: SessionControlsStore, record) {
      if (record.inFlight) deliveryStarted = true;
      if (deliveryStarted && !record.inFlight && record.state.queue.length === 0) {
        await entered.promise;
        throw new Error("Receipt disk failure");
      }
      await save.call(this, record);
    });
    await f.update({type: "resume_queue"});
    await waitUntil(async () =>
      expect(await f.controls()).toMatchObject({
        error: expect.stringContaining("Delivery may be uncertain"),
        queuePaused: true,
        queue: [{id: queued.queue[0]!.id, deliveryStatus: "uncertain"}],
      })
    );
    expect(f.pi.faux.state.callCount).toBe(1);
    await expect(f.update({type: "resume_queue"})).rejects.toThrow("Delivery may be uncertain");
    first.resolve();
    vi.restoreAllMocks();
    const recovered = await new SessionControlsStore().load(f.info.id, f.manager);
    expect(recovered.state.queue).toMatchObject([{id: queued.queue[0]!.id, deliveryStatus: "uncertain"}]);
    expect(f.pi.faux.state.callCount).toBe(1);
  });

  it("keeps the queued message when steering loses a race with turn completion", async () => {
    const f = await fixture();
    await f.stop();
    const queued = await f.enqueue("Too late to steer");
    await expect(f.update({type: "steer_queued", id: queued.queue[0]!.id})).rejects.toThrow("not accepting steering");
    expect((await f.controls()).queue).toEqual(queued.queue);
    expect(f.pi.faux.state.callCount).toBe(0);
  });

  it("rejects stale goal reports and bounds repeated tool calls within one app turn", async () => {
    const f = await fixture();
    f.pi.faux.setResponses(
      Array.from({length: 55}, (_, index) =>
        fauxAssistantMessage(
          [{type: "toolCall", id: `invalid-report-${index}`, name: "report_goal_result", arguments: {goalId: "stale-goal", status: "completed", summary: "Not this goal"}}],
          {stopReason: "toolUse"}
        )
      )
    );
    await f.goal();
    await waitUntil(async () => expect((await f.controls()).goal).toMatchObject({status: "blocked", turnsUsed: 1, message: expect.stringContaining("model-turn limit")}), {
      timeoutMs: 15_000,
    });
    expect(f.pi.faux.state.callCount).toBeLessThanOrEqual(50);
  });

  it.each([0, 51, 1.5, -1])("rejects invalid goal maxTurns %s before starting work", async (maxTurns) => {
    const f = await fixture();
    await expect(f.goal(maxTurns)).rejects.toThrow("between 1 and 50");
    expect((await f.controls()).goal).toBeNull();
    expect(f.pi.faux.state.callCount).toBe(0);
  });

  it("requires explicit review of uncertain work and explicit goal resume after runtime replacement", async () => {
    const f = await fixture();
    await f.stop();
    const queued = await f.enqueue("Uncertain previous delivery");
    await f.pi.runWithSessionRuntime(Effect.flatMap(Effect.service(SessionRuntimeService), (service) => service.releaseSession(f.info.id)));
    const crashedStore = new SessionControlsStore();
    const record = await crashedStore.load(f.info.id, f.manager);
    await crashedStore.save({
      ...record,
      inFlight: queued.queue[0],
      state: {
        ...record.state,
        goal: {
          id: "recovered-goal",
          objective: "Continue only after review",
          status: "active",
          turnsUsed: 1,
          maxTurns: 2,
          modelReference: selectedModelReference,
          captureCheckpoints: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      },
    });
    expect(await f.controls()).toMatchObject({queuePaused: true, goal: {status: "paused"}, queue: [{deliveryStatus: "uncertain"}]});
    await expect(f.update({type: "resume_queue"})).rejects.toThrow("uncertain");
    const recoveredRevision = (await f.controls()).revision;
    await expect(f.update({type: "edit_queued", id: queued.queue[0]!.id, text: "Unsafe retry", expectedRevision: recoveredRevision})).rejects.toThrow("uncertain");
    await expect(f.update({type: "move_queued", id: queued.queue[0]!.id, direction: "down", expectedRevision: recoveredRevision})).rejects.toThrow("uncertain");
    await expect(f.update({type: "steer_queued", id: queued.queue[0]!.id})).rejects.toThrow("uncertain");
    expect(f.pi.faux.state.callCount).toBe(0);
    await f.update({type: "remove_queued", id: queued.queue[0]!.id});
    f.pi.faux.setResponses([fauxAssistantMessage("Continued after review")]);
    await f.update({type: "resume_goal"});
    await waitUntil(async () => expect((await f.controls()).goal).toMatchObject({status: "paused", turnsUsed: 2}));
    expect(f.pi.faux.state.callCount).toBe(1);
    expect((await f.controls()).queue).toEqual([]);
  });

  it("keeps controls inspectable when agent/provider configuration prevents startup", async () => {
    const f = await fixture();
    vi.spyOn(f.pi.agentSessionFactory, "createAgentSession").mockRejectedValue(new Error("Provider configuration rejected"));
    await f.goal();
    await waitUntil(async () => expect((await f.controls()).goal).toMatchObject({status: "blocked", message: "Provider configuration rejected"}));
    expect(f.pi.faux.state.callCount).toBe(0);
    await f.update({type: "clear_goal"});
    expect((await f.controls()).goal).toBeNull();
  });
});
