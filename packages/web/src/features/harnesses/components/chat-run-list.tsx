import {Link, useLocation} from "@tanstack/react-router";
import type {HarnessRunSummary, WorkflowRunSummary} from "@supernova/contracts/harnesses/schemas";
import Icon from "@/components/ui/icon";
import AgentMark from "@/features/harnesses/components/agent-mark";
import {agentLabel} from "@/features/harnesses/lib/agent-identity";
import {useHarnessRuns} from "@/features/harnesses/hooks/api/use-harness-runs";
import {useWorkflowRuns} from "@/features/harnesses/hooks/api/use-workflow-runs";
import LedgerRunStatus from "@/features/sidebar/components/ledger-run-status";
import {ledgerPrimaryClassName, ledgerRowClassName} from "@/features/sidebar/lib/ledger-styles";
import {cn} from "@/lib/cn";

/** Completed and cancelled work stays available without displacing current work. */
function isPastRun(run: HarnessRunSummary | WorkflowRunSummary): boolean {
  return run.status === "completed" || run.status === "cancelled";
}

interface WorkflowEntryProps {
  run: WorkflowRunSummary;
  pathname: string;
  detailed: boolean;
  stale: boolean;
}

function WorkflowEntry(props: WorkflowEntryProps) {
  const {run, pathname, detailed, stale} = props;
  const selected = pathname === `/session/${run.chatId}/workflow/${run.id}`;
  return (
    <li>
      <Link
        to="/session/$sessionId/workflow/$runId"
        params={{sessionId: run.chatId, runId: run.id}}
        aria-label={`Open workflow: ${run.workflowName}`}
        aria-current={selected ? "page" : undefined}
        title={run.task}
        className={cn(ledgerRowClassName, ledgerPrimaryClassName, "gap-2 py-1.5", detailed && "rounded-none px-3 py-3", selected && "bg-overlay-pressed text-ink")}
      >
        <Icon name="workflow" size="xs" className="mt-0.5 shrink-0 text-ink-faint" />
        <span className="min-w-0 flex-1">
          <span className="line-clamp-2 break-words text-xs font-medium leading-5">{run.workflowName}</span>
          <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="text-xs tabular-nums text-ink-faint">
              {run.cursor}/{run.stepCount} steps
            </span>
          </span>
        </span>
        <LedgerRunStatus status={run.status} compact={!detailed} stale={stale} />
      </Link>
    </li>
  );
}

interface WorkerEntryProps {
  run: HarnessRunSummary;
  parent?: HarnessRunSummary;
  pathname: string;
  detailed: boolean;
  stale: boolean;
}

function WorkerEntry(props: WorkerEntryProps) {
  const {run, parent, pathname, detailed, stale} = props;
  const working = run.status === "starting" || run.status === "running";
  const selected = pathname === `/session/${run.chatId}/run/${run.id}`;
  return (
    <li>
      <Link
        to="/session/$sessionId/run/$runId"
        params={{sessionId: run.chatId, runId: run.id}}
        aria-label={`Open ${agentLabel(run.agentName)} conversation`}
        aria-current={selected ? "page" : undefined}
        title={`${run.role === "specialist" ? "Worker" : "Lab lead"} · ${run.projectName}${parent ? ` · via ${agentLabel(parent.agentName)}` : ""}\n${run.task}${run.activity ? `\n${run.activity}` : ""}\nRead-only conversation, activity and result`}
        className={cn(ledgerRowClassName, ledgerPrimaryClassName, "gap-2 py-1.5", detailed && "rounded-none px-3 py-3", selected && "bg-overlay-pressed text-ink")}
      >
        <AgentMark
          name={run.role === "specialist" ? run.agentName : run.projectId}
          color={run.color}
          kind={run.role === "specialist" ? "specialist" : "lead"}
          working={working && !stale}
          className={cn("size-4 shrink-0", detailed && "size-5")}
        />
        <span className="min-w-0 flex-1">
          <span className="line-clamp-2 break-words text-xs font-medium leading-5">{agentLabel(run.agentName)}</span>
          {parent && detailed && (
            <span className="block truncate text-xs leading-5 text-ink-faint" title={`Delegated by ${agentLabel(parent.agentName)}`}>
              via {agentLabel(parent.agentName)}
            </span>
          )}
          {detailed && (
            <span className="mt-0.5 line-clamp-2 break-words text-xs leading-4 text-ink-muted" title={run.task}>
              {run.task}
            </span>
          )}
          {detailed && run.activity && !isPastRun(run) && (
            <span className="mt-1 block truncate text-xs text-ink-faint" title={run.activity}>
              {run.activity}
            </span>
          )}
        </span>
        <LedgerRunStatus status={run.status} compact={!detailed} stale={stale} />
      </Link>
    </li>
  );
}

interface ChatRunListProps {
  sessionId: string;
  live?: boolean;
  /** The same recorded activity can also appear beside the owning conversation. */
  variant?: "sidebar" | "conversation";
}

/** A chat owns its activity. Worker details are not independent editable conversations. */
export default function ChatRunList(props: ChatRunListProps) {
  const {sessionId, live = false, variant = "sidebar"} = props;
  const query = useHarnessRuns(sessionId, live);
  const workflows = useWorkflowRuns(sessionId, live);
  const {pathname} = useLocation();
  const runs = query.data ?? [];
  const runById = new Map(runs.map((run) => [run.id, run]));
  const detailed = variant === "conversation";
  const workflowRuns = workflows.data ?? [];
  const currentWorkers = runs.filter((run) => !isPastRun(run));
  const pastWorkers = runs.filter(isPastRun);
  const currentWorkflows = workflowRuns.filter((run) => !isPastRun(run));
  const pastWorkflows = workflowRuns.filter(isPastRun);
  const pastCount = pastWorkers.length + pastWorkflows.length;
  const workingCount = currentWorkers.filter((run) => run.status === "starting" || run.status === "running").length;
  const currentCount = currentWorkers.length + currentWorkflows.length;
  const pastSelected =
    pastWorkers.some((run) => pathname === `/session/${sessionId}/run/${run.id}`) || pastWorkflows.some((run) => pathname === `/session/${sessionId}/workflow/${run.id}`);

  if (!runs.length && !workflowRuns.length && !query.error && !workflows.error && !(live && (query.isPending || workflows.isPending))) return null;
  return (
    <div
      aria-label={detailed ? "Delegated work" : "Chat activity"}
      className={cn(detailed ? "overflow-hidden rounded-xl border border-border-muted bg-surface-sidebar" : "mb-1 py-1 pl-2")}
    >
      {query.error && (
        <p role="status" className="px-2 py-1 text-xs text-danger-ink">
          Worker activity unavailable{runs.length > 0 ? " · showing last known state" : ""}
        </p>
      )}
      {workflows.error && (
        <p role="status" className="px-2 py-1 text-xs text-danger-ink">
          Workflow activity unavailable{workflowRuns.length > 0 ? " · showing last known state" : ""}
        </p>
      )}
      {live && (query.isPending || workflows.isPending) && (
        <p role="status" className="px-2 py-1 text-xs text-ink-faint">
          Loading activity…
        </p>
      )}
      {(currentCount > 0 || detailed) && (
        <div className={cn("flex flex-wrap items-center justify-between gap-1 px-2 pb-0.5 pt-1 text-xs text-ink-faint", detailed && "border-b border-border-muted px-3 py-2.5")}>
          {detailed && (
            <span className="inline-flex items-center gap-1.5">
              <Icon name="workflow" size="xs" />
              Delegated work
            </span>
          )}
          <span>
            {workingCount > 0
              ? `${workingCount} ${workingCount === 1 ? "agent" : "agents"} ${query.error ? "last seen working" : "working"}`
              : currentWorkers.length > 0
                ? "Needs attention"
                : currentWorkflows.length > 0
                  ? "Workflow"
                  : "Past activity"}
          </span>
        </div>
      )}
      {currentWorkflows.length > 0 && (
        <ul aria-label="Workflow runs in this chat" className={cn(detailed && "divide-y divide-border-muted")}>
          {currentWorkflows.map((run) => (
            <WorkflowEntry key={run.id} run={run} pathname={pathname} detailed={detailed} stale={Boolean(workflows.error)} />
          ))}
        </ul>
      )}
      {currentWorkers.length > 0 && (
        <ul aria-label="Workers in this chat" className={cn(detailed && "divide-y divide-border-muted")}>
          {currentWorkers.map((run) => (
            <WorkerEntry
              key={run.id}
              run={run}
              parent={run.parentRunId ? runById.get(run.parentRunId) : undefined}
              pathname={pathname}
              detailed={detailed}
              stale={Boolean(query.error)}
            />
          ))}
        </ul>
      )}
      {pastCount > 0 && (
        <details key={`${sessionId}:${pastSelected}`} open={pastSelected || undefined} className="group/history">
          <summary className="flex min-h-7 cursor-pointer list-none items-center gap-1.5 rounded-lg px-2 text-xs text-ink-faint transition-colors hover:bg-overlay-hover hover:text-ink focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-border-strong [&::-webkit-details-marker]:hidden">
            <Icon name="chevron-right" size="xs" className="transition-transform duration-150 group-open/history:rotate-90 motion-reduce:transition-none" />
            <span className="flex-1">Past activity</span>
            <span className="tabular-nums">{pastCount}</span>
          </summary>
          <ul aria-label="Past activity in this chat">
            {pastWorkflows.map((run) => (
              <WorkflowEntry key={run.id} run={run} pathname={pathname} detailed={detailed} stale={Boolean(workflows.error)} />
            ))}
            {pastWorkers.map((run) => (
              <WorkerEntry
                key={run.id}
                run={run}
                parent={run.parentRunId ? runById.get(run.parentRunId) : undefined}
                pathname={pathname}
                detailed={detailed}
                stale={Boolean(query.error)}
              />
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
