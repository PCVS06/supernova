import type {HarnessLibrary} from "@supernova/contracts/harnesses/schemas";
import type {WorkspaceOverviewResult} from "@supernova/contracts/harnesses/procedures";
import {workflowOutputConsumers} from "@supernova/contracts/harnesses/workflow-graph";
import type {WorkspaceItem, WorkspaceLink, WorkspaceModel} from "@/features/workspace/types/workspace-model";
import {agentLabel} from "@/features/harnesses/lib/agent-identity";

interface BuildWorkspaceModelOptions {
  library?: HarnessLibrary;
  overview?: WorkspaceOverviewResult;
  readAt?: Readonly<Record<string, string>>;
  pinnedSessions?: ReadonlySet<string>;
  pinnedProjects?: ReadonlySet<string>;
}

/** Normalizes recorded work once: assignments stay on agents; only addressable outputs become extra nodes. */
export function buildWorkspaceModel({library, overview, readAt = {}, pinnedSessions, pinnedProjects}: BuildWorkspaceModelOptions): WorkspaceModel {
  const items: WorkspaceItem[] = [];
  const links: WorkspaceLink[] = [];
  const harnessById = new Map(library?.harnesses.map((harness) => [harness.id, harness]));
  const configuredProjects = new Map(library?.projects.map((project) => [project.id, project]));
  const projectOverview = new Map(overview?.projects.map((project) => [project.projectId, project]));
  const curatorByHarness = new Map(overview?.curators.map((curator) => [curator.harnessId, curator]));
  const chats = new Map<string, WorkspaceItem>();
  for (const harness of library?.harnesses ?? []) {
    items.push({id: `harness:${harness.id}`, kind: "harness", role: "harness", harnessId: harness.id, label: harness.name, detail: harness.description, status: "Harness"});
    const curator = curatorByHarness.get(harness.id);
    if (harness.curator) {
      items.push({
        id: `curator:${harness.id}`,
        kind: "curator",
        role: "curator",
        harnessId: harness.id,
        label: "Curator",
        detail: `${curator?.pending ?? 0} proposals awaiting review`,
        status: curator?.pending ? "Needs review" : harness.curator.enabled ? "Available" : "Off",
        attention: (curator?.pending ?? 0) > 0,
        updatedAt: curator?.updatedAt,
      });
      links.push({from: `harness:${harness.id}`, to: `curator:${harness.id}`, kind: "contains", label: "Curates harness knowledge"});
    }
  }
  const projects = [
    ...(library?.projects ?? []),
    ...(overview?.projects ?? [])
      .filter((project) => !configuredProjects.has(project.projectId))
      .map((project) => ({
        id: project.projectId,
        name: project.projectPath.split("/").at(-1) || project.projectPath,
        path: project.projectPath,
        harnessId: undefined,
        parentProjectId: undefined,
        folderMissing: false,
      })),
  ];
  const projectIds = new Set(projects.map((project) => project.id));
  for (const project of projects) {
    const harness = project.harnessId ? harnessById.get(project.harnessId) : undefined;
    const head = harness?.coordinatorProjectId === project.id;
    items.push({
      id: `project:${project.id}`,
      kind: "project",
      role: head ? "orchestrator" : "project",
      harnessId: project.harnessId,
      projectId: project.id,
      projectPath: project.path,
      label: project.name,
      detail: project.path,
      status: project.folderMissing ? "Folder missing" : head ? "Orchestrator" : "Project",
      attention: project.folderMissing,
      pinned: pinnedProjects?.has(project.path),
    });
    const parent = project.parentProjectId && configuredProjects.has(project.parentProjectId) ? project.parentProjectId : !head ? harness?.coordinatorProjectId : undefined;
    links.push({from: parent ? `project:${parent}` : `harness:${project.harnessId}`, to: `project:${project.id}`, kind: "contains", label: "Belongs to"});
    for (const session of projectOverview.get(project.id)?.sessions ?? []) {
      const chat: WorkspaceItem = {
        id: `session:${session.id}`,
        kind: "conversation",
        label: session.title || "Untitled conversation",
        detail: project.name,
        status: "Conversation",
        harnessId: project.harnessId,
        projectId: project.id,
        projectPath: project.path,
        sessionId: session.id,
        updatedAt: session.updatedAt,
        pinned: pinnedSessions?.has(session.id),
      };
      items.push(chat);
      chats.set(session.id, chat);
      links.push({from: `project:${project.id}`, to: `session:${session.id}`, kind: "contains", label: "Project conversation"});
    }
  }
  const workflowWorkers = new Set(overview?.workflows.flatMap((run) => run.stepStates?.flatMap((step) => (step.runId ? [step.runId] : [])) ?? []) ?? []);
  for (const run of overview?.runs ?? []) {
    if (workflowWorkers.has(run.id)) continue;
    const destination = projectIds.has(run.projectId) ? run.projectId : chats.get(run.chatId)?.projectId;
    items.push({
      id: `run:${run.id}`,
      kind: "agent",
      role: run.role === "specialist" ? "specialist" : "project",
      label: agentLabel(run.agentName),
      detail: run.task,
      status: run.status,
      harnessId: run.harnessId,
      projectId: destination,
      projectPath: configuredProjects.get(run.projectId)?.path,
      sessionId: run.chatId,
      runId: run.id,
      updatedAt: run.updatedAt,
      active: run.status === "running" || run.status === "starting",
      attention: run.status === "failed" || run.status === "interrupted",
    });
    if (destination) links.push({from: `run:${run.id}`, to: `project:${destination}`, kind: "works-in", label: "Works in project"});
    links.push({from: run.parentRunId ? `run:${run.parentRunId}` : `session:${run.chatId}`, to: `run:${run.id}`, kind: "delegates", label: "Delegated by"});
  }
  for (const run of overview?.workflows ?? []) {
    const owner = {
      harnessId: run.harnessId,
      projectId: projectIds.has(run.projectId) ? run.projectId : chats.get(run.chatId)?.projectId,
      sessionId: run.chatId,
      runId: run.id,
    };
    const consumers = workflowOutputConsumers(run.stepStates ?? []);
    items.push({
      ...owner,
      id: `workflow:${run.id}`,
      kind: "workflow",
      label: run.workflowName,
      detail: run.task,
      status: run.status,
      updatedAt: run.updatedAt,
      active: run.status === "running",
      attention: run.status === "failed" || run.status === "interrupted",
    });
    links.push({from: `session:${run.chatId}`, to: `workflow:${run.id}`, kind: "contains", label: "Started workflow"});
    for (const step of run.stepStates ?? []) {
      const id = `step:${run.id}:${step.stepId}`;
      items.push({
        ...owner,
        id,
        stepId: step.stepId,
        kind: "step",
        role: "specialist",
        label: step.stepId,
        detail: step.waitReason ?? agentLabel(step.agent),
        status: step.status,
        updatedAt: step.finishedAt ?? step.startedAt ?? run.startedAt,
        active: run.status === "running" && step.status === "running",
        attention: step.status === "failed" || step.status === "blocked",
      });
      links.push({from: `workflow:${run.id}`, to: id, kind: "contains", label: "Workflow step"});
      const reads = new Set(step.reads);
      for (const dependency of new Set([...reads, ...step.dependsOn]))
        links.push({
          from: `step:${run.id}:${dependency}`,
          to: id,
          kind: reads.has(dependency) ? "output" : "depends",
          label: reads.has(dependency) ? "Shares validated output" : "Waits for completion",
        });
      if (step.status === "completed") {
        items.push({
          ...owner,
          stepId: step.stepId,
          id: `result:${run.id}:${step.stepId}`,
          kind: "result",
          label: `${step.stepId} result`,
          detail: `Validated output · ${consumers.get(step.stepId) ?? 0} consumers`,
          status: "completed",
          updatedAt: step.finishedAt,
        });
        links.push({from: id, to: `result:${run.id}:${step.stepId}`, kind: "output", label: "Produced result"});
      }
    }
  }
  for (const state of overview?.controls ?? []) {
    const chat = chats.get(state.sessionId);
    const owner = {sessionId: state.sessionId, projectId: chat?.projectId, harnessId: chat?.harnessId};
    if (state.goal) {
      const goal = state.goal;
      items.push({
        ...owner,
        id: `goal:${goal.id}`,
        kind: "goal",
        label: goal.objective,
        detail: goal.message ?? `${goal.turnsUsed} of ${goal.maxTurns} turns`,
        status: goal.status,
        updatedAt: goal.updatedAt,
        active: goal.status === "active",
        attention: goal.status === "blocked",
      });
      links.push({from: `session:${state.sessionId}`, to: `goal:${goal.id}`, kind: "contains", label: "Conversation goal"});
    }
    for (const message of state.queue) {
      items.push({
        ...owner,
        id: `queue:${message.id}`,
        kind: "queued",
        label: message.contentParts.flatMap((part) => (part.type === "text" ? [part.text] : [])).join(" ") || "Queued attachment",
        detail: "Waiting for delivery",
        status: message.deliveryStatus === "uncertain" ? "Delivery uncertain" : state.queuePaused ? "Paused" : "Queued",
        updatedAt: message.createdAt,
        attention: message.deliveryStatus === "uncertain",
      });
      links.push({from: `session:${state.sessionId}`, to: `queue:${message.id}`, kind: "contains", label: "Queued message"});
    }
  }
  const ids = new Set(items.map((item) => item.id));
  return {
    items: items.map((item) => ({...item, unread: item.status === "completed" && Boolean(item.updatedAt) && (!readAt[item.id] || readAt[item.id]! < item.updatedAt!)})),
    links: links.filter((link) => ids.has(link.from) && ids.has(link.to) && link.from !== link.to),
  };
}

/** Counts work once at its actionable level, avoiding a workflow and its children counting twice. */
export function workspaceActivity(items: readonly WorkspaceItem[], sessionId?: string, projectId?: string): {working: number; attention: number} {
  const scoped = items.filter((item) => (!sessionId || item.sessionId === sessionId) && (!projectId || item.projectId === projectId));
  const detailedRuns = new Set(scoped.filter((item) => item.kind === "step").map((item) => item.runId));
  const work = scoped.filter((item) => item.kind !== "result" && !(item.kind === "workflow" && detailedRuns.has(item.runId)));
  return {working: work.filter((item) => item.active).length, attention: work.filter((item) => item.attention).length};
}
