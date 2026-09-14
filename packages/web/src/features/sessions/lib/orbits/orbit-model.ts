import type {HarnessRunSummary, WorkflowRunSummary} from "@supernova/contracts/harnesses/schemas";
import type {MathematicalConstant} from "@/components/brand/constant-identity";

export interface OrbitBody {
  readonly id: string;
  readonly parentId?: string;
  readonly kind: "chat" | "orchestrator" | "agent" | "workflow";
  readonly constant: MathematicalConstant;
  readonly label: string;
  readonly detail: string;
  readonly status: string;
  readonly active: boolean;
  readonly attention: boolean;
  readonly parentKnown: boolean;
  readonly independentChats: readonly string[];
  readonly chatId: string;
  readonly projectId?: string;
  readonly runId?: string;
  readonly workflowId?: string;
  readonly stepId?: string;
  readonly startedAt?: string;
  readonly finishedAt?: string;
  readonly updatedAt?: string;
}

export interface OrbitTransfer {
  readonly from: string;
  readonly to: string;
  readonly kind: "result" | "dependency";
}

export interface OrbitModel {
  readonly rootId: string;
  readonly bodies: ReadonlyMap<string, OrbitBody>;
  readonly children: ReadonlyMap<string, readonly string[]>;
  readonly transfers: readonly OrbitTransfer[];
  readonly workflows: readonly WorkflowRunSummary[];
  readonly unresolved: number;
}

/** Only explicit invocation ownership attaches a nested workflow to an orchestrator. */
function workflowParent(workflow: WorkflowRunSummary, runs: readonly HarnessRunSummary[], root: string): string {
  const owner = runs.find((run) => workflow.invocationId?.startsWith(`${run.id}:`));
  return owner ? `run:${owner.id}` : root;
}

function isActive(status: string): boolean {
  return status === "starting" || status === "running";
}

interface BuildOrbitModelOptions {
  readonly chatId: string;
  readonly title: string;
  readonly constant: MathematicalConstant;
  readonly busy: boolean;
  readonly runs: readonly HarnessRunSummary[];
  readonly workflows: readonly WorkflowRunSummary[];
  readonly rootRun?: HarnessRunSummary;
  readonly otherRuns?: readonly HarnessRunSummary[];
  readonly otherWorkflows?: readonly WorkflowRunSummary[];
}

/** Builds one chat-owned system. Project membership alone never imports another chat's workers. */
export function buildOrbitModel(options: BuildOrbitModelOptions): OrbitModel {
  const {chatId, title, constant, busy, rootRun} = options;
  const runs = options.runs.filter((run) => run.chatId === chatId);
  if (rootRun && rootRun.chatId === chatId && !runs.some((run) => run.id === rootRun.id)) runs.push(rootRun);
  const workflows = options.workflows.filter((run) => run.chatId === chatId);
  const chatRoot = `session:${chatId}`;
  const bodies = new Map<string, OrbitBody>();
  const aliases = new Map<string, string>();
  const transfers: OrbitTransfer[] = [];
  const independentByProject = new Map<string, Set<string>>();
  for (const run of [...(options.otherRuns ?? []), ...(options.otherWorkflows ?? [])]) {
    if (run.chatId === chatId || !isActive(run.status)) continue;
    const chats = independentByProject.get(run.projectId) ?? new Set<string>();
    chats.add(run.chatId);
    independentByProject.set(run.projectId, chats);
  }
  bodies.set(chatRoot, {
    id: chatRoot,
    kind: "chat",
    constant,
    label: title,
    detail: "Current chat",
    status: busy ? "Working" : "Ready",
    active: busy,
    attention: false,
    parentKnown: true,
    independentChats: [],
    chatId,
  });
  for (const run of runs)
    bodies.set(`run:${run.id}`, {
      id: `run:${run.id}`,
      parentId: run.parentRunId ? `run:${run.parentRunId}` : chatRoot,
      kind: run.role === "lab-orchestrator" ? "orchestrator" : "agent",
      constant: run.role === "lab-orchestrator" ? "phi" : "e",
      label: run.agentName,
      detail: run.task,
      status: run.status,
      active: isActive(run.status),
      attention: run.status === "failed" || run.status === "interrupted",
      parentKnown: true,
      independentChats: run.role === "lab-orchestrator" && !isActive(run.status) ? [...(independentByProject.get(run.projectId) ?? [])] : [],
      chatId,
      projectId: run.projectId,
      runId: run.id,
      startedAt: run.startedAt,
      finishedAt: run.finishedAt,
      updatedAt: run.updatedAt,
    });
  for (const workflow of workflows) {
    const parentId = workflowParent(workflow, runs, chatRoot);
    if (!workflow.stepStates?.length) {
      bodies.set(`workflow:${workflow.id}`, {
        id: `workflow:${workflow.id}`,
        parentId,
        kind: "workflow",
        constant: "e",
        label: workflow.workflowName,
        detail: workflow.task,
        status: workflow.status,
        active: isActive(workflow.status),
        attention: workflow.status === "failed" || workflow.status === "interrupted",
        parentKnown: true,
        independentChats: [],
        chatId,
        projectId: workflow.projectId,
        workflowId: workflow.id,
        startedAt: workflow.startedAt,
        finishedAt: workflow.finishedAt,
        updatedAt: workflow.updatedAt,
      });
    }
    for (const step of workflow.stepStates ?? []) {
      const id = `step:${workflow.id}:${step.stepId}`;
      const worker = step.runId ? bodies.get(`run:${step.runId}`) : undefined;
      if (step.runId) {
        aliases.set(`run:${step.runId}`, id);
        bodies.delete(`run:${step.runId}`);
      }
      bodies.set(id, {
        id,
        parentId: worker?.parentId ?? parentId,
        kind: worker?.kind ?? "agent",
        constant: worker?.constant ?? "e",
        label: `${step.agent} · ${step.stepId}`,
        detail: step.waitReason ?? `${workflow.workflowName} · ${step.stepId}`,
        status: step.status,
        active: workflow.status === "running" && step.status === "running",
        attention: step.status === "failed" || step.status === "blocked",
        parentKnown: true,
        independentChats: [],
        chatId,
        projectId: workflow.projectId,
        runId: step.runId,
        workflowId: workflow.id,
        stepId: step.stepId,
        startedAt: step.startedAt,
        finishedAt: step.finishedAt,
        updatedAt: step.finishedAt ?? step.startedAt ?? workflow.updatedAt,
      });
      for (const source of new Set([...step.reads, ...step.dependsOn]))
        transfers.push({from: `step:${workflow.id}:${source}`, to: id, kind: step.reads.includes(source) ? "result" : "dependency"});
    }
  }
  let unresolved = 0;
  for (const [id, body] of bodies)
    if (body.parentId) {
      const parentId = aliases.get(body.parentId) ?? body.parentId;
      const valid = parentId !== id && bodies.has(parentId);
      if (!valid) unresolved++;
      bodies.set(id, {...body, parentId: valid ? parentId : chatRoot, parentKnown: valid});
    }
  // Resolve each ancestry chain once, including cycles in damaged historical receipts.
  const settled = new Set<string>();
  for (const id of bodies.keys()) {
    const path = new Set<string>();
    let cursor: string | undefined = id;
    while (cursor && !settled.has(cursor) && !path.has(cursor)) {
      path.add(cursor);
      cursor = bodies.get(cursor)?.parentId;
    }
    if (cursor && path.has(cursor)) {
      const body = bodies.get(cursor)!;
      bodies.set(cursor, {...body, parentId: chatRoot, parentKnown: false});
      unresolved++;
    }
    for (const member of path) settled.add(member);
  }
  const rootId = rootRun ? (aliases.get(`run:${rootRun.id}`) ?? `run:${rootRun.id}`) : chatRoot;
  if (rootRun && !bodies.has(rootId))
    bodies.set(rootId, {
      id: rootId,
      kind: rootRun.role === "lab-orchestrator" ? "orchestrator" : "agent",
      constant,
      label: rootRun.agentName,
      detail: rootRun.task,
      status: rootRun.status,
      active: isActive(rootRun.status),
      attention: false,
      parentKnown: true,
      independentChats: [],
      chatId,
      runId: rootRun.id,
      projectId: rootRun.projectId,
    });
  const allChildren = new Map<string, string[]>();
  for (const body of bodies.values())
    if (body.parentId) {
      const children = allChildren.get(body.parentId) ?? [];
      children.push(body.id);
      allChildren.set(body.parentId, children);
    }
  const included = new Set<string>(),
    pending = [rootId];
  while (pending.length) {
    const id = pending.pop()!;
    if (included.has(id)) continue;
    included.add(id);
    pending.push(...(allChildren.get(id) ?? []));
  }
  for (const id of bodies.keys()) if (!included.has(id)) bodies.delete(id);
  const children = new Map<string, readonly string[]>();
  for (const [id, descendants] of allChildren)
    if (included.has(id))
      children.set(
        id,
        descendants.filter((child) => included.has(child))
      );
  return {rootId, bodies, children, transfers: transfers.filter((edge) => included.has(edge.from) && included.has(edge.to)), workflows, unresolved};
}
