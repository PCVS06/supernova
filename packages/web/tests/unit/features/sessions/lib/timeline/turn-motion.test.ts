import {describe, expect, it} from "vitest";
import {advanceTurnMotion} from "@/features/sessions/lib/timeline/turn-motion";
import type {TurnMotionInput, TurnMotionState} from "@/features/sessions/lib/timeline/turn-motion";

const idle: TurnMotionInput = {busy: false, completedId: "old", failed: false, stopping: false};

describe("observed turn completion", () => {
  it.each([
    {name: "opening history", steps: [{completedId: "old"}], expected: undefined},
    {name: "refreshing unobserved history", steps: [{completedId: "new"}], expected: undefined},
    {name: "a successful live reply", steps: [{busy: true}, {completedId: "new"}], expected: "new"},
    {name: "query settlement after streaming stops", steps: [{busy: true}, {}, {completedId: "new"}], expected: "new"},
    {name: "query settlement before streaming stops", steps: [{busy: true}, {busy: true, completedId: "new"}, {completedId: "new"}], expected: "new"},
    {name: "a failed turn", steps: [{busy: true}, {failed: true}, {completedId: "new"}], expected: undefined},
    {name: "an interrupted turn", steps: [{busy: true}, {stopping: true}, {completedId: "new"}], expected: undefined},
  ])("handles $name", ({steps, expected}) => {
    let state: TurnMotionState = {...idle, awaitingCompletion: false, baselineId: "old"};
    for (const step of steps) state = advanceTurnMotion(state, {...idle, ...step});
    expect(state.completionId).toBe(expected);
  });

  it("does not replay after the completion animation has ended", () => {
    const completed: TurnMotionState = {...idle, completedId: "new", awaitingCompletion: false, baselineId: "old", completionId: undefined};
    expect(advanceTurnMotion(completed, {...idle, completedId: "new"})).toBe(completed);
  });
});
