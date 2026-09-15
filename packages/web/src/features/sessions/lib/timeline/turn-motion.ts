export interface TurnMotionInput {
  readonly busy: boolean;
  readonly completedId?: string;
  readonly failed: boolean;
  readonly stopping: boolean;
}

export interface TurnMotionState extends TurnMotionInput {
  readonly awaitingCompletion: boolean;
  readonly baselineId?: string;
  readonly completionId?: string;
}

/** Celebrates an observed turn only after completion arrives, including delayed query settlement. */
export function advanceTurnMotion(previous: TurnMotionState, input: TurnMotionInput): TurnMotionState {
  if (previous.busy === input.busy && previous.completedId === input.completedId && previous.failed === input.failed && previous.stopping === input.stopping) return previous;
  const starting = input.busy && !previous.busy;
  const baselineId = starting ? previous.completedId : previous.baselineId;
  const awaitingCompletion = !input.failed && !input.stopping && (input.busy || previous.awaitingCompletion);
  const completed = awaitingCompletion && !input.busy && input.completedId !== undefined && input.completedId !== baselineId;
  return {
    ...input,
    baselineId,
    awaitingCompletion: awaitingCompletion && !completed,
    completionId: completed ? input.completedId : input.busy || input.failed || input.stopping ? undefined : previous.completionId,
  };
}
