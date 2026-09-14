import type {SteerSessionPayload} from "@supernova/contracts/session-runtime/procedures";
import type {ImageContent} from "@earendil-works/pi-ai";
import type {PiSessionRuntime} from "@supernova/agent-runtime/layers/session-runtime/internal/pi-session-runtime";
import {harnessRunStore} from "@supernova/agent-runtime/layers/harnesses/internal/harness-run-store";
import type {HarnessRunStore} from "@supernova/agent-runtime/layers/harnesses/internal/harness-run-store";

/**
 * Steers the turn a retained runtime is streaming; an idle session rejects explicitly.
 *
 * A steer is the user correcting the instructions while they are being followed, which is the curator's strongest
 * evidence, so every steer of a harness chat is recorded next to that chat's receipts. A chat that belongs to no
 * harness project has no instructions to curate and no review that could read the record, so it is not kept. The
 * record is a side note either way: a log that cannot be written must never cost the user their correction.
 */
export async function steerSession(
  runtime: PiSessionRuntime | undefined,
  input: SteerSessionPayload,
  runs: HarnessRunStore = harnessRunStore,
  images?: ImageContent[]
): Promise<string> {
  if (!runtime) throw new Error("The session is not accepting steering. Send or queue the message instead.");
  const accepted = await runtime.steer(input.text, images);
  try {
    const project = await runs.chatProject(input.sessionId);
    if (project.id ?? project.path) await runs.appendSteer(input.sessionId, input.text);
  } catch (error) {
    console.warn("Radian could not record a steer for curation:", error instanceof Error ? error.message : String(error));
  }
  return accepted;
}
