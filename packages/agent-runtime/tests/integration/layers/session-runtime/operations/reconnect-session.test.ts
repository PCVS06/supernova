import {Effect, Fiber, Stream} from "effect";
import {expect, it, vi} from "vitest";
import type {SessionStreamEvent} from "@supernova/contracts/session-runtime/procedures";
import {SessionRuntimeService} from "@supernova/agent-runtime/services/session-runtime-service";
import {createPiTestRuntime, fauxAssistantMessage, selectedModelReference} from "@tests/support/layers/pi-session-test-utils";

it("reconnects to a held first turn without exposing it as committed or losing its title", async () => {
  const pi = await createPiTestRuntime();
  const {info} = pi.createSession();
  let release!: () => void;
  let entered!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  const started = new Promise<void>((resolve) => {
    entered = resolve;
  });
  pi.faux.setResponses([
    async () => {
      entered();
      await held;
      return fauxAssistantMessage("Done");
    },
  ]);
  const service = await pi.runWithSessionRuntime(Effect.service(SessionRuntimeService));
  const events: SessionStreamEvent[] = [];
  let watcher: ReturnType<typeof pi.runtime.runFork> | undefined;
  try {
    await pi.runtime.runPromise(
      service.sendMessage({sessionId: info.id, contentParts: [{type: "text", text: "Held first turn"}], modelReference: selectedModelReference, captureCheckpoints: false})
    );
    await started;
    watcher = pi.runtime.runFork(Stream.runForEach(service.watchEvents(), (event) => Effect.sync(() => events.push(event))));
    await vi.waitFor(
      () => {
        expect(events.some((event) => event.type === "session.agent.started" && event.sessionId === info.id)).toBe(true);
        expect(events.find((event) => event.type === "session.turn" && event.sessionId === info.id)).toMatchObject({
          turn: {userMessage: {contentParts: [{type: "text", text: "Held first turn"}]}},
        });
      },
      {timeout: 1000}
    );
    const committed = await pi.runtime.runPromise(service.getCommittedSession(info.id));
    expect(committed?.turns).toEqual([]);
    expect(committed?.title).toBe("Generated title");
  } finally {
    release();
    if (watcher) await pi.runtime.runPromise(Fiber.interrupt(watcher));
    await pi.unregister();
  }
});
