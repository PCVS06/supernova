import {describe, expect, it} from "vitest";
import type {HarnessRunSummary, WorkflowRunSummary} from "@supernova/contracts/harnesses/schemas";
import {buildOrbitModel} from "@/features/sessions/lib/orbits/orbit-model";
import {orbitDescendants, projectOrbits} from "@/features/sessions/lib/orbits/orbit-projection";
import {orbitPosition} from "@/features/sessions/lib/orbits/orbit-geometry";

function worker(id: string, overrides: Partial<HarnessRunSummary> = {}): HarnessRunSummary {
  return {
    id,
    chatId: "chat",
    harnessId: "harness",
    projectId: "project",
    projectName: "Project",
    agentName: id,
    role: "specialist",
    status: "running",
    task: "Review evidence",
    startedAt: "2026-09-13T10:00:00Z",
    updatedAt: "2026-09-13T10:00:00Z",
    ...overrides,
  };
}
const defaults = {chatId: "chat", title: "Lead chat", constant: "tau" as const, busy: false, workflows: []};

describe("chat orbital ownership", () => {
  it("represents repeated project assignments as one planet with all its workers", () => {
    const model = buildOrbitModel({
      ...defaults,
      runs: [
        worker("first", {role: "lab-orchestrator", status: "completed"}),
        worker("second", {role: "lab-orchestrator"}),
        worker("old-worker", {parentRunId: "first", status: "completed"}),
        worker("current-worker", {parentRunId: "second"}),
      ],
    });
    const planets = [...model.bodies.values()].filter((body) => body.kind === "orchestrator");
    expect(planets).toHaveLength(1);
    expect(planets[0]).toMatchObject({active: true, runId: "second"});
    expect(model.children.get(planets[0]!.id)?.toSorted()).toEqual(["run:current-worker", "run:old-worker"]);
  });
  it("excludes removed projects and their workers from the live system", () => {
    const input = {...defaults, projects: [], runs: [worker("removed", {role: "lab-orchestrator"}), worker("moon", {parentRunId: "removed"})]};
    const model = buildOrbitModel(input);
    expect([...model.bodies.keys()]).toEqual([model.rootId]);
  });
  it("keeps direct workers in a chat outside the harness directory while excluding deleted delegated projects", () => {
    const model = buildOrbitModel({...defaults, projects: [], runs: [worker("own"), worker("removed", {role: "lab-orchestrator", projectId: "deleted"})]});
    expect([...model.bodies.keys()]).toEqual([model.rootId, "run:own"]);
  });
  it("preserves a chat's identity, direct agents and nested project delegations without importing other chats", () => {
    const model = buildOrbitModel({
      ...defaults,
      runs: [worker("direct"), worker("project-lead", {role: "lab-orchestrator"}), worker("moon", {parentRunId: "project-lead"}), worker("foreign", {chatId: "other"})],
    });
    expect(model.bodies.get(model.rootId)?.constant).toBe("tau");
    expect(model.children.get(model.rootId)).toEqual(["run:direct", "project:harness:project"]);
    expect(model.children.get("project:harness:project")).toEqual(["run:moon"]);
    expect(model.bodies.has("run:foreign")).toBe(false);
  });
  it.each(["completed", "cancelled", "interrupted"] as const)("retains %s participation and distinguishes independent activity", (status) => {
    const model = buildOrbitModel({
      ...defaults,
      runs: [worker("lead", {role: "lab-orchestrator", status}), worker("moon", {parentRunId: "lead", status})],
      otherRuns: [worker("external", {chatId: "independent"})],
    });
    expect(model.bodies.get("project:harness:project")).toMatchObject({active: false, independentChats: ["independent"]});
    expect(model.children.get("project:harness:project")).toEqual(["run:moon"]);
    expect(model.bodies.has("run:external")).toBe(false);
  });
  it("opens a delegated project as its own system and excludes peers and its original chat root", () => {
    const lead = worker("lead", {role: "lab-orchestrator"});
    const model = buildOrbitModel({...defaults, constant: "phi", rootRun: lead, runs: [worker("direct"), worker("moon", {parentRunId: "lead"})]});
    expect([...model.bodies.keys()].sort()).toEqual(["run:lead", "run:moon"]);
    expect(model.rootId).toBe("run:lead");
  });
  it("represents a workflow worker once and preserves children delegated by that recorded worker", () => {
    const workflow: WorkflowRunSummary = {
      id: "flow",
      chatId: "chat",
      harnessId: "harness",
      projectId: "project",
      workflowId: "definition",
      workflowName: "Review",
      workflowRevision: 1,
      invocationId: "lead:invocation",
      task: "Review",
      status: "running",
      cursor: 0,
      stepCount: 2,
      spentUsd: 0,
      startedAt: "2026-09-13T10:00:00Z",
      updatedAt: "2026-09-13T10:00:00Z",
      stepStates: [
        {stepId: "source", agent: "research", reads: [], dependsOn: [], status: "completed", attempt: 1, runId: "source-worker"},
        {stepId: "review", agent: "review", reads: ["source"], dependsOn: [], status: "running", attempt: 1},
      ],
    };
    const model = buildOrbitModel({
      ...defaults,
      runs: [worker("lead", {role: "lab-orchestrator"}), worker("source-worker", {parentRunId: "lead"}), worker("nested", {parentRunId: "source-worker"})],
      workflows: [workflow],
    });
    expect(model.bodies.has("run:source-worker")).toBe(false);
    expect(model.children.get("step:flow:source")).toEqual(["run:nested"]);
    expect(model.bodies.get("step:flow:review")?.parentId).toBe("project:harness:project");
    expect(model.transfers).toEqual([{from: "step:flow:source", to: "step:flow:review", kind: "result"}]);
  });
  it("keeps damaged parent records reachable without claiming a real direct delegation", () => {
    const model = buildOrbitModel({...defaults, runs: [worker("orphan", {parentRunId: "missing"}), worker("a", {parentRunId: "b"}), worker("b", {parentRunId: "a"})]});
    expect(orbitDescendants(model, model.rootId)).toHaveLength(3);
    expect(model.bodies.get("run:orphan")?.parentKnown).toBe(false);
    expect(model.unresolved).toBe(2);
  });
  it.each([500, 1000])("keeps %i participants addressable while bounding visible bodies and protecting selection", (count) => {
    const runs = Array.from({length: count}, (_, index) => worker(String(index), {status: index < 200 ? "running" : "completed"}));
    const model = buildOrbitModel({...defaults, runs});
    const view = projectOrbits(model, model.rootId, 4, `run:${count - 1}`);
    const represented = view.primary.flatMap((body) => ("members" in body ? body.members : [body.id]));
    expect(new Set(represented).size).toBe(count);
    expect(view.primary.length).toBeLessThanOrEqual(4);
    expect(view.primary.some((body) => body.id === `run:${count - 1}`)).toBe(true);
    expect(orbitDescendants(model, model.rootId)).toHaveLength(count);
  });
  it.each([4, 6, 8])("keeps agents visible beside all %i project planets", (count) => {
    const runs = Array.from({length: count}, (_, index) => [
      worker(`lead-${index}`, {role: "lab-orchestrator", projectId: `project-${index}`, status: "completed"}),
      ...Array.from({length: 3}, (_, child) => worker(`agent-${index}-${child}`, {parentRunId: `lead-${index}`, projectId: `project-${index}`, status: "completed"})),
    ]).flat();
    const model = buildOrbitModel({...defaults, runs});
    const view = projectOrbits(model, model.rootId, 8);
    expect(view.primary).toHaveLength(count);
    expect(view.hidden).toBe(0);
    expect([...view.satellites.values()].flat()).toHaveLength(count * 3);
  });
  it("shows a six-agent team and keeps a selected agent visible in larger teams", () => {
    const model = buildOrbitModel({
      ...defaults,
      runs: [worker("lead", {role: "lab-orchestrator"}), ...Array.from({length: 9}, (_, i) => worker(`agent-${i}`, {parentRunId: "lead"}))],
    });
    const view = projectOrbits(model, model.rootId, 8, "run:agent-8");
    const agents = view.satellites.get("project:harness:project")!;
    expect(agents).toHaveLength(6);
    expect(agents.some((agent) => agent.id === "run:agent-8")).toBe(true);
  });
  it("handles very deep recorded delegation without recursive traversal", () => {
    const model = buildOrbitModel({...defaults, runs: Array.from({length: 1000}, (_, i) => worker(String(i), {parentRunId: i ? String(i - 1) : undefined}))});
    expect(orbitDescendants(model, model.rootId)).toHaveLength(1000);
  });
});

describe("orbital movement", () => {
  it.each([false, true])("completes a continuous ellipse with its parent at the focus (vertical: %s)", (vertical) => {
    const lane = {radius: 100, eccentricity: 0.1, phase: 0, period: 80};
    const initial = orbitPosition(lane, 0, vertical),
      returned = orbitPosition(lane, 80, vertical);
    expect(returned.x).toBeCloseTo(initial.x);
    expect(returned.y).toBeCloseTo(initial.y);
    const middle = orbitPosition(lane, 40, vertical);
    expect(vertical ? middle.y : middle.x).toBeCloseTo(-110);
    expect(vertical ? initial.y : initial.x).toBeCloseTo(90);
  });
});
