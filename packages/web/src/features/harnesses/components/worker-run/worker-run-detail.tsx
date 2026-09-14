import {useState} from "react";
import {Link} from "@tanstack/react-router";
import type {HarnessRun} from "@supernova/contracts/harnesses/schemas";
import Icon from "@/components/ui/icon";
import AgentMark from "@/features/harnesses/components/agent-mark";
import InstructionReceipt from "@/features/harnesses/components/instruction-receipt";
import WorkerConversation from "@/features/harnesses/components/worker-run/worker-conversation";
import WorkerActivity from "@/features/harnesses/components/worker-run/worker-activity";
import WorkerRunContext from "@/features/harnesses/components/worker-run/worker-run-context";
import {agentLabel} from "@/features/harnesses/lib/agent-identity";
import {cn} from "@/lib/cn";
import ChatConstellation from "@/features/sessions/components/constellation/chat-constellation";
import ConstantOrb from "@/components/brand/constant-orb";

const STATUS_LABELS = {starting: "Starting", running: "Running", completed: "Completed", failed: "Failed", cancelled: "Cancelled", interrupted: "Interrupted"} as const;

interface WorkerRunDetailProps {
  run: HarnessRun;
  stale?: boolean;
}

/** A single hierarchy: worker identity, public conversation, then opt-in activity and context. */
export default function WorkerRunDetail(props: WorkerRunDetailProps) {
  const {run, stale = false} = props;
  const [contextOpen, setContextOpen] = useState(false);
  const active = run.status === "running" || run.status === "starting";
  const failed = run.status === "failed" || run.status === "interrupted";
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 px-6 py-4">
        <div className="mx-auto max-w-4xl">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <AgentMark
                name={run.role === "specialist" ? run.agentName : run.projectId}
                color={run.color}
                kind={run.role === "specialist" ? "specialist" : "lead"}
                working={active && !stale}
                className="size-10 shrink-0"
              />
              <div className="min-w-0">
                <p className="mb-1 text-xs text-ink-muted">
                  {run.projectName} · {run.role === "specialist" ? "Specialist" : "Delegated project lead"}
                </p>
                <h1 className="break-words text-base font-medium text-ink">{agentLabel(run.agentName)}</h1>
              </div>
            </div>
            <span className={cn("inline-flex items-center gap-2 py-1.5 text-xs text-ink-muted", failed && "text-danger-ink")}>
              <Icon
                name={failed ? "alert" : run.status === "completed" ? "check" : active && !stale ? "loader" : "stop"}
                size="xs"
                className={cn(active && !stale && "animate-spin motion-reduce:animate-none")}
              />
              {STATUS_LABELS[run.status]}
              {stale && " · last observed"}
            </span>
          </div>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto max-w-4xl">
          {run.error && (
            <p role="alert" className="mb-6 rounded-xl border border-border bg-overlay-hover p-4 text-sm text-danger-ink">
              {run.error}
            </p>
          )}
          <WorkerConversation run={run} stale={stale} />
          <ChatConstellation
            key={run.id}
            context={{sessionId: run.chatId, projectPath: run.projectPath, title: run.agentName}}
            rootRun={run}
            constant={run.role === "specialist" ? "e" : "phi"}
            busy={active}
            stale={stale}
            anchor={<ConstantOrb constant={run.role === "specialist" ? "e" : "phi"} className="size-16" state={active && !stale ? "working" : "still"} />}
            status={STATUS_LABELS[run.status]}
          />
          <details className="mt-4 text-xs">
            <summary className="cursor-pointer py-2 text-ink-muted">Activity</summary>
            <div className="py-3">
              <WorkerActivity run={run} />
            </div>
          </details>
          <details className="mt-2 text-xs" onToggle={(event) => setContextOpen(event.currentTarget.open)}>
            <summary className="cursor-pointer py-2 text-ink-muted">Context</summary>
            {contextOpen && (
              <section aria-label="Worker context" className="space-y-6 py-3">
                {run.parentRunId && (
                  <Link to="/session/$sessionId/run/$runId" params={{sessionId: run.chatId, runId: run.parentRunId}} className="underline">
                    View delegating worker
                  </Link>
                )}
                <WorkerRunContext run={run} />
                <InstructionReceipt layers={run.instructions} runtime={run.runtime} />
              </section>
            )}
          </details>
        </div>
      </div>
    </div>
  );
}
