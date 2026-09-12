import type {ComponentProps} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {beforeEach, describe, expect, it, vi} from "vitest";
import SessionComposer from "@/features/sessions/components/composer/session-composer";
import type ComposerSendAction from "@/features/sessions/components/composer/composer-send-action";
import type ComposerEditor from "@/features/sessions/components/composer/editor/composer-editor";
import type {ComposerAttachmentsController} from "@/features/sessions/hooks/use-composer-attachments";

const controls = vi.hoisted(() => ({
  actions: undefined as ComponentProps<typeof ComposerSendAction> | undefined,
  input: undefined as ComponentProps<typeof ComposerEditor> | undefined,
}));
vi.mock("@/features/sessions/components/composer/composer-send-action", () => ({
  default: (props: ComponentProps<typeof ComposerSendAction>) => {
    controls.actions = props;
    return null;
  },
}));
vi.mock("@/features/sessions/components/composer/editor/composer-editor", () => ({
  default: (props: ComponentProps<typeof ComposerEditor>) => {
    controls.input = props;
    return null;
  },
}));

const attachment = {id: "note", type: "attachment", name: "note.md", kind: "text", mime: "text/markdown", size: 4, contentBase64: "dGVzdA=="} as const;

function mountComposer(input: {text: string; status?: ComponentProps<typeof SessionComposer>["streamStatus"]; ack?: Promise<boolean>}) {
  const attachments: ComposerAttachmentsController = {
    attachments: [attachment],
    addFiles: vi.fn(),
    remove: vi.fn(),
    clear: vi.fn(),
    dropZoneProps: {},
    isDraggingFiles: false,
    isProcessing: false,
    removeUnsupportedImages: vi.fn(),
  };
  const deliver = () => input.ack ?? Promise.resolve(true);
  const onSubmit = vi.fn(deliver);
  const onQueue = vi.fn(deliver);
  const onSteer = vi.fn(deliver);
  const onStartGoal = vi.fn(deliver);
  const onAccepted = vi.fn();
  const draft = {contentParts: [{type: "text" as const, text: input.text}, attachment], setEditableContentParts: vi.fn()};
  renderToStaticMarkup(
    <SessionComposer
      attachments={attachments}
      disabled={false}
      draft={draft}
      onSubmit={onSubmit}
      onQueue={onQueue}
      onSteer={onSteer}
      onStartGoal={onStartGoal}
      onAccepted={onAccepted}
      projectPath="/work"
      streamStatus={input.status}
    />
  );
  return {attachments, draft, onSubmit, onQueue, onSteer, onStartGoal, onAccepted};
}

describe("composer delivery actions", () => {
  beforeEach(() => {
    controls.actions = undefined;
    controls.input = undefined;
  });

  it.each([
    {status: "idle", action: "enter", text: "Review this", receiver: "onSubmit", includesAttachment: true},
    {status: "streaming", action: "enter", text: "Review this", receiver: "onSteer", includesAttachment: false},
    {status: "compacting", action: "enter", text: "Review this", receiver: "onQueue", includesAttachment: true},
    {status: "streaming", action: "queue", text: "Review this", receiver: "onQueue", includesAttachment: true},
    {status: "streaming", action: "steer", text: "Review this", receiver: "onSteer", includesAttachment: false},
    {status: "idle", action: "enter", text: "/goal Review this", receiver: "onStartGoal", includesAttachment: false},
    {status: "streaming", action: "enter", text: "/goal Review this", receiver: "onStartGoal", includesAttachment: false},
  ] as const)("$action in $status delivers through $receiver", async ({status, action, text, receiver, includesAttachment}) => {
    const state = mountComposer({status, text});
    if (action === "steer") controls.actions!.onSteer?.();
    else if (action === "queue") controls.actions!.onSend();
    else controls.input!.onSubmit();
    await vi.waitFor(() => expect(state.onAccepted).toHaveBeenCalledOnce());
    expect(state[receiver]).toHaveBeenCalledWith(includesAttachment ? [{type: "text", text}, attachment] : "Review this");
    for (const name of ["onSubmit", "onQueue", "onSteer", "onStartGoal"] as const) if (name !== receiver) expect(state[name]).not.toHaveBeenCalled();
    expect(state.draft.setEditableContentParts).toHaveBeenCalledWith([]);
    expect(state.attachments.remove).toHaveBeenCalledTimes(includesAttachment ? 1 : 0);
  });

  it("bare /goal opens input without sending the literal command or attachments", () => {
    const state = mountComposer({text: "/goal"});
    controls.input!.onSubmit();
    expect(state.onStartGoal).not.toHaveBeenCalled();
    expect(state.onSubmit).not.toHaveBeenCalled();
    expect(state.attachments.remove).not.toHaveBeenCalled();
    expect(state.draft.setEditableContentParts).toHaveBeenCalledWith([]);
  });

  it.each([true, false])("waits for acknowledgement=%s and prevents double delivery", async (accepted) => {
    let acknowledge: (accepted: boolean) => void = () => {
      throw new Error("Missing acknowledgement");
    };
    const ack = new Promise<boolean>((resolve) => {
      acknowledge = resolve;
    });
    const state = mountComposer({text: "Check this", status: "streaming", ack});
    controls.input!.onSubmit();
    controls.input!.onSubmit();
    controls.actions!.onSteer?.();
    expect(state.onSteer).toHaveBeenCalledOnce();
    expect(state.onQueue).not.toHaveBeenCalled();
    expect(state.draft.setEditableContentParts).not.toHaveBeenCalled();
    expect(state.attachments.remove).not.toHaveBeenCalled();
    acknowledge(accepted);
    await ack;
    // Wait on the delivery's microtask chain rather than guessing runtime latency.
    if (accepted) await vi.waitFor(() => expect(state.onAccepted).toHaveBeenCalledOnce());
    expect(state.draft.setEditableContentParts).toHaveBeenCalledTimes(accepted ? 1 : 0);
    expect(state.attachments.remove).not.toHaveBeenCalled();
    expect(state.onAccepted).toHaveBeenCalledTimes(accepted ? 1 : 0);
  });
});
