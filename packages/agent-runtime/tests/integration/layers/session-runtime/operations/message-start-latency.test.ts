import {describe, expect, it, vi} from "vitest";
import {createPiTestRuntime, fauxAssistantMessage, selectedModelReference} from "@tests/support/layers/pi-session-test-utils";
import type {SessionStreamEvent} from "@supernova/contracts/session-runtime/procedures";

describe("first-message latency", () => {
  it("starts the actual answer without waiting for an optional generated title", async () => {
    const pi = await createPiTestRuntime();
    const {info} = pi.createSession();
    let releaseTitle!: (title: string) => void;
    const title = new Promise<string>((resolve) => {
      releaseTitle = resolve;
    });
    vi.spyOn(pi.titleGenerator, "generateSessionTitle").mockReturnValue(title);
    let answerStarted = false;
    pi.faux.setResponses([
      () => {
        answerStarted = true;
        return fauxAssistantMessage("Hello.");
      },
    ]);
    const request = pi.sendMessage({message: "Hi", modelReference: selectedModelReference, sessionId: info.id, captureCheckpoints: false});
    try {
      await new Promise((resolve) => setTimeout(resolve, 300));
      expect(answerStarted, "The answer must not be queued behind a title-generation request").toBe(true);
    } finally {
      releaseTitle("Greeting");
      await request;
      pi.unregister();
    }
  });

  it("shows a model error while the after-turn checkpoint is still pending", async () => {
    let releaseCheckpoint!: () => void;
    const afterCheckpoint = new Promise<void>((resolve) => {
      releaseCheckpoint = resolve;
    });
    const capture = vi
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockImplementationOnce(() => afterCheckpoint);
    const pi = await createPiTestRuntime({checkpointStore: {capture, deleteSession: vi.fn(), restore: vi.fn()}});
    const {info} = pi.createSession();
    pi.faux.setResponses([fauxAssistantMessage("", {stopReason: "error", errorMessage: "Model unavailable for this account"})]);
    let events: SessionStreamEvent[] | undefined;
    const request = pi.sendMessage({message: "Hi", modelReference: selectedModelReference, sessionId: info.id}).then((result) => {
      events = result;
    });
    try {
      await vi.waitFor(() => expect(capture).toHaveBeenCalledTimes(2), {timeout: 2000});
      await vi.waitFor(() => expect(events?.some((event) => event.type === "session.error" && event.error.includes("Model unavailable"))).toBe(true), {timeout: 500});
    } finally {
      releaseCheckpoint();
      await request;
      pi.unregister();
    }
  });
});
