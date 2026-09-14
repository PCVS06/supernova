import {useState} from "react";
import WorkflowGraph from "@/features/harnesses/components/workflow-graph/workflow-graph";
import {workflowStepSummaries} from "@supernova/contracts/harnesses/workflow-graph";
import {Link} from "@tanstack/react-router";
import type {WorkflowRun, WorkflowStep, WorkflowStepExecutionRecord} from "@supernova/contracts/harnesses/schemas";
import AgentMark from "@/features/harnesses/components/agent-mark";
import {useWorkflowRun} from "@/features/harnesses/hooks/api/use-workflow-runs";
import {agentLabel} from "@/features/harnesses/lib/agent-identity";

function StepRecord(props: {sessionId: string; record: WorkflowStepExecutionRecord; step?: WorkflowStep; position: number}) {
  const {sessionId, record, step, position} = props;
  return (
    <li className="space-y-3 rounded-xl border border-border bg-surface-raised p-4">
      <div className="flex items-center gap-4">
        <span className="font-mono text-xs text-ink-faint">{String(position + 1).padStart(2, "0")}</span>
        <AgentMark name={record.agent} working={record.status === "running"} className="size-9" />
        <div className="min-w-0 flex-1">
          <p className="text-sm">{agentLabel(record.agent)}</p>
          <p className="mt-1 text-xs text-ink-muted">
            {record.status} · attempt {record.attempt}
            {step ? ` · ${step.effects} effects` : ""}
          </p>
        </div>
        <span className="break-all font-mono text-xs text-ink-faint">{record.actionId}</span>
      </div>
      <details className="rounded-lg border border-border p-3">
        <summary className="cursor-pointer text-xs">Input received</summary>
        <pre className="mt-3 whitespace-pre-wrap break-words font-mono text-xs leading-relaxed">{JSON.stringify(record.input, undefined, 2)}</pre>
      </details>
      {record.output ? (
        <details className="rounded-lg border border-border p-3">
          <summary className="cursor-pointer text-xs">Validated output</summary>
          <pre className="mt-3 whitespace-pre-wrap break-words font-mono text-xs leading-relaxed">{JSON.stringify(record.output, undefined, 2)}</pre>
        </details>
      ) : (
        record.rawOutput !== undefined && (
          <details className="rounded-lg border border-border p-3">
            <summary className="cursor-pointer text-xs">Unvalidated output as returned</summary>
            <pre className="mt-3 whitespace-pre-wrap break-words font-mono text-xs leading-relaxed">{record.rawOutput}</pre>
          </details>
        )
      )}
      {record.error && (
        <p role="alert" className="text-xs text-danger-ink">
          {record.failureKind ? `${record.failureKind.replace(/_/g, " ")} · ` : ""}
          {record.error}
        </p>
      )}
      {record.usage && (
        <p className="text-xs text-ink-muted">
          {record.usage.inputTokens.toLocaleString()} in · {record.usage.outputTokens.toLocaleString()} out · ${record.usage.costUsd.toFixed(2)}
        </p>
      )}
      {record.runId && (
        <Link className="text-xs underline" to="/session/$sessionId/run/$runId" params={{sessionId, runId: record.runId}}>
          Inspect the specialist receipt for this attempt
        </Link>
      )}
    </li>
  );
}

function ResumeBlock(props: {run: WorkflowRun}) {
  const {run} = props;
  // The runtime refuses a rerun of the step at the cursor when that step failed and touches something outside the workspace.
  const external = run.steps.some(
    (record) => record.status !== "completed" && record.attempt > 0 && run.workflow.steps.find((step) => step.id === record.stepId)?.effects === "external"
  );
  const instruction = `Run harness_workflow with resumeRunId ${run.id}${external ? " and allowExternalRetry true" : ""}`;
  return (
    <section className="space-y-3 rounded-xl border border-border p-5">
      <h2 className="text-sm font-medium">Resume this run</h2>
      <p className="text-sm leading-relaxed text-ink-muted">
        A resume continues unfinished branches and keeps the same run. Completed steps are not run again; their outputs are handed to the steps that read them. Ask your lead in
        chat:
      </p>
      <pre className="whitespace-pre-wrap break-words rounded-lg border border-border p-4 font-mono text-xs leading-relaxed">{instruction}</pre>
      {external && (
        <p className="text-xs leading-relaxed text-ink-muted">
          The blocked step has external effects, so it is never rerun automatically. Confirm its effects outside the workspace before allowing the retry.
        </p>
      )}
    </section>
  );
}

/** Inspect one durable workflow run: the steps that actually ran, what they returned, and how to continue it. */
export default function WorkflowRunPage({sessionId, runId}: {sessionId: string; runId: string}) {
  const [selectedId, setSelectedId] = useState<string>();
  const query = useWorkflowRun(sessionId, runId);
  const run = query.data;
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="shrink-0 border-b border-border px-6 py-3">
        <Link to="/session/$sessionId" params={{sessionId}} className="text-sm text-ink-muted">
          ← Back to owning chat
        </Link>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-3xl space-y-6">
          {query.error && (
            <p role="alert" className="text-danger-ink">
              Could not load this workflow run.
            </p>
          )}
          {!run && !query.error && <p>Loading workflow run…</p>}
          {run && (
            <>
              <div>
                <h1 className="text-xl font-medium">{run.workflow.name}</h1>
                <p className="mt-1 text-sm text-ink-muted">
                  {run.status} · {run.completedCount ?? run.cursor} of {run.stepCount} complete · ${run.spentUsd.toFixed(2)} spent
                </p>
              </div>
              <section>
                <h2 className="mb-2 text-sm font-medium">Assigned task</h2>
                <p className="whitespace-pre-wrap text-sm text-ink-muted">{run.task}</p>
              </section>
              {run.error && (
                <p role="alert" className="text-sm text-danger-ink">
                  {run.error}
                </p>
              )}
              {(run.status === "failed" || run.status === "interrupted") && <ResumeBlock run={run} />}
              <WorkflowGraph steps={workflowStepSummaries(run)} selectedId={selectedId} onSelect={setSelectedId} live={run.status === "running" && !query.error} />
              <section>
                <h2 className="mb-3 text-sm font-medium">Steps</h2>
                <ol className="space-y-3" aria-label="Workflow run steps">
                  {run.steps.map((record, position) => (
                    <StepRecord key={record.stepId} sessionId={sessionId} record={record} step={run.workflow.steps.find((step) => step.id === record.stepId)} position={position} />
                  ))}
                </ol>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
