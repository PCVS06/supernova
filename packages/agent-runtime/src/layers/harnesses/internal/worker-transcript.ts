import type {AgentSessionEvent} from "@earendil-works/pi-coding-agent";
import type {HarnessTranscript, HarnessTranscriptEntry} from "@supernova/contracts/harnesses/schemas";

const MAX_PAYLOAD_CHARACTERS = 8000;
const MAX_ENTRIES = 120;
const MAX_TRANSCRIPT_CHARACTERS = 256000;

/** Extracts visible text, never provider reasoning, image bytes or tool-result metadata. */
function publicResult(result: unknown): {text: string; mediaOmitted: boolean} {
  if (!result || typeof result !== "object" || !("content" in result) || !Array.isArray(result.content)) return {text: "", mediaOmitted: false};
  const text: string[] = [];
  let mediaOmitted = false;
  for (const part of result.content) {
    if (part?.type === "text" && typeof part.text === "string") text.push(part.text);
    if (part?.type === "image" || part?.type === "audio" || part?.type === "resource") mediaOmitted = true;
  }
  return {text: text.join("\n"), mediaOmitted};
}

/** A bounded public projection of SDK events, independent of the worker's in-memory context and compaction. */
export class WorkerTranscript {
  private entries: HarnessTranscriptEntry[] = [];
  private omittedEntries = 0;
  private sequence = 0;
  private assistantId: string | undefined;

  private put(entry: HarnessTranscriptEntry): void {
    const index = this.entries.findIndex((item) => item.id === entry.id);
    if (index < 0) this.entries.push(entry);
    else this.entries[index] = entry;
    let characters = this.entries.reduce((sum, item) => sum + (item.kind === "assistant" ? item.text.length : item.input.length + (item.output?.length ?? 0)), 0);
    while (this.entries.length > MAX_ENTRIES || characters > MAX_TRANSCRIPT_CHARACTERS) {
      const removed = this.entries.shift()!;
      characters -= removed.kind === "assistant" ? removed.text.length : removed.input.length + (removed.output?.length ?? 0);
      this.omittedEntries++;
    }
  }

  /** Copies the bounded entry list so queued persistence cannot observe later mutations. */
  public snapshot(): HarnessTranscript {
    return {entries: [...this.entries], omittedEntries: this.omittedEntries};
  }

  /** Returns whether public content changed; thinking-only updates do not generate writes. */
  public record(event: AgentSessionEvent): boolean {
    const at = new Date().toISOString();
    if (event.type === "message_start" || event.type === "message_update" || event.type === "message_end") {
      if (event.message.role !== "assistant") return false;
      if (event.type === "message_start" || !this.assistantId) this.assistantId = `assistant-${++this.sequence}`;
      const id = this.assistantId;
      const text = event.message.content
        .filter((part) => part.type === "text")
        .map((part) => part.text)
        .join("\n");
      if (event.type === "message_end") this.assistantId = undefined;
      if (!text) return false;
      const previous = this.entries.find((entry) => entry.id === id);
      const entry: HarnessTranscriptEntry = {
        id,
        at: previous?.at ?? at,
        kind: "assistant",
        text: text.slice(0, MAX_PAYLOAD_CHARACTERS),
        streaming: event.type !== "message_end",
        incomplete: event.type === "message_end" && (event.message.stopReason === "error" || event.message.stopReason === "aborted"),
        truncated: text.length > MAX_PAYLOAD_CHARACTERS,
      };
      if (
        previous?.kind === "assistant" &&
        previous.text === entry.text &&
        previous.streaming === entry.streaming &&
        previous.incomplete === entry.incomplete &&
        previous.truncated === entry.truncated
      )
        return false;
      this.put(entry);
      return true;
    }
    if (event.type !== "tool_execution_start" && event.type !== "tool_execution_update" && event.type !== "tool_execution_end") return false;
    const id = `tool-${event.toolCallId}`;
    const previous = this.entries.find((entry) => entry.id === id);
    const tool = previous?.kind === "tool" ? previous : undefined;
    let input = tool?.input ?? "";
    let inputTruncated = tool?.inputTruncated ?? false;
    if (event.type === "tool_execution_start") {
      try {
        input = JSON.stringify(event.args, null, 2) ?? "";
      } catch {
        input = "Arguments could not be recorded.";
      }
      inputTruncated = input.length > MAX_PAYLOAD_CHARACTERS;
    }
    const result = event.type === "tool_execution_end" ? publicResult(event.result) : event.type === "tool_execution_update" ? publicResult(event.partialResult) : undefined;
    this.put({
      id,
      at: tool?.at ?? at,
      kind: "tool",
      toolName: event.toolName,
      status: event.type === "tool_execution_end" ? (event.isError ? "failed" : "completed") : "running",
      input: input.slice(0, MAX_PAYLOAD_CHARACTERS),
      inputTruncated,
      output: result ? result.text.slice(0, MAX_PAYLOAD_CHARACTERS) : tool?.output,
      outputTruncated: result ? result.text.length > MAX_PAYLOAD_CHARACTERS : (tool?.outputTruncated ?? false),
      mediaOmitted: result?.mediaOmitted ?? tool?.mediaOmitted ?? false,
    });
    return true;
  }
}
