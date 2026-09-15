import type {HarnessRun} from "@supernova/contracts/harnesses/schemas";

interface WorkerActivityProps {
  run: HarnessRun;
}

/** An ordered, timestamped activity log rather than invented progress percentages. */
export default function WorkerActivity(props: WorkerActivityProps) {
  const {run} = props;
  return (
    <section aria-label="Worker activity">
      <h2 className="text-sm font-medium">Recorded activity</h2>
      <p className="mb-5 mt-1 text-xs text-ink-muted">
        Most recent {run.events.length} events · started {new Date(run.startedAt).toLocaleString()}
      </p>
      {run.events.length === 0 && <p className="text-sm text-ink-muted">No activity events recorded.</p>}
      <ol className="ml-1 border-l border-border">
        {run.events.map((event, index) => (
          <li key={`${event.at}-${index}`} className="relative py-3 pl-5">
            <span className="absolute -left-1 top-5 size-2 rounded-full bg-border-strong" />
            <time dateTime={event.at} className="block text-xs tabular-nums text-ink-faint">
              {new Date(event.at).toLocaleTimeString()}
            </time>
            <p className="mt-1 break-words text-sm text-ink">{event.message}</p>
          </li>
        ))}
      </ol>
      {run.finishedAt && <p className="mt-5 text-xs text-ink-muted">Ended {new Date(run.finishedAt).toLocaleString()}</p>}
    </section>
  );
}
