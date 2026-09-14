import {lazy, Suspense} from "react";
import {Link} from "@tanstack/react-router";
import Button from "@/components/ui/button";
import {useWorkflowRun} from "@/features/harnesses/hooks/api/use-workflow-runs";
import type {OrbitBody} from "@/features/sessions/lib/orbits/orbit-model";

const RunPreview = lazy(() => import("@/features/sessions/components/orbits/orbit-run-preview"));

function StepResult(props: {body: OrbitBody}) {
  const {body} = props;
  const query = useWorkflowRun(body.chatId, body.workflowId!);
  const record = query.data?.steps.find((step) => step.stepId === body.stepId);
  const definition = query.data?.workflow.steps.find((step) => step.id === body.stepId);
  return (
    <div className="space-y-3 text-xs">
      {query.error && (
        <p role="status">
          Step details unavailable.{" "}
          <Button className="underline" onClick={() => void query.refetch()}>
            Retry
          </Button>
        </p>
      )}
      {!record && !query.error && <p>{query.isPending ? "Loading recorded result…" : "This step has not started yet."}</p>}
      {record && (
        <>
          <p>{record.error ?? record.waitReason ?? record.status}</p>
          {(record.output || record.rawOutput) && (
            <pre className="whitespace-pre-wrap break-words font-sans leading-6">{record.output ? JSON.stringify(record.output, null, 2) : record.rawOutput}</pre>
          )}
          <details>
            <summary className="cursor-pointer py-2">Assignment and inputs</summary>
            <p className="py-2">{definition?.instructions}</p>
            <pre className="whitespace-pre-wrap break-words">{JSON.stringify(record.input, null, 2)}</pre>
          </details>
          {record.runId && (
            <Link className="chat-constellation-link" to="/session/$sessionId/run/$runId" params={{sessionId: body.chatId, runId: record.runId}}>
              Open agent conversation
            </Link>
          )}
        </>
      )}
      <Link className="chat-constellation-link" to="/session/$sessionId/workflow/$runId" params={{sessionId: body.chatId, runId: body.workflowId!}}>
        Open full workflow
      </Link>
    </div>
  );
}

/** Opens public results on demand without loading every orbiting worker's transcript. */
export default function OrbitInspector(props: {body: OrbitBody; onClose: () => void}) {
  const {body, onClose} = props;
  return (
    <section className="chat-orbit-inspector" aria-label={`Selected work: ${body.label}`}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium">{body.label}</h3>
          <p className="mt-1 text-xs text-ink-muted">{body.status}</p>
        </div>
        <Button aria-label="Close selected work" onClick={onClose}>
          ×
        </Button>
      </div>
      {!body.parentKnown && <p className="mb-3 text-xs text-ink-muted">The delegating record is unavailable. This work remains accessible without an inferred connection.</p>}
      {body.independentChats.length > 0 && (
        <details className="mb-3 text-xs">
          <summary className="cursor-pointer">Work continues in another chat</summary>
          <p className="py-2">These are separate conversations. Their workers are not part of this assignment.</p>
          {body.independentChats.slice(0, 8).map((sessionId) => (
            <Link key={sessionId} className="chat-constellation-link mr-4" to="/session/$sessionId" params={{sessionId}}>
              Open active chat
            </Link>
          ))}
        </details>
      )}
      {body.stepId && body.workflowId ? (
        <StepResult key={body.id} body={body} />
      ) : (
        <Suspense fallback={<p className="text-xs">Loading recorded work…</p>}>
          <RunPreview sessionId={body.chatId} runId={body.workflowId ?? body.runId} kind={body.workflowId ? "workflow" : "agent"} detail={body.detail} />
        </Suspense>
      )}
    </section>
  );
}
