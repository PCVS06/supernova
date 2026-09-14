import type {HarnessRun} from "@supernova/contracts/harnesses/schemas";
import {useState} from "react";
import AssistantMessageContent from "@/features/sessions/components/timeline/items/assistant/assistant-message-content";
import MathResponse from "@/features/sessions/components/timeline/items/assistant/math-response";
import {MathResponseContext} from "@/features/sessions/components/timeline/math-response-context";
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
  const constant = run.role === "specialist" ? "e" : "phi";
  const [revealedTurns] = useState(() => new Set<string>());
  const entries = run.transcript?.entries ?? [];
  const latest = entries.findLast((entry) => entry.kind === "assistant" && entry.text);
  const result = run.output || (latest?.kind === "assistant" ? latest.text : "");
  return (
    <MathResponseContext value={{constant, revealedTurns}}>
      <section aria-label="Worker conversation" className="space-y-2">
        {result ? (
          <article className="mb-6" aria-label={active ? "Latest response" : "Agent result"}>
            {!run.output && latest?.kind === "assistant" && (latest.incomplete || latest.streaming) && (!active || stale) && (
              <p className="mb-2 text-xs text-ink-muted">Partial response</p>
            )}
            {!run.output && latest?.kind === "assistant" && latest.truncated && <p className="mb-2 text-xs text-ink-muted">Message shortened in this recording.</p>}
            <MathResponse live={active && !stale && latest?.kind === "assistant" && latest.streaming === true} text={result} turnId={`${run.id}:result`}>
              <AssistantMessageContent streaming={active && !stale && latest?.kind === "assistant" && latest.streaming}>{result}</AssistantMessageContent>
            </MathResponse>
          </article>
        ) : (
          <p className="text-sm text-ink-muted">{active ? "Working on the assignment…" : "No result was recorded."}</p>
        )}
        {stale && (
          <p role="status" className="text-xs text-ink-muted">
            Last saved state · updates unavailable.
          </p>
        )}
        <details className="text-xs">
          <summary className="cursor-pointer py-2 text-ink-muted">Assignment</summary>
          <p className="py-2 whitespace-pre-wrap break-words text-sm leading-7 text-ink">{run.task}</p>
        </details>
        <details className="text-xs">
          <summary className="cursor-pointer py-2 text-ink-muted">Conversation</summary>
          {!run.transcript && <p className="text-xs text-ink-muted">No transcript recorded for this run. Only its saved task, activity and returned result are available.</p>}
          {Boolean(run.transcript?.omittedEntries) && (
            <p className="text-xs text-ink-muted">{run.transcript!.omittedEntries} earlier conversation entries omitted to keep this view bounded.</p>
          )}
          <ol className="space-y-5" aria-label="Recorded messages">
            {entries
              .filter((entry) => entry.kind !== "assistant" || entry.text !== result)
              .map((entry) => (
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
                      {entry.text && (
                        <MathResponse live={entry.streaming && active && !stale} text={entry.text} turnId={`${run.id}:${entry.id}`}>
                          <AssistantMessageContent streaming={entry.streaming && active && !stale}>{entry.text}</AssistantMessageContent>
                        </MathResponse>
                      )}
                      {entry.truncated && <p className="mt-2 text-xs text-ink-muted">Message shortened in this recording.</p>}
                    </article>
                  )}
                </li>
              ))}
          </ol>
          <p className="pt-3 text-xs text-ink-faint">
            <time dateTime={run.updatedAt}>Saved {new Date(run.updatedAt).toLocaleTimeString()}.</time>
          </p>
        </details>
      </section>
    </MathResponseContext>
  );
}
