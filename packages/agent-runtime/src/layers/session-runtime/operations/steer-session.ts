import type {SteerSessionPayload} from "@supernova/contracts/session-runtime/procedures";
import type {PiSessionRuntime} from "@supernova/agent-runtime/layers/session-runtime/internal/pi-session-runtime";

/** Steers the turn a retained runtime is streaming; a session without one is left untouched. */
export async function steerSession(runtime: PiSessionRuntime | undefined, input: SteerSessionPayload): Promise<void> {
  await runtime?.steer(input.text);
}
