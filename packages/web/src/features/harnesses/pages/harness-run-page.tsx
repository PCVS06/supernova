import {Link} from "@tanstack/react-router";
import AgentMark from "@/features/harnesses/components/agent-mark";
import InstructionReceipt from "@/features/harnesses/components/instruction-receipt";
import {useHarnessRun} from "@/features/harnesses/hooks/api/use-harness-runs";
import {agentLabel} from "@/features/harnesses/lib/agent-identity";

/** Inspect one worker without confusing its role definition with its execution. */
export default function HarnessRunPage({sessionId, runId}: {sessionId: string; runId: string}) {
  const query = useHarnessRun(sessionId, runId);
  const run = query.data;
  return (
    <div className="flex min-h-0 flex-1 flex-col pt-12">
      <header className="shrink-0 border-b border-border px-6 py-3">
        <Link to="/session/$sessionId" params={{sessionId}} className="text-sm text-ink-muted">
          ← Back to owning chat
        </Link>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-3xl space-y-6">
          {query.error && (
            <p role="alert" className="text-danger-ink">
              Could not load this worker's receipt.
            </p>
          )}
          {!run && !query.error && <p>Loading worker…</p>}
          {run && (
            <>
              <div className="flex items-center gap-4">
                <AgentMark
                  name={run.role === "specialist" ? run.agentName : run.projectId}
                  color={run.color}
                  kind={run.role === "specialist" ? "specialist" : "lead"}
                  working={run.status === "running"}
                  className="size-14"
                />
                <div>
                  <h1 className="text-xl font-medium">{agentLabel(run.agentName)}</h1>
                  <p className="mt-1 text-sm text-ink-muted">
                    {run.role === "specialist" ? "Specialist worker" : "Delegated lab lead"} · {run.status}
                  </p>
                </div>
              </div>
              {run.parentRunId && (
                <Link className="text-xs underline" to="/session/$sessionId/run/$runId" params={{sessionId, runId: run.parentRunId}}>
                  Delegated by another worker · inspect parent
                </Link>
              )}
              <section>
                <h2 className="mb-2 text-sm font-medium">Assigned task</h2>
                <p className="whitespace-pre-wrap text-sm text-ink-muted">{run.task}</p>
              </section>
              <dl className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-2 rounded-xl border border-border p-4 text-xs">
                <dt>Project</dt>
                <dd>{run.projectName}</dd>
                <dt>Working folder</dt>
                <dd className="break-all font-mono">{run.projectPath}</dd>
                <dt>Model / effort</dt>
                <dd>{run.model ? `${run.model.providerId}/${run.model.id} · ${run.model.thinkingLevel ?? "default"}` : "Not selected before startup failed"}</dd>
                <dt>Configuration</dt>
                <dd>Revision {run.revision}</dd>
                <dt>Activity</dt>
                <dd>{run.activity}</dd>
              </dl>
              <details className="rounded-lg border border-border p-3">
                <summary className="cursor-pointer text-sm">Activity history · {run.events.length} events</summary>
                <ul className="mt-3 space-y-2 text-xs text-ink-muted">
                  {run.events.map((event, index) => (
                    <li key={index}>
                      {new Date(event.at).toLocaleTimeString()} · {event.message}
                    </li>
                  ))}
                </ul>
              </details>
              {run.error && (
                <p role="alert" className="text-sm text-danger-ink">
                  {run.error}
                </p>
              )}
              <section>
                <h2 className="mb-2 text-sm font-medium">Result</h2>
                <pre className="whitespace-pre-wrap break-words rounded-xl border border-border p-4 font-mono text-xs leading-relaxed">
                  {run.output ||
                    (run.status === "running" || run.status === "starting" ? "Working. The final result will appear here when the worker finishes." : "No result returned.")}
                </pre>
              </section>
              <section>
                <h2 className="mb-3 text-sm font-medium">Instructions & resources used</h2>
                <InstructionReceipt layers={run.instructions} runtime={run.runtime} />
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
