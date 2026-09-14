import {Link, useLocation} from "@tanstack/react-router";
import AgentMark from "@/features/harnesses/components/agent-mark";
import {agentLabel} from "@/features/harnesses/lib/agent-identity";
import {useHarnessRuns} from "@/features/harnesses/hooks/api/use-harness-runs";
import {useWorkspaceOverview} from "@/features/workspace/hooks/use-workspace-overview";
import {cn} from "@/lib/cn";
import {ledgerMarkClassName} from "@/features/sidebar/lib/ledger-styles";

/** Loads full agent history only when its owning chat is expanded. */
export default function ChatAgentList(props: {sessionId: string; live: boolean}) {
  const {sessionId, live} = props;
  const query = useHarnessRuns(sessionId, live);
  const overview = useWorkspaceOverview();
  const {pathname} = useLocation();
  const runs = query.data ?? overview.data?.runs.filter((run) => run.chatId === sessionId) ?? [];
  const stale = Boolean(query.error);
  return (
    <ul aria-label="Agents in this chat" className="ml-3 space-y-0.5 border-l border-border-muted">
      {query.error && (
        <li role="status" className="px-2 py-1 text-xs">
          Agent history unavailable · last saved
        </li>
      )}
      {query.isPending && !runs.length && (
        <li role="status" className="px-2 py-1 text-xs">
          Loading agents…
        </li>
      )}
      {runs.map((run) => {
        const selected = pathname === `/session/${sessionId}/run/${run.id}`;
        const active = !stale && (run.status === "starting" || run.status === "running");
        return (
          <li key={run.id} data-sidebar-level="agent">
            <Link
              to="/session/$sessionId/run/$runId"
              params={{sessionId, runId: run.id}}
              aria-current={selected ? "page" : undefined}
              aria-label={`Open ${agentLabel(run.agentName)} conversation`}
              title={`${agentLabel(run.agentName)} · ${run.status}${stale ? " · last saved" : ""}\n${run.task}`}
              className={cn(
                "flex min-w-0 items-center gap-1 rounded-md px-2 text-xs hover:bg-overlay-hover focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-border-strong",
                selected && "bg-overlay-pressed"
              )}
            >
              <span className="w-3 shrink-0" aria-hidden="true" />
              <span className={ledgerMarkClassName}>
                <AgentMark name={run.agentName} kind={run.role === "specialist" ? "specialist" : "lead"} working={active} className="size-4 shrink-0" />
              </span>
              <span className="min-w-0 flex-1 truncate">{agentLabel(run.agentName)}</span>
              <span className="sr-only">{run.status}</span>
              {(run.status === "failed" || run.status === "interrupted") && <span aria-hidden="true">!</span>}
              {active && <span className="size-1 rounded-full bg-white" aria-hidden="true" />}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
