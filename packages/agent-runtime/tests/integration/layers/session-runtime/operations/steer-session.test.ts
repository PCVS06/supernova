import {Effect, Fiber, Stream} from "effect";
import {afterEach, describe, expect, it} from "vitest";
import type {Context} from "@earendil-works/pi-ai";
import {SessionRuntimeService} from "@supernova/agent-runtime/services/session-runtime-service";
import type {SessionStreamEvent} from "@supernova/contracts/session-runtime/procedures";
import {createPiTestRuntime, fauxAssistantMessage, selectedModelReference, waitUntil} from "@tests/support/layers/pi-session-test-utils";

/** Collects the user text of a context, which is where a delivered steering message shows up. */
function userTexts(messages: Context["messages"]): string[] {
  return messages
    .filter((message) => message.role === "user")
    .flatMap((message) => (typeof message.content === "string" ? [message.content] : message.content.filter((part) => part.type === "text").map((part) => part.text)));
}

describe("steering a running session", () => {
  const runtimes: Array<{unregister: () => void}> = [];

  afterEach(() => {
    while (runtimes.length > 0) runtimes.pop()?.unregister();
  });

  it("delivers the message into the turn the agent is streaming", async () => {
    const pi = await createPiTestRuntime();
    runtimes.push(pi);
    const {info} = pi.createSession();
    let releaseFirstAnswer = () => {};
    const firstAnswerReleased = new Promise<void>((resolve) => {
      releaseFirstAnswer = resolve;
    });
    const promptedUserTexts: string[][] = [];
    pi.faux.setResponses([
      async (context) => {
        promptedUserTexts.push(userTexts(context.messages));
        await firstAnswerReleased;
        return fauxAssistantMessage("Looking around");
      },
      (context) => {
        promptedUserTexts.push(userTexts(context.messages));
        return fauxAssistantMessage("Focused on the tests");
      },
    ]);
    const events: SessionStreamEvent[] = [];
    const watcher = pi.runtime.runFork(
      Effect.gen(function* () {
        const sessionRuntime = yield* SessionRuntimeService;
        yield* Stream.runForEach(sessionRuntime.watchEvents(), (event) => Effect.sync(() => events.push(event)));
      })
    );

    try {
      await waitUntil(() => {
        if (!events.some((event) => event.type === "connected")) throw new Error("Stream did not connect.");
      });
      await pi.runWithSessionRuntime(
        Effect.gen(function* () {
          const sessionRuntime = yield* SessionRuntimeService;
          yield* sessionRuntime.sendMessage({contentParts: [{text: "Start the work", type: "text"}], modelReference: selectedModelReference, sessionId: info.id});
        })
      );
      await waitUntil(() => {
        if (!events.some((event) => event.type === "session.agent.started")) throw new Error("Session agent did not start.");
      });

      await pi.runWithSessionRuntime(
        Effect.gen(function* () {
          const sessionRuntime = yield* SessionRuntimeService;
          yield* sessionRuntime.steerSession({sessionId: info.id, text: "Focus on the tests"});
        })
      );
      releaseFirstAnswer();

      await waitUntil(() => {
        const endedRevision = events.find((event) => event.type === "session.agent.ended")?.revision;
        if (endedRevision === undefined) throw new Error("Session agent did not end.");
        if (!events.some((event) => event.type === "session.snapshot" && event.revision > endedRevision)) throw new Error("Session did not publish a final snapshot.");
      });
    } finally {
      await pi.runtime.runPromise(Fiber.interrupt(watcher).pipe(Effect.ignore));
    }

    // Steering is not a turn of its own: the same run continues and the next provider call carries the message.
    expect(promptedUserTexts[0]).toEqual(["Start the work"]);
    expect(promptedUserTexts[1]).toEqual(["Start the work", "Focus on the tests"]);
    expect(events.filter((event) => event.type === "session.agent.started")).toHaveLength(1);
  });

  it("rejects steering while the session is idle or missing", async () => {
    const pi = await createPiTestRuntime();
    runtimes.push(pi);
    const {info, manager} = pi.createSession();
    pi.faux.setResponses([fauxAssistantMessage("Done"), fauxAssistantMessage("Must never run")]);
    await pi.sendMessage({message: "Start the work", modelReference: selectedModelReference, sessionId: info.id});

    await expect(
      pi.runWithSessionRuntime(
        Effect.gen(function* () {
          const sessionRuntime = yield* SessionRuntimeService;
          yield* sessionRuntime.steerSession({sessionId: info.id, text: "Too late"});
        })
      )
    ).rejects.toThrow("not accepting steering");
    await expect(
      pi.runWithSessionRuntime(Effect.flatMap(Effect.service(SessionRuntimeService), (runtime) => runtime.steerSession({sessionId: "never-started", text: "No runtime at all"})))
    ).rejects.toThrow("not accepting steering");

    // A delivered message would have reached the provider and been persisted as a second user message.
    expect(pi.faux.getPendingResponseCount()).toBe(1);
    expect(manager.buildSessionContext().messages.filter((message) => message.role === "user")).toHaveLength(1);
  });
});
