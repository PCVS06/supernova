import type {HarnessRun} from "@supernova/contracts/harnesses/schemas";

interface WorkerRunContextProps {
  run: HarnessRun;
}

/** Execution identity stays separate from the worker's public chat and captured instructions. */
export default function WorkerRunContext(props: WorkerRunContextProps) {
  const {run} = props;
  return (
    <dl className="grid gap-4 rounded-xl bg-overlay-hover p-4 text-sm sm:grid-cols-2">
      <div>
        <dt className="mb-1 text-xs text-ink-muted">Working folder</dt>
        <dd className="break-all font-mono text-xs">{run.projectPath}</dd>
      </div>
      <div>
        <dt className="mb-1 text-xs text-ink-muted">Model & effort</dt>
        <dd className="break-words">{run.model ? `${run.model.providerId} / ${run.model.id} · ${run.model.thinkingLevel ?? "default"}` : "Not observed for this run"}</dd>
      </div>
      <div>
        <dt className="mb-1 text-xs text-ink-muted">Configuration</dt>
        <dd>Revision {run.revision}</dd>
      </div>
      <div>
        <dt className="mb-1 text-xs text-ink-muted">Run</dt>
        <dd className="break-all font-mono text-xs">{run.id}</dd>
      </div>
    </dl>
  );
}
