import {describe, expect, it} from "vitest";
import type {HarnessConfig, HarnessWorkflow} from "@supernova/contracts/harnesses/schemas";
import {
  createDefaultHarness,
  maxInstructionChars,
  migrateLegacyGraph,
  normalizeHarnessHierarchy,
  validateHarness,
} from "@supernova/agent-runtime/layers/harnesses/lib/harness-config";

const agents = [
  {name: "scout", description: "Finds sources", systemPrompt: "Scout", tools: ["read"]},
  {name: "reviewer", description: "Checks claims", systemPrompt: "Review", tools: ["read"]},
];

function workflow(overrides: Partial<HarnessWorkflow> = {}): HarnessWorkflow {
  return {
    id: "literature",
    name: "Literature",
    description: "Scout then review",
    steps: [
      {id: "scout", agent: "scout", instructions: "Find sources", reads: [], output: {fields: [{name: "sources", type: "string[]", required: true}]}, effects: "none"},
      {id: "review", agent: "reviewer", instructions: "Check them", reads: ["scout"], output: {fields: [{name: "verdict", type: "string", required: true}]}, effects: "none"},
    ],
    limits: {maxWallClockSeconds: 600},
    ...overrides,
  };
}

function harness(overrides: Partial<HarnessConfig> = {}): HarnessConfig {
  return {...createDefaultHarness(), agents, workflows: [workflow()], ...overrides};
}

describe("workflow configuration", () => {
  it("accepts a sequential workflow whose reads all precede their readers", () => {
    expect(() => validateHarness(harness())).not.toThrow();
  });

  it("rejects a read of a step that does not run before the reader", () => {
    const steps = [...workflow().steps].reverse();
    expect(() => validateHarness(harness({workflows: [workflow({steps})]}))).toThrow("does not run before it");
  });

  it("rejects steps that reference undefined agents, duplicate ids, and invalid field names", () => {
    expect(() => validateHarness(harness({workflows: [workflow({steps: [{...workflow().steps[0]!, agent: "ghost"}]})]}))).toThrow("not defined");
    const duplicate = workflow({steps: [workflow().steps[0]!, {...workflow().steps[1]!, id: "scout", reads: []}]});
    expect(() => validateHarness(harness({workflows: [duplicate]}))).toThrow("duplicate or invalid step ID");
    const badField = workflow({steps: [{...workflow().steps[0]!, output: {fields: [{name: "1bad", type: "string", required: true}]}}]});
    expect(() => validateHarness(harness({workflows: [badField]}))).toThrow("output field name");
  });

  it("bounds per-step and per-workflow limits", () => {
    expect(() => validateHarness(harness({workflows: [workflow({limits: {maxWallClockSeconds: 5}})]}))).toThrow("wall-clock");
    expect(() => validateHarness(harness({workflows: [workflow({limits: {maxWallClockSeconds: 600, maxCostUsd: 0}})]}))).toThrow("cost limit");
    const step = {...workflow().steps[0]!, limits: {maxTurns: 0}};
    expect(() => validateHarness(harness({workflows: [workflow({steps: [step]})]}))).toThrow("turn limit");
  });

  it("caps the combined instruction text rather than only each piece", () => {
    // Each piece stays under its own 200,000-character cap; only the sum crosses the aggregate budget.
    const piece = "x".repeat(150000);
    const oversized = harness({systemPrompt: piece, agents: [{...agents[0]!, systemPrompt: piece}], context: {...createDefaultHarness().context, instructions: piece}});
    expect(piece.length * 3).toBeGreaterThan(maxInstructionChars);
    expect(() => validateHarness(oversized)).toThrow("together exceed");
    expect(() => validateHarness(harness({context: {...createDefaultHarness().context, instructions: "y".repeat(200001)}}))).toThrow("context rules");
  });

  it("migrates a legacy handoff list into one workflow and mirrors it back", () => {
    const legacy: HarnessConfig = {...createDefaultHarness(), agents, graph: {steps: ["scout", "reviewer"]}, workflows: undefined};
    const migrated = migrateLegacyGraph(legacy);
    expect(migrated).toHaveLength(1);
    expect(migrated[0]!.steps.map((step) => [step.id, step.agent, step.reads])).toEqual([
      ["step-1", "scout", []],
      ["step-2", "reviewer", ["step-1"]],
    ]);
    const library = normalizeHarnessHierarchy({revision: 3, harnesses: [legacy], projects: []});
    expect(library.harnesses[0]!.workflows).toEqual(migrated);
    expect(library.harnesses[0]!.graph.steps).toEqual(["scout", "reviewer"]);
    expect(() => validateHarness(library.harnesses[0]!)).not.toThrow();
  });

  it("keeps explicit workflows and derives the legacy list from the first one", () => {
    const library = normalizeHarnessHierarchy({revision: 1, harnesses: [harness({graph: {steps: ["reviewer"]}})], projects: []});
    expect(library.harnesses[0]!.workflows).toEqual([workflow()]);
    expect(library.harnesses[0]!.graph.steps).toEqual(["scout", "reviewer"]);
  });
});
