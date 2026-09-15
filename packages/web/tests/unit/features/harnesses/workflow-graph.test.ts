import {describe, expect, it} from "vitest";
import {workflowLayers, workflowOutputConsumers, workflowStepSummaries} from "@supernova/contracts/harnesses/workflow-graph";
import type {WorkflowRun} from "@supernova/contracts/harnesses/schemas";

describe("shared workflow topology", () => {
  it("keeps definition order within each layer regardless of parent completion order", () => {
    expect(
      workflowLayers([
        {id: "join", reads: ["b", "a"], dependsOn: []},
        {id: "b", reads: ["right", "right"], dependsOn: ["right"]},
        {id: "a", reads: ["left"], dependsOn: []},
        {id: "left", reads: [], dependsOn: []},
        {id: "right", reads: [], dependsOn: []},
      ])
    ).toEqual([["left", "right"], ["b", "a"], ["join"]]);
  });

  it("handles long reversed chains without repeated scans or recursion", () => {
    const steps = Array.from({length: 10_000}, (_, i) => ({id: `s${i}`, reads: i ? [`s${i - 1}`] : []})).reverse();
    const layers = workflowLayers(steps);
    expect(layers).toHaveLength(steps.length);
    expect(layers[0]).toEqual(["s0"]);
    expect(layers.at(-1)).toEqual(["s9999"]);
  });

  it("rejects cycles even when an independent branch can finish", () => {
    expect(() =>
      workflowLayers([
        {id: "root", reads: []},
        {id: "a", reads: ["b"]},
        {id: "b", reads: ["a"]},
      ])
    ).toThrow("cycle");
    expect(() => workflowLayers([{id: "a", reads: ["missing"]}])).toThrow("missing prerequisite");
    expect(() => workflowLayers([{id: "a", reads: ["a"]}])).toThrow("itself");
    expect(() =>
      workflowLayers([
        {id: "a", reads: []},
        {id: "a", reads: []},
      ])
    ).toThrow("unique");
    expect(workflowLayers([])).toEqual([]);
  });

  it("counts readers once per consumer, keeping workflows independent", () => {
    expect([...workflowOutputConsumers([{reads: ["a", "a"]}, {reads: ["a", "b"]}, {reads: []}])]).toEqual([
      ["a", 2],
      ["b", 1],
    ]);
    expect(workflowOutputConsumers([]).size).toBe(0);
  });

  it("preserves receipt order, retries, failures and missing definitions in summaries", () => {
    const workflow: WorkflowRun["workflow"] = {
      id: "review",
      name: "Review",
      description: "",
      limits: {maxWallClockSeconds: 600},
      steps: [
        {id: "a", agent: "scout", instructions: "", reads: [], output: {fields: []}, effects: "none"},
        {id: "b", agent: "reviewer", instructions: "", reads: ["a"], dependsOn: ["a"], output: {fields: []}, effects: "none"},
      ],
    };
    const steps: WorkflowRun["steps"] = [
      {stepId: "b", agent: "reviewer", actionId: "b1", attempt: 1, status: "failed", input: {}, error: "Unavailable"},
      {stepId: "b", agent: "reviewer", actionId: "b1", attempt: 2, status: "completed", input: {}, runId: "retry"},
      {stepId: "old", agent: "archived", actionId: "old", attempt: 1, status: "completed", input: {}},
    ];
    expect(workflowStepSummaries({workflow, steps})).toMatchObject([
      {stepId: "b", reads: ["a"], dependsOn: ["a"], attempt: 1, waitReason: "Unavailable"},
      {stepId: "b", reads: ["a"], dependsOn: ["a"], attempt: 2, runId: "retry"},
      {stepId: "old", reads: [], dependsOn: [], status: "completed"},
    ]);
  });
});
