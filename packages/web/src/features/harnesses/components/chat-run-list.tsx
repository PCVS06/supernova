import {Link} from "@tanstack/react-router";
import type {HarnessRunSummary, WorkflowRunSummary} from "@supernova/contracts/harnesses/schemas";
import Icon from "@/components/ui/icon";
import AgentMark from "@/features/harnesses/components/agent-mark";
import {agentLabel} from "@/features/harnesses/lib/agent-identity";
import {useHarnessRuns} from "@/features/harnesses/hooks/api/use-harness-runs";
import {useWorkflowRuns} from "@/features/harnesses/hooks/api/use-workflow-runs";

/** Delegated work reads as a tree: one thin guide line per level, one compact row per run. */
const branchClassName = "ml-3 border-l border-border-muted pl-1.5";
const rowClassName = "flex h-7 min-w-0 items-center gap-1.5 rounded-md px-1.5 hover:bg-overlay-hover";
const statusClassName = "shrink-0 font-mono text-[10px] text-ink-faint";

function WorkflowEntry({run}: {run: WorkflowRunSummary}) {
  return (
    <li>
      <Link to="/session/$sessionId/workflow/$runId" params={{sessionId: run.chatId, runId: run.id}} title={`${run.task}\n${run.status}`} className={rowClassName}>
        <Icon name="workflow" size="xs" className="shrink-0 text-ink-faint" />
        <span className="min-w-0 flex-1 truncate text-[11px] text-ink-muted">{run.workflowName}</span>
        <span className={statusClassName}>
          {run.status} · {run.cursor}/{run.stepCount}
        </span>
      </Link>
    </li>
  );
}

function RunBranch({run, runs, depth = 0}: {run: HarnessRunSummary; runs: readonly HarnessRunSummary[]; depth?: number}) {
  const running = run.status === "starting" || run.status === "running";
  const children = runs.filter((child) => child.parentRunId === run.id);
  return (
    <li>
      <Link to="/session/$sessionId/run/$runId" params={{sessionId: run.chatId, runId: run.id}} title={`${run.task}\n${run.activity ?? run.status}`} className={rowClassName}>
        <AgentMark
          name={run.role === "specialist" ? run.agentName : run.projectId}
          color={run.color}
          kind={run.role === "specialist" ? "specialist" : "lead"}
          working={running}
          className="size-4 shrink-0"
        />
        <span className="min-w-0 flex-1 truncate text-[11px] text-ink-muted">{agentLabel(run.agentName)}</span>
        <span className={statusClassName}>
          {run.role === "specialist" ? "Worker" : "Lab lead"} · {run.status}
        </span>
      </Link>
      {depth < 4 && children.length > 0 && (
        <ul className={branchClassName}>
          {children.map((child) => (
            <RunBranch key={child.id} run={child} runs={runs} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}

/** Real delegated work, nested under the owning chat and parent worker, with workflow runs above their workers. */
export default function ChatRunList({sessionId, live = false}: {sessionId: string; live?: boolean}) {
  const query = useHarnessRuns(sessionId, live);
  const workflows = useWorkflowRuns(sessionId, live);
  if (query.error)
    return (
      <p role="status" className="ml-3 border-l border-border-muted py-1 pl-2 text-[10px] text-danger-ink">
        Worker activity unavailable
      </p>
    );
  if (!query.data?.length && !workflows.data?.length) return null;
  return (
    <>
      {!!workflows.data?.length && (
        <ul aria-label="Workflow runs in this chat" className={branchClassName}>
          {workflows.data.map((run) => (
            <WorkflowEntry key={run.id} run={run} />
          ))}
        </ul>
      )}
      {!!query.data?.length && (
        <ul aria-label="Workers in this chat" className={branchClassName}>
          {query.data
            .filter((run) => !run.parentRunId || !query.data.some((parent) => parent.id === run.parentRunId))
            .map((run) => (
              <RunBranch key={run.id} run={run} runs={query.data} />
            ))}
        </ul>
      )}
    </>
  );
}
