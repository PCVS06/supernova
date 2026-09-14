import {Link} from "@tanstack/react-router";
import Button from "@/components/ui/button";
import {useHarnessRun} from "@/features/harnesses/hooks/api/use-harness-runs";
import {useWorkflowRun} from "@/features/harnesses/hooks/api/use-workflow-runs";
import WorkerConversation from "@/features/harnesses/components/worker-run/worker-conversation";

function WorkerPreview(props: {sessionId: string; runId: string}) {
  const {sessionId, runId} = props;
  const query = useHarnessRun(sessionId, runId);
  return (
    <div className="space-y-4">
      {query.error && (
        <p role="status" className="text-xs">
          Live updates are unavailable.{" "}
          <Button className="underline" onClick={() => void query.refetch()}>
            Retry
          </Button>
        </p>
      )}
      {query.isPending && (
        <p role="status" className="text-xs">
          Loading recorded conversation…
        </p>
      )}
      {query.data && <WorkerConversation run={query.data} stale={Boolean(query.error)} />}
      <Link className="chat-constellation-link" to="/session/$sessionId/run/$runId" params={{sessionId, runId}}>
        Open full agent conversation ↗
      </Link>
    </div>
  );
}

function WorkflowPreview(props: {sessionId: string; runId: string}) {
  const {sessionId, runId} = props;
  const query = useWorkflowRun(sessionId, runId);
  return (
    <div className="space-y-3">
      {query.error && (
        <p role="status" className="text-xs">
          Workflow updates are unavailable.{" "}
          <Button className="underline" onClick={() => void query.refetch()}>
            Retry
          </Button>
        </p>
      )}
      {query.isPending && (
        <p role="status" className="text-xs">
          Loading workflow steps…
        </p>
      )}
      {query.data && (
        <ol aria-label="Workflow steps" className="space-y-2">
          {query.data.workflow.steps.map((step, index) => {
            const record = query.data.steps.find((item) => item.stepId === step.id);
            return (
              <li key={step.id} className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span>
                  {index + 1}. {step.agent}
                </span>
                <span>
                  {query.error ? "Last seen " : ""}
                  {record?.status ?? "pending"}
                </span>
              </li>
            );
          })}
        </ol>
      )}
      <Link className="chat-constellation-link" to="/session/$sessionId/workflow/$runId" params={{sessionId, runId}}>
        Open full workflow ↗
      </Link>
    </div>
  );
}

interface OrbitRunPreviewProps {
  readonly sessionId: string;
  readonly runId?: string;
  readonly kind: "agent" | "workflow";
  readonly detail: string;
}

/** Loads one recorded worker or workflow only when its orbit is inspected. */
export default function OrbitRunPreview(props: OrbitRunPreviewProps) {
  const {sessionId, runId, kind, detail} = props;
  if (!runId) return <p className="whitespace-pre-wrap break-words text-xs">{detail}</p>;
  return kind === "workflow" ? <WorkflowPreview sessionId={sessionId} runId={runId} /> : <WorkerPreview sessionId={sessionId} runId={runId} />;
}
