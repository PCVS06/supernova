import {useState} from "react";
import type {HarnessTranscriptEntry} from "@supernova/contracts/harnesses/schemas";
import Button from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import {cn} from "@/lib/cn";

interface WorkerToolMessageProps {
  entry: Extract<HarnessTranscriptEntry, {kind: "tool"}>;
  active: boolean;
}

/** One compact tool invocation; its recorded input and visible output are one click away. */
export default function WorkerToolMessage(props: WorkerToolMessageProps) {
  const {entry, active} = props;
  const [open, setOpen] = useState(false);
  const status = entry.status === "running" ? (active ? "Running" : "No completion recorded") : entry.status === "failed" ? "Failed" : "Completed";
  return (
    <div className="rounded-xl border border-border-muted">
      <Button variant="primary" size="md" aria-expanded={open} onClick={() => setOpen(!open)} className="gap-3">
        <Icon name={entry.status === "failed" ? "alert" : "skill"} size="sm" className={cn(entry.status === "failed" && "text-danger-ink")} />
        <span className="min-w-0 flex-1 break-words font-mono text-xs">{entry.toolName}</span>
        <span className="text-xs text-ink-muted">{status}</span>
        <Icon name={open ? "chevron-down" : "chevron-right"} size="xs" />
      </Button>
      {open && (
        <div className="space-y-4 border-t border-border-muted p-4">
          <section aria-label="Tool input">
            <h3 className="mb-2 text-xs font-medium text-ink-muted">Input</h3>
            <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words font-mono text-xs leading-6">{entry.input || "No input recorded."}</pre>
            {entry.inputTruncated && <p className="mt-2 text-xs text-ink-muted">Input shortened in this recording.</p>}
          </section>
          <section aria-label="Tool output">
            <h3 className="mb-2 text-xs font-medium text-ink-muted">{entry.status === "running" ? "Output so far" : "Output"}</h3>
            <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words font-mono text-xs leading-6">{entry.output || "No text output recorded."}</pre>
            {entry.outputTruncated && <p className="mt-2 text-xs text-ink-muted">Output shortened in this recording.</p>}
            {entry.mediaOmitted && <p className="mt-2 text-xs text-ink-muted">Non-text content is not included in this recording.</p>}
          </section>
        </div>
      )}
    </div>
  );
}
