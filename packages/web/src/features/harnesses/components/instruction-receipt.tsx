import type {HarnessPromptLayer, HarnessRuntimeContext} from "@supernova/contracts/harnesses/schemas";
import type {ReactNode} from "react";
import Icon from "@/components/ui/icon";
import type {IconName} from "@/components/ui/icon";

/** Names an instruction layer by the scope a user needs to reason about. */
function instructionScope(kind: HarnessPromptLayer["kind"]): string {
  if (kind === "shared") return "Harness";
  if (kind === "project") return "Project";
  if (kind === "role") return "Role";
  return "Context";
}

/** Gives each context layer a stable visual landmark. */
function instructionIcon(kind: HarnessPromptLayer["kind"]): IconName {
  if (kind === "shared") return "workflow";
  if (kind === "project") return "folder";
  if (kind === "role") return "user";
  return "file";
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
  readonly icon?: IconName;
  readonly label: string;
  readonly owner?: string;
}

/** Groups one quiet context layer behind a closed disclosure. */
export function ContextDisclosure(props: ContextDisclosureProps) {
  const {children, count, icon = "file", label, owner} = props;
  return (
    <details className="group border-b border-border-muted last:border-b-0">
      <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 px-3 py-2.5 text-sm text-ink-muted outline-none transition-colors hover:bg-overlay-hover hover:text-ink focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-border-strong">
        <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-overlay-hover text-ink-muted">
          <Icon name={icon} size="xs" />
        </span>
        <span className="font-medium text-ink-strong">{label}</span>
        {count !== undefined && <span className="text-xs text-ink-faint">{count}</span>}
        {owner && <span className="ml-auto min-w-0 truncate text-xs text-ink-faint">{owner}</span>}
        <Icon className="shrink-0 -rotate-90 text-ink-faint transition-transform group-open:rotate-0 motion-reduce:transition-none" name="chevron-down" size="xs" />
      </summary>
      <div className="border-t border-border-muted bg-surface-deep px-4 py-3">{children}</div>
    </details>
  );
}

interface ContextGroupProps {
  readonly children: ReactNode;
}

/** Frames related context layers as one compact inspector instead of separate cards. */
export function ContextGroup(props: ContextGroupProps) {
  return <div className="overflow-hidden rounded-2xl border border-border-muted bg-surface-recessed">{props.children}</div>;
}

interface InstructionReceiptProps {
  readonly layers: readonly HarnessPromptLayer[];
  readonly runtime?: HarnessRuntimeContext;
  readonly captured?: boolean;
  readonly unframed?: boolean;
}

/** Presents every captured context layer as a closed, independently scrollable disclosure. */
export default function InstructionReceipt(props: InstructionReceiptProps) {
  const {layers, runtime, unframed = false} = props;
  const resourceCount = runtime ? runtime.skills.length + runtime.contextFiles.length + runtime.tools.length : 0;
  const rows = (
    <div aria-label="Context details">
      {layers.map((layer, index) => (
        <ContextDisclosure icon={instructionIcon(layer.kind)} key={layer.kind + ":" + index} label={instructionScope(layer.kind)} owner={layer.owner}>
          <h3 className="mb-2 text-xs font-medium text-ink">{layer.label}</h3>
          <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-ink-muted">{layer.content || "No additional instructions."}</pre>
        </ContextDisclosure>
      ))}
      {layers.length === 0 && <p className="border-b border-border-muted px-4 py-3 text-xs text-ink-muted">No instructions recorded.</p>}

      <ContextDisclosure icon="skill" label="Resources" count={resourceCount}>
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

      <ContextDisclosure icon="terminal" label="Runtime">
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
  );

  return unframed ? rows : <ContextGroup>{rows}</ContextGroup>;
}
