import type {HarnessPromptLayer, HarnessRuntimeContext} from "@supernova/contracts/harnesses/schemas";
import {useState} from "react";
import EditorTabs from "@/features/harnesses/components/editor-tabs";

type ReceiptSection = "instructions" | "resources" | "runtime";

interface ResourceListProps {
  readonly title: string;
  readonly description: string;
  readonly values: readonly string[];
}

function ResourceList(props: ResourceListProps) {
  const {title, description, values} = props;
  return (
    <section className="space-y-2 py-4">
      <h3 className="text-sm font-medium text-ink">
        {title} <span className="ml-1 text-xs font-normal text-ink-faint">{values.length}</span>
      </h3>
      <p className="text-xs leading-relaxed text-ink-muted">{description}</p>
      {values.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5">
          {values.map((value, index) => (
            <li key={value + ":" + index} className="max-w-full break-all rounded-md bg-overlay-hover px-2 py-1 font-mono text-xs text-ink-muted">
              {value}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-ink-faint">None recorded.</p>
      )}
    </section>
  );
}

interface InstructionReceiptProps {
  readonly layers: readonly HarnessPromptLayer[];
  readonly runtime?: HarnessRuntimeContext;
  readonly captured?: boolean;
}

/** Read-only inspection separates configured instructions, observed resources and the exact runtime prompt. */
export default function InstructionReceipt(props: InstructionReceiptProps) {
  const {layers, runtime, captured = true} = props;
  const [section, setSection] = useState<ReceiptSection>("instructions");
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 border-b border-border-muted">
        <EditorTabs
          label="Context sections"
          value={section}
          onChange={setSection}
          items={[
            {value: "instructions", label: "Instructions", count: layers.length},
            {value: "resources", label: "Resources"},
            {value: "runtime", label: "Runtime"},
          ]}
        />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto pb-5" aria-label={section + " details"}>
        {section === "instructions" && (
          <>
            <p className="py-4 text-xs leading-relaxed text-ink-muted">
              {captured
                ? "Captured for this chat. Changes in Settings apply to new chats."
                : "No saved configuration snapshot. These are current project defaults, not verified historical instructions."}
            </p>
            <div className="divide-y divide-border-muted">
              {layers.map((layer, index) => (
                <section key={layer.kind + ":" + index} className="py-4 first:pt-0">
                  <div className="mb-3 flex items-baseline justify-between gap-3">
                    <h3 className="text-sm font-medium text-ink">{layer.label}</h3>
                    <span className="text-right text-xs text-ink-faint">{layer.owner}</span>
                  </div>
                  <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-ink-muted">{layer.content || "No additional instructions."}</pre>
                </section>
              ))}
            </div>
            {layers.length === 0 && <p className="py-4 text-sm text-ink-muted">No additional instruction layers recorded.</p>}
          </>
        )}
        {section === "resources" && runtime && (
          <div className="divide-y divide-border-muted">
            <ResourceList title="Skills" description="Available to the agent. Availability does not establish that a skill was read." values={runtime.skills} />
            <ResourceList title="Context files" description="Files reported loaded by this chat's runtime." values={runtime.contextFiles} />
            <ResourceList title="Tools" description="Tools exposed to this agent at the recorded observation." values={runtime.tools} />
          </div>
        )}
        {section === "runtime" && runtime && (
          <section className="space-y-3 py-4">
            <h3 className="text-sm font-medium">Exact runtime system prompt</h3>
            <p className="text-xs leading-relaxed text-ink-muted">
              Observed {new Date(runtime.capturedAt).toLocaleString()}. This is the recorded runtime prompt, not a reconstruction from settings.
            </p>
            <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-ink-muted">{runtime.systemPrompt}</pre>
          </section>
        )}
        {!runtime && (
          <p className="border-t border-border-muted py-4 text-xs leading-relaxed text-ink-faint">
            No runtime receipt yet. Loaded tools, skills and the exact system prompt have not been observed for this chat.
          </p>
        )}
      </div>
    </div>
  );
}
