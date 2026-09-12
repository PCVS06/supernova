import type {HarnessPromptLayer, HarnessRuntimeContext} from "@supernova/contracts/harnesses/schemas";
import type {ReactNode} from "react";
import Icon from "@/components/ui/icon";

/** Names an instruction layer by the scope a user needs to reason about. */
function instructionScope(kind: HarnessPromptLayer["kind"]): string {
  if (kind === "shared") return "Harness";
  if (kind === "project") return "Project";
  if (kind === "role") return "Role";
  return "Context";
}

interface ResourceListProps {
  readonly title: string;
  readonly values: readonly string[];
}

function ResourceList(props: ResourceListProps) {
  const {title, values} = props;
  if (values.length === 0) return null;

  return (
    <section className="space-y-2 py-3 first:pt-0 last:pb-0">
      <h4 className="text-xs font-medium text-ink">
        {title} <span className="ml-1 font-normal text-ink-faint">{values.length}</span>
      </h4>
      <ul className="flex flex-wrap gap-1.5">
        {values.map((value, index) => (
          <li key={value + ":" + index} className="max-w-full break-all rounded-md bg-overlay-hover px-2 py-1 font-mono text-xs text-ink-muted">
            {value}
          </li>
        ))}
      </ul>
    </section>
  );
}

interface ContextDisclosureProps {
  readonly children: ReactNode;
  readonly count?: number;
  readonly label: string;
  readonly owner?: string;
}

/** Groups one quiet context layer behind a closed disclosure. */
export function ContextDisclosure(props: ContextDisclosureProps) {
  const {children, count, label, owner} = props;
  return (
    <details className="group rounded-xl border border-border-muted bg-surface">
      <summary className="flex cursor-pointer list-none items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-ink-muted outline-none hover:bg-overlay-hover hover:text-ink focus-visible:ring-1 focus-visible:ring-border-strong">
        <Icon className="shrink-0 -rotate-90 text-ink-faint transition-transform group-open:rotate-0 motion-reduce:transition-none" name="chevron-down" size="xs" />
        <span className="font-medium text-ink">{label}</span>
        {count !== undefined && <span className="text-xs text-ink-faint">{count}</span>}
        {owner && <span className="ml-auto min-w-0 truncate text-xs text-ink-faint">{owner}</span>}
      </summary>
      <div className="border-t border-border-muted px-3 py-3">{children}</div>
    </details>
  );
}

interface InstructionReceiptProps {
  readonly layers: readonly HarnessPromptLayer[];
  readonly runtime?: HarnessRuntimeContext;
  readonly captured?: boolean;
}

/** Presents every captured context layer as a closed, independently scrollable disclosure. */
export default function InstructionReceipt(props: InstructionReceiptProps) {
  const {layers, runtime} = props;
  const resourceCount = runtime ? runtime.skills.length + runtime.contextFiles.length + runtime.tools.length : 0;
  return (
    <div aria-label="Context details">
      <div className="space-y-2">
        {layers.map((layer, index) => (
          <ContextDisclosure key={layer.kind + ":" + index} label={instructionScope(layer.kind)} owner={layer.owner}>
            <h3 className="mb-2 text-xs font-medium text-ink">{layer.label}</h3>
            <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-ink-muted">{layer.content || "No additional instructions."}</pre>
          </ContextDisclosure>
        ))}
        {layers.length === 0 && <p className="rounded-xl border border-border-muted px-3 py-3 text-xs text-ink-muted">No additional instruction layers recorded.</p>}

        <ContextDisclosure label="Resources" count={resourceCount}>
          {runtime && resourceCount > 0 ? (
            <div className="divide-y divide-border-muted">
              <ResourceList title="Skills" values={runtime.skills} />
              <ResourceList title="Context files" values={runtime.contextFiles} />
              <ResourceList title="Tools" values={runtime.tools} />
            </div>
          ) : (
            <p className="text-xs text-ink-faint">Not recorded.</p>
          )}
        </ContextDisclosure>

        <ContextDisclosure label="Runtime">
          {runtime ? (
            <section className="space-y-2">
              <h3 className="text-xs font-medium text-ink">Exact runtime system prompt</h3>
              <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-ink-muted">{runtime.systemPrompt}</pre>
            </section>
          ) : (
            <p className="text-xs text-ink-faint">Not recorded.</p>
          )}
        </ContextDisclosure>
      </div>
    </div>
  );
}
