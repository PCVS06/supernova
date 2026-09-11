import type {HarnessPromptLayer, HarnessRuntimeContext} from "@supernova/contracts/harnesses/schemas";

/** Read-only provenance: configured layers and observed SDK instructions stay separate. */
export default function InstructionReceipt({layers, runtime, captured = true}: {layers: readonly HarnessPromptLayer[]; runtime?: HarnessRuntimeContext; captured?: boolean}) {
  return (
    <div className="space-y-3">
      <p className="text-xs leading-relaxed text-ink-muted">
        {captured
          ? "These are this chat's captured instructions, not the latest settings for future chats."
          : "This older chat has no saved configuration snapshot. The layers below show current project defaults, not verified historical instructions."}
      </p>
      {layers.map((layer, index) => (
        <details key={layer.kind} className="rounded-lg border border-border p-3">
          <summary className="cursor-pointer text-sm">
            {index + 1} · {layer.label} <span className="text-xs text-ink-muted">· {layer.owner}</span>
          </summary>
          <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap break-words font-mono text-xs leading-relaxed">{layer.content || "No additional instructions."}</pre>
        </details>
      ))}
      {runtime ? (
        <>
          <div className="text-xs leading-relaxed text-ink-muted">
            <p>Observed {new Date(runtime.capturedAt).toLocaleString()}</p>
            <p>Available skills: {runtime.skills.join(", ") || "None"}. Available does not mean the agent has read a skill.</p>
            <p>Loaded context files: {runtime.contextFiles.join(", ") || "None"}</p>
          </div>
          <details className="rounded-lg border border-border p-3">
            <summary className="cursor-pointer text-sm">Exact runtime system prompt & tools</summary>
            <p className="my-3 break-words text-xs text-ink-muted">Tools: {runtime.tools.join(", ")}</p>
            <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words font-mono text-xs leading-relaxed">{runtime.systemPrompt}</pre>
          </details>
        </>
      ) : (
        <p className="text-xs text-ink-muted">No runtime receipt yet. Configured instructions are shown above; loaded tools and skills have not been observed for this chat.</p>
      )}
    </div>
  );
}
