import {Link} from "@tanstack/react-router";
import type {HarnessRunSummary} from "@supernova/contracts/harnesses/schemas";
import AgentMark from "@/features/harnesses/components/agent-mark";
import {agentLabel} from "@/features/harnesses/lib/agent-identity";
import {useHarnessRuns} from "@/features/harnesses/hooks/api/use-harness-runs";

function RunBranch({run, runs, depth = 0}: {run: HarnessRunSummary; runs: readonly HarnessRunSummary[]; depth?: number}) {
  const running = run.status === "starting" || run.status === "running";
  return (
    <li>
      <Link
        to="/session/$sessionId/run/$runId"
        params={{sessionId: run.chatId, runId: run.id}}
        title={`${run.task}\n${run.activity ?? run.status}`}
        className="flex min-w-0 items-center gap-2 rounded-md px-1 py-1.5 hover:bg-overlay-hover"
      >
        <AgentMark
          name={run.role === "specialist" ? run.agentName : run.projectId}
          color={run.color}
          kind={run.role === "specialist" ? "specialist" : "lead"}
          working={running}
          className="size-6 shrink-0"
        />
        <div className="min-w-0 text-xs">
          <span className="block truncate text-ink-muted">{agentLabel(run.agentName)}</span>
          <span className="block truncate text-[10px] text-ink-faint">
            {run.role === "specialist" ? "Worker" : "Lab lead"} · {run.status}
          </span>
        </div>
      </Link>
      {depth < 4 && (
        <ul className="ml-3 border-l border-border pl-2">
          {runs
            .filter((child) => child.parentRunId === run.id)
            .map((child) => (
              <RunBranch key={child.id} run={child} runs={runs} depth={depth + 1} />
            ))}
        </ul>
      )}
    </li>
  );
}

/** Real delegated work, nested under the owning chat and parent worker. */
export default function ChatRunList({sessionId, live = false}: {sessionId: string; live?: boolean}) {
  const query = useHarnessRuns(sessionId, live);
  if (query.error)
    return (
      <p role="status" className="ml-7 py-1 text-[10px] text-danger-ink">
        Worker activity unavailable
      </p>
    );
  if (!query.data?.length) return null;
  return (
    <ul aria-label="Workers in this chat" className="ml-7 border-l border-border pl-2">
      {query.data
        .filter((run) => !run.parentRunId || !query.data.some((parent) => parent.id === run.parentRunId))
        .map((run) => (
          <RunBranch key={run.id} run={run} runs={query.data} />
        ))}
    </ul>
  );
}
