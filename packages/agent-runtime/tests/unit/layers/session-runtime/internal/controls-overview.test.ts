import {describe, expect, it} from "vitest";
import {readControlsOverview} from "@supernova/agent-runtime/layers/session-runtime/internal/session-controls-store";

const queued = {id: "queued", createdAt: "2026-09-13T08:00:00Z", modelReference: {providerId: "test", id: "test"}, contentParts: [{type: "text", text: "a".repeat(10000)}]};
const state = {
  sessionId: "chat",
  revision: 1,
  queue: [],
  queuePaused: false,
  goal: {
    id: "goal",
    objective: "Review",
    status: "active",
    maxTurns: 10,
    turnsUsed: 2,
    modelReference: {providerId: "test", id: "test"},
    createdAt: queued.createdAt,
    updatedAt: queued.createdAt,
  },
};
describe("navigation control snapshots", () => {
  it("shows abandoned goals as paused without reviving them or inventing activity time", () => {
    const snapshot = readControlsOverview({state, steering: []});
    expect(snapshot.goal).toMatchObject({status: "paused", updatedAt: state.goal.updatedAt});
    expect(snapshot.queuePaused).toBe(true);
    expect(state.goal.status).toBe("active");
  });
  it("retains uncertain deliveries once and bounds their navigation text", () => {
    const snapshot = readControlsOverview({state: {...state, queue: [queued]}, inFlight: queued, steering: []});
    expect(snapshot.queue).toHaveLength(1);
    expect(snapshot.queue[0]).toMatchObject({id: "queued", deliveryStatus: "uncertain", contentParts: [{type: "text", text: "a".repeat(300)}]});
  });
});
