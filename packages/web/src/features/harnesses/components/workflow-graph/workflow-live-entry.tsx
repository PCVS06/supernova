import {use} from "react";
import {Link} from "@tanstack/react-router";
import type {ToolTurnEvent} from "@supernova/contracts/sessions/schemas";
import Button from "@/components/ui/button";
import DelegationMark from "@/components/brand/delegation-mark";
import {WorkflowRunContext} from "@/features/harnesses/components/workflow-graph/workflow-run-context";
import {useWorkspaceMapStore} from "@/features/workspace/stores/workspace-map-store";

/** A durable workflow bookmark focuses its participants in the chat's single orbital system. */
export default function WorkflowLiveEntry(props: {event: ToolTurnEvent}) {
  const {event} = props;
  const context = use(WorkflowRunContext);
  const resultId = event.tool?.kind === "custom" && event.tool.status === "completed" ? event.tool.result.data?.workflowRunId : undefined;
  const run = context?.runs.find((item) => item.id === resultId || (event.toolCallId && item.invocationId === `root:${event.toolCallId}`));
  if (!run)
    return (
      <p role="status" className="text-xs">
        {event.tool?.status === "error" ? event.tool.error : "Workflow · waiting for the saved run"}
      </p>
    );
  const label = `${run.workflowName} · ${context?.stale ? "last saved · " : ""}${run.status} · ${run.completedCount ?? run.cursor}/${run.stepCount} complete`;
  return (
    <article className="py-2" data-workflow-run={run.id}>
      <Button
        className="group relative inline-grid size-9 place-items-center"
        aria-label={`View workflow participants: ${label}`}
        onClick={() => {
          useWorkspaceMapStore.getState().requestFocus(run.chatId, `workflow:${run.id}`);
          document
            .querySelector<HTMLElement>(`[data-chat-orbits="${CSS.escape(run.chatId)}"]`)
            ?.scrollIntoView({behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "center"});
        }}
      >
        <DelegationMark className="size-7" />
        <span className="pointer-events-none absolute left-full ml-3 w-56 text-xs opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100">{label}</span>
      </Button>
      {run.error && (
        <p role="status" className="py-2 text-xs">
          {run.error}
        </p>
      )}
      <Link className="sr-only focus:not-sr-only" to="/session/$sessionId/workflow/$runId" params={{sessionId: run.chatId, runId: run.id}}>
        Open full workflow: {run.workflowName}
      </Link>
    </article>
  );
}
