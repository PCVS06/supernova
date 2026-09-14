const DIGIT_HOLD_MS = 200;
const DIGIT_RESOLVE_MS = 250;

export interface DigitRevealPlan {
  readonly text: string;
  readonly deadlines: readonly number[];
}

/** Keeps already received text on its original clock; every new suffix begins entirely as digits. */
export function planDigitReveal(previous: DigitRevealPlan, text: string, now: number): DigitRevealPlan {
  let shared = 0;
  while (shared < previous.text.length && shared < text.length && previous.text[shared] === text[shared]) shared++;
  const deadlines = previous.deadlines.slice(0, shared);
  for (let index = shared; index < text.length; index++) {
    deadlines.push(now + DIGIT_HOLD_MS + (DIGIT_RESOLVE_MS * (index - shared)) / Math.max(1, text.length - shared - 1));
  }
  return {text, deadlines};
}
