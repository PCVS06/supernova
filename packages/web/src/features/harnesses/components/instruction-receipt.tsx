import type {HarnessPromptLayer, HarnessRuntimeContext} from "@supernova/contracts/harnesses/schemas";
import type {ReactNode} from "react";
import Icon from "@/components/ui/icon";
import type {IconName} from "@/components/ui/icon";
import ConstantOrb from "@/components/brand/constant-orb";
import type {MathematicalConstant} from "@/components/brand/constant-identity";
import ContextProvenance from "@/features/harnesses/components/context-provenance";

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
  readonly icon?: IconName;
  readonly constant?: MathematicalConstant;
  readonly label: string;
  readonly owner?: string;
}

/** Groups one quiet context layer behind a closed disclosure. */
export function ContextDisclosure(props: ContextDisclosureProps) {
  const {children, count, icon = "file", constant, label, owner} = props;
  return (
    <details className="group border-b border-border-muted last:border-b-0">
      <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 px-3 py-2.5 text-sm text-ink-muted outline-none transition-colors hover:bg-overlay-hover hover:text-ink focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-border-strong">
        <span className="grid size-7 shrink-0 place-items-center text-ink-muted">
          {constant ? <ConstantOrb constant={constant} className="size-7" state="idle" /> : <Icon name={icon} size="xs" />}
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
  readonly revision?: number;
  readonly scope?: "chat" | "run";
  readonly unframed?: boolean;
  readonly roleConstant?: MathematicalConstant;
}

/** Shows context provenance above independently expandable instructions and recorded runtime details. */
export default function InstructionReceipt(props: InstructionReceiptProps) {
  const {layers, runtime, captured, revision, scope = "chat", unframed = false, roleConstant = "e"} = props;
  const resourceCount = runtime ? runtime.skills.length + runtime.contextFiles.length + runtime.tools.length : 0;
  const rows = (
    <div aria-label="Context details">
      <ContextProvenance captured={captured} revision={revision} runtime={runtime} scope={scope} />
      {layers.map((layer, index) => (
        <ContextDisclosure
          constant={layer.kind === "shared" ? "pi" : layer.kind === "project" ? "phi" : layer.kind === "role" ? roleConstant : undefined}
          key={layer.kind + ":" + index}
          label={instructionScope(layer.kind)}
          owner={layer.owner}
        >
          <h3 className="mb-2 text-xs font-medium text-ink">{layer.label}</h3>
          <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-ink-muted">{layer.content || "No additional instructions."}</pre>
        </ContextDisclosure>
      ))}
      {layers.length === 0 && <p className="border-b border-border-muted px-4 py-3 text-xs text-ink-muted">No instructions recorded.</p>}

      <ContextDisclosure icon="skill" label="Resources" count={resourceCount}>
        {runtime && resourceCount > 0 ? (
          <div className="divide-y divide-border-muted">
            <p className="pb-3 text-xs text-ink-muted">Resources available at capture. Available skills may not have been invoked.</p>
            <ResourceList title="Available skills" values={runtime.skills} />
            <ResourceList title="Loaded instruction files" values={runtime.contextFiles} />
            <ResourceList title="Active tools" values={runtime.tools} />
          </div>
        ) : (
          <p className="text-xs text-ink-faint">Not recorded.</p>
        )}
      </ContextDisclosure>

      <ContextDisclosure icon="terminal" label="Runtime">
        {runtime ? (
          <section className="space-y-2">
            <h3 className="text-xs font-medium text-ink">System prompt at capture</h3>
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
