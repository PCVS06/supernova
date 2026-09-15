import type {SessionStreamEvent} from "@supernova/contracts/session-runtime/procedures";
import {Context, Effect, Layer, PubSub, Stream} from "effect";

export interface SessionEventBusShape {
  readonly publish: (event: SessionStreamEvent) => Effect.Effect<void>;
  readonly stream: () => Stream.Stream<SessionStreamEvent>;
}

export class SessionEventBus extends Context.Service<SessionEventBus, SessionEventBusShape>()("supernova/agent-runtime/SessionEventBus") {}

export const SessionEventBusLive = Layer.effect(
  SessionEventBus,
  Effect.gen(function* () {
    const pubSub = yield* PubSub.unbounded<SessionStreamEvent>();
    // Retain only the latest overlay events for unsettled work, never a transcript.
    const active = new Map<string, Map<SessionStreamEvent["type"], SessionStreamEvent>>();

    return {
      publish: (event: SessionStreamEvent) =>
        Effect.gen(function* () {
          if ("sessionId" in event) {
            if (event.type === "session.snapshot") active.delete(event.sessionId);
            else {
              if (event.type === "session.agent.started" || event.type === "session.compaction.started" || event.type === "session.turn") {
                if (!active.has(event.sessionId)) active.set(event.sessionId, new Map());
              }
              active.get(event.sessionId)?.set(event.type, event);
            }
          }
          yield* PubSub.publish(pubSub, event);
        }),
      stream: () =>
        Stream.unwrap(
          Effect.gen(function* () {
            // Subscribe before reading retained state, closing the reload gap.
            const subscription = yield* PubSub.subscribe(pubSub);
            const replay = [...active.values()].flatMap((events) => [...events.values()]).filter((event) => "revision" in event);
            replay.sort((left, right) => left.revision - right.revision);
            const revisions = new Map<string, number>();
            for (const event of replay) revisions.set(event.sessionId, Math.max(revisions.get(event.sessionId) ?? -1, event.revision));
            return Stream.concat(
              Stream.fromIterable(replay),
              Stream.fromSubscription(subscription).pipe(Stream.filter((event) => !("revision" in event) || event.revision > (revisions.get(event.sessionId) ?? -1)))
            );
          })
        ),
    };
  })
);
