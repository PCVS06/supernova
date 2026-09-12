import {describe, expect, it} from "vitest";
import {fauxAssistantMessage} from "@earendil-works/pi-ai/compat";
import {WorkerTranscript} from "@supernova/agent-runtime/layers/harnesses/internal/worker-transcript";

describe("public worker transcript", () => {
  it.each(["error", "aborted"] as const)("marks an assistant response ending with %s as incomplete", (stopReason) => {
    const transcript = new WorkerTranscript();
    transcript.record({type: "message_end", message: {...fauxAssistantMessage("Partial finding"), stopReason}});
    expect(transcript.snapshot().entries[0]).toMatchObject({kind: "assistant", text: "Partial finding", streaming: false, incomplete: true});
  });
  it("retains only public text and visible tool results, never thinking, signatures or metadata", () => {
    const transcript = new WorkerTranscript();
    const message = {
      ...fauxAssistantMessage("Public finding"),
      content: [
        {type: "thinking" as const, thinking: "PRIVATE REASONING", thinkingSignature: "PRIVATE SIGNATURE"},
        {type: "text" as const, text: "Public finding"},
      ],
    };
    transcript.record({type: "message_start", message});
    transcript.record({type: "message_end", message});
    transcript.record({type: "tool_execution_start", toolCallId: "read-1", toolName: "read", args: {path: "evidence.md"}});
    transcript.record({
      type: "tool_execution_end",
      toolCallId: "read-1",
      toolName: "read",
      isError: false,
      result: {
        content: [
          {type: "text", text: "Evidence found"},
          {type: "image", data: "PRIVATE IMAGE BYTES"},
        ],
        details: {internal: "PRIVATE METADATA"},
      },
    });
    const snapshot = transcript.snapshot();
    expect(snapshot.entries).toHaveLength(2);
    expect(snapshot.entries[0]).toMatchObject({kind: "assistant", text: "Public finding", streaming: false});
    expect(snapshot.entries[1]).toMatchObject({kind: "tool", status: "completed", output: "Evidence found", mediaOmitted: true});
    expect(JSON.stringify(snapshot)).not.toContain("PRIVATE");
  });

  it("does not fabricate a message or write for thinking-only updates", () => {
    const transcript = new WorkerTranscript();
    const message = {...fauxAssistantMessage(""), content: [{type: "thinking" as const, thinking: "Hidden"}]};
    expect(transcript.record({type: "message_start", message})).toBe(false);
    expect(transcript.record({type: "message_end", message})).toBe(false);
    expect(transcript.snapshot().entries).toEqual([]);
  });

  it("updates one message in place and keeps earlier persistence snapshots immutable", () => {
    const transcript = new WorkerTranscript();
    const partial = fauxAssistantMessage("Checking");
    transcript.record({type: "message_start", message: partial});
    const before = transcript.snapshot();
    const completed = fauxAssistantMessage("Checking finished");
    transcript.record({type: "message_end", message: completed});
    transcript.record({type: "message_end", message: fauxAssistantMessage("Second response")});
    expect(before.entries).toHaveLength(1);
    expect(before.entries[0]).toMatchObject({text: "Checking", streaming: true});
    expect(transcript.snapshot().entries.map((entry) => entry.kind === "assistant" && entry.text)).toEqual(["Checking finished", "Second response"]);
  });

  it.each([false, true])("correlates parallel tool calls with their actual success/error results (error=%s)", (isError) => {
    const transcript = new WorkerTranscript();
    for (const id of ["one", "two"]) transcript.record({type: "tool_execution_start", toolCallId: id, toolName: "read", args: {path: id}});
    transcript.record({type: "tool_execution_end", toolCallId: "two", toolName: "read", isError, result: {content: [{type: "text", text: "Second result"}]}});
    const [first, second] = transcript.snapshot().entries;
    expect(first).toMatchObject({id: "tool-one", status: "running"});
    expect(second).toMatchObject({id: "tool-two", status: isError ? "failed" : "completed", output: "Second result"});
  });

  it("bounds individual payloads and marks truncation explicitly", () => {
    const transcript = new WorkerTranscript();
    transcript.record({type: "message_end", message: fauxAssistantMessage("a".repeat(9000))});
    transcript.record({type: "tool_execution_start", toolCallId: "large", toolName: "read", args: {path: "b".repeat(9000)}});
    transcript.record({type: "tool_execution_end", toolCallId: "large", toolName: "read", isError: false, result: {content: [{type: "text", text: "c".repeat(9000)}]}});
    const [message, tool] = transcript.snapshot().entries;
    expect(message).toMatchObject({text: "a".repeat(8000), truncated: true});
    expect(tool).toMatchObject({inputTruncated: true, outputTruncated: true, output: "c".repeat(8000)});
    if (tool?.kind === "tool") expect(tool.input).toHaveLength(8000);
  });

  it.each([
    {length: 1, retained: 120},
    {length: 8000, retained: 32},
  ])("bounds entry count and total text for $length character messages", ({length, retained}) => {
    const transcript = new WorkerTranscript();
    for (let index = 0; index < 150; index++) transcript.record({type: "message_end", message: fauxAssistantMessage("a".repeat(length))});
    expect(transcript.snapshot().entries).toHaveLength(retained);
    expect(transcript.snapshot().omittedEntries).toBe(150 - retained);
    expect(transcript.snapshot().entries.at(-1)?.id).toBe("assistant-150");
  });
});
