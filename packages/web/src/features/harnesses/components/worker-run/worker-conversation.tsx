import type {HarnessRun} from "@supernova/contracts/harnesses/schemas";
import AssistantMessageContent from "@/features/sessions/components/timeline/items/assistant/assistant-message-content";
import WorkerToolMessage from "@/features/harnesses/components/worker-run/worker-tool-message";
import {agentLabel} from "@/features/harnesses/lib/agent-identity";
import AgentMark from "@/features/harnesses/components/agent-mark";

interface WorkerConversationProps {
  run: HarnessRun;
  stale?: boolean;
}

/** Renders only observed public messages. A returned result is explicitly labelled when no transcript exists. */
export default function WorkerConversation(props: WorkerConversationProps) {
  const {run, stale = false} = props;
  const active = run.status === "running" || run.status === "starting";
  const entries = run.transcript?.entries ?? [];
  const hasReturnedResult = entries.some(
    (entry) => entry.kind === "assistant" && !entry.streaming && !entry.incomplete && (entry.text === run.output || (entry.truncated && run.output.startsWith(entry.text)))
  );
  return (
    <section aria-label="Worker conversation" className="space-y-6">
      <article className="ml-auto max-w-prose rounded-2xl rounded-br-sm border border-border-muted bg-overlay-hover px-4 py-3">
        <h2 className="mb-2 text-xs font-medium text-ink-muted">Assigned task</h2>
        <p className="whitespace-pre-wrap break-words text-sm leading-7 text-ink">{run.task}</p>
      </article>
      {!run.transcript && <p className="text-xs text-ink-muted">No transcript recorded for this run. Only its saved task, activity and returned result are available.</p>}
      {Boolean(run.transcript?.omittedEntries) && (
        <p className="text-xs text-ink-muted">{run.transcript!.omittedEntries} earlier conversation entries omitted to keep this view bounded.</p>
      )}
      <ol className="space-y-5" aria-label="Recorded messages">
        {entries.map((entry) => (
          <li key={entry.id}>
            {entry.kind === "tool" ? (
              <WorkerToolMessage entry={entry} active={active && !stale} />
            ) : (
              <article>
                <div className="mb-2 flex flex-wrap items-center gap-3 text-xs text-ink-muted">
                  <AgentMark name={run.agentName} color={run.color} kind={run.role === "specialist" ? "specialist" : "lead"} className="size-6" />
                  <span className="font-medium text-ink">{agentLabel(run.agentName)}</span>
                  <time dateTime={entry.at}>{new Date(entry.at).toLocaleTimeString()}</time>
                  {(entry.streaming || entry.incomplete) && <span>{entry.streaming && active && !stale ? "Writing…" : "Partial response"}</span>}
                </div>
                <AssistantMessageContent streaming={entry.streaming && active && !stale}>{entry.text}</AssistantMessageContent>
                {entry.truncated && <p className="mt-2 text-xs text-ink-muted">Message shortened in this recording.</p>}
              </article>
            )}
          </li>
        ))}
      </ol>
      {run.output && !hasReturnedResult && (
        <article className="border-t border-border-muted pt-5">
          <h2 className="mb-3 text-xs font-medium text-ink-muted">Returned result</h2>
          <AssistantMessageContent>{run.output}</AssistantMessageContent>
        </article>
      )}
      {run.activity && <p className="text-xs text-ink-muted">{run.activity}</p>}
      <p className="text-xs leading-relaxed text-ink-faint">
        {active ? (stale ? "Live updates are unavailable." : "Updates automatically while this worker runs.") : "This worker is no longer running."}{" "}
        <time dateTime={run.updatedAt}>Last saved {new Date(run.updatedAt).toLocaleTimeString()}.</time>
        {active && entries.length === 0 && " No public response or tool activity recorded yet."}
        {!active && entries.length === 0 && !run.output && " No public response was recorded."}
      </p>
    </section>
  );
}
