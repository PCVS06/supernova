import type {HarnessRuntimeContext} from "@supernova/contracts/harnesses/schemas";

interface ContextProvenanceProps {
  readonly captured?: boolean;
  readonly revision?: number;
  readonly runtime?: HarnessRuntimeContext;
  readonly scope: "chat" | "run";
}

/** Separates the saved configuration's origin from the runtime observation and its capture time. */
export default function ContextProvenance(props: ContextProvenanceProps) {
  const {captured, revision, runtime, scope} = props;
  const origin = captured === true ? `Captured for this ${scope}` : captured === false ? "Current defaults" : "Configuration source not recorded";
  const capturedAt = runtime ? new Date(runtime.capturedAt) : undefined;
  const validCaptureTime = capturedAt && Number.isFinite(capturedAt.getTime());

  return (
    <section aria-label="Context provenance" className="space-y-2 border-b border-border-muted px-4 py-3 text-xs text-ink-muted">
      <div>
        <h3 className="font-medium text-ink">{origin}</h3>
        {revision !== undefined && <p className="mt-1">Configuration revision {revision}</p>}
        {captured === false && <p className="mt-1">This chat has no saved configuration snapshot. These are the defaults available now.</p>}
      </div>
      {runtime ? (
        <div className="space-y-2">
          <dl className="space-y-2">
            <div>
              <dt>Runtime snapshot</dt>
              <dd className="mt-0.5 text-ink">{validCaptureTime ? <time dateTime={runtime.capturedAt}>{capturedAt.toLocaleString()}</time> : "Capture time not recorded"}</dd>
            </div>
            {runtime.model && (
              <div>
                <dt>Model at capture</dt>
                <dd className="mt-0.5 break-words text-ink">
                  {runtime.model.providerId} / {runtime.model.id}
                  {runtime.model.thinkingLevel && ` · ${runtime.model.thinkingLevel}`}
                </dd>
              </div>
            )}
          </dl>
          <p>Context may have changed since this runtime snapshot.</p>
        </div>
      ) : (
        <p>No runtime snapshot recorded.</p>
      )}
    </section>
  );
}
