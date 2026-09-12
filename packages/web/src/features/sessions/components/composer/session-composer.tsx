import type {UserMessageContentPart} from "@supernova/contracts/sessions/schemas";
import {Node} from "@tiptap/core";
import Document from "@tiptap/extension-document";
import HardBreak from "@tiptap/extension-hard-break";
import History from "@tiptap/extension-history";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import {ReactNodeViewRenderer, useEditor} from "@tiptap/react";
import type {ChangeEvent, ClipboardEvent, ReactNode} from "react";
import {useRef, useState} from "react";
import Button from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import IconButton from "@/components/ui/icon-button";
import ComposerAttachmentPreview from "@/features/sessions/components/attachments/composer-attachment-preview";
import ComposerSendAction from "@/features/sessions/components/composer/composer-send-action";
import {submitComposerDraft} from "@/features/sessions/components/composer/composer-submission";
import type {ComposerAcknowledgement} from "@/features/sessions/components/composer/composer-submission";
import {goalCommandObjective} from "@/features/sessions/components/composer/goal-command";
import ComposerEditor from "@/features/sessions/components/composer/editor/composer-editor";
import ComposerReference from "@/features/sessions/components/composer/editor/composer-reference";
import type {ComposerAttachmentsController} from "@/features/sessions/hooks/use-composer-attachments";
import {SESSION_ATTACHMENT_ACCEPT} from "@/features/sessions/lib/attachments/session-attachments";
import type {ClientSlashCommandActions} from "@/features/sessions/lib/composer/client-slash-commands";
import {contentPartsToEditorContent, editorToContentParts, textFromComposerContentParts, trimComposerContentParts} from "@/features/sessions/lib/composer/composer-content-parts";
import {createSuggestionExtension} from "@/features/sessions/lib/composer/composer-suggestions";
import type {ComposerSuggestionMatch} from "@/features/sessions/types/composer-suggestion";
import type {SessionLiveStatus} from "@/features/sessions/stores/session-live-store";
import {cn} from "@/lib/cn";

type ComposerClipboardEvent = ClipboardEvent<HTMLElement> | globalThis.ClipboardEvent;

type ComposerEditorInstance = ReturnType<typeof useEditor>;

interface SessionComposerDraft {
  readonly contentParts: readonly UserMessageContentPart[];
  readonly clear?: () => void;
  readonly setEditableContentParts?: (contentParts: readonly UserMessageContentPart[]) => void;
}

interface ComposerInputState {
  readonly draftText: string;
  readonly editable: boolean;
  readonly editor: ComposerEditorInstance;
  readonly onSuggestionMatchChange: (match: ComposerSuggestionMatch | null) => void;
  readonly suggestionMatch: ComposerSuggestionMatch | null;
}

function clipboardFiles(event: ComposerClipboardEvent): File[] {
  const clipboardData = event.clipboardData;
  if (!clipboardData) return [];

  const files = Array.from(clipboardData.files);
  if (files.length > 0) return files;

  return Array.from(clipboardData.items).flatMap((item) => {
    if (item.kind !== "file") return [];

    const file = item.getAsFile();
    return file ? [file] : [];
  });
}

// Tiptap's setHardBreak inserts via insertContent, which never marks the
// transaction with scrollIntoView. In the height-capped composer that leaves a
// freshly added line cut off at the bottom, so chain the scroll explicitly.
const ComposerHardBreak = HardBreak.extend({
  addKeyboardShortcuts() {
    return {
      "Mod-Enter": () => this.editor.chain().setHardBreak().scrollIntoView().run(),
      "Shift-Enter": () => this.editor.chain().setHardBreak().scrollIntoView().run(),
    };
  },
});

const ComposerReferenceNode = Node.create({
  addAttributes() {
    return {
      id: {default: ""},
      kind: {default: ""},
      name: {default: ""},
      value: {default: ""},
    };
  },
  addNodeView() {
    return ReactNodeViewRenderer(ComposerReference);
  },
  atom: true,
  group: "inline",
  inline: true,
  name: "composerReference",
  parseHTML() {
    return [{tag: "span[data-composer-reference]"}];
  },
  renderHTML({HTMLAttributes}) {
    return ["span", {"data-composer-reference": "", ...HTMLAttributes}];
  },
  renderText({node}) {
    return String(node.attrs.value ?? "");
  },
  selectable: false,
});

interface SessionComposerAttachmentsProps {
  readonly attachments: ComposerAttachmentsController;
}

function SessionComposerAttachments(props: SessionComposerAttachmentsProps) {
  const {attachments} = props;

  return (
    <>
      {attachments.attachments.length > 0 && (
        <div className="flex flex-wrap items-end gap-2 pb-2">
          {attachments.attachments.map((attachment) => (
            <ComposerAttachmentPreview attachment={attachment} key={attachment.id} onRemove={attachments.remove} />
          ))}
        </div>
      )}

      {attachments.isProcessing && <p className="px-1 pb-2 text-xs text-ink-muted">Preparing files...</p>}
    </>
  );
}

interface SessionComposerInputProps {
  readonly attachmentDisabled: boolean;
  readonly attachments: ComposerAttachmentsController;
  readonly input: ComposerInputState;
  readonly onSubmit: () => void;
  readonly onGoal: () => void;
  readonly placeholder: string;
  readonly projectPath: string;
  readonly slashCommandActions?: ClientSlashCommandActions;
}

function SessionComposerInput(props: SessionComposerInputProps) {
  const {attachmentDisabled, attachments, input, onSubmit, onGoal, placeholder, projectPath, slashCommandActions} = props;

  const handlePaste = (event: ComposerClipboardEvent): void => {
    const files = clipboardFiles(event);
    if (files.length === 0) return;

    event.preventDefault();
    if (attachmentDisabled) return;

    attachments.addFiles(files);
  };

  return (
    <div className="relative -mx-3 px-3">
      <ComposerEditor
        editor={input.editor}
        editable={input.editable}
        onPaste={handlePaste}
        onSubmit={onSubmit}
        onGoal={onGoal}
        onSuggestionMatchChange={input.onSuggestionMatchChange}
        placeholder={placeholder}
        projectPath={projectPath}
        slashCommandActions={slashCommandActions}
        suggestionMatch={input.suggestionMatch}
        value={input.draftText}
      />
    </div>
  );
}

interface SessionComposerAttachButtonProps {
  readonly attachments: ComposerAttachmentsController;
  readonly disabled: boolean;
  readonly label?: string;
}

function SessionComposerAttachButton(props: SessionComposerAttachButtonProps) {
  const {attachments, disabled, label = "Attach files"} = props;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClick = (): void => {
    if (disabled) return;
    fileInputRef.current?.click();
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const files = Array.from(event.target.files ?? []);
    if (files.length > 0) attachments.addFiles(files);
    event.target.value = "";
  };

  return (
    <>
      <input accept={SESSION_ATTACHMENT_ACCEPT} className="hidden" disabled={disabled} multiple onChange={handleChange} ref={fileInputRef} type="file" />
      <IconButton
        label={label}
        className="grid size-8 place-items-center rounded-lg text-ink-muted transition hover:bg-overlay-hover hover:text-ink-strong disabled:cursor-default disabled:text-ink-faint disabled:hover:bg-transparent"
        disabled={disabled}
        onClick={handleClick}
        size="none"
        title={label}
        variant="ghost"
      >
        <Icon name="plus" size="sm" />
      </IconButton>
    </>
  );
}

interface SessionComposerProps {
  readonly attachments: ComposerAttachmentsController;
  readonly disabled: boolean;
  readonly draft: SessionComposerDraft;
  readonly onInterrupt?: () => void;
  /** Delivers the draft text to the running turn instead of queuing a new one. */
  readonly onSteer?: (text: string) => ComposerAcknowledgement;
  readonly onQueue?: (contentParts: readonly UserMessageContentPart[]) => ComposerAcknowledgement;
  readonly onStartGoal?: (objective: string) => ComposerAcknowledgement;
  readonly onSubmit: (contentParts: readonly UserMessageContentPart[]) => ComposerAcknowledgement;
  /** Runs after accepted content is cleared; new chats navigate at this boundary. */
  readonly onAccepted?: () => void;
  readonly controlTray?: ReactNode;
  readonly controlsPending?: boolean;
  readonly queuePending?: boolean;
  readonly placeholder?: string;
  readonly projectPath: string;
  readonly slashCommandActions?: ClientSlashCommandActions;
  readonly streamStatus?: SessionLiveStatus;
  readonly toolbarControls?: ReactNode;
  /** Compact chat actions that belong beside Send instead of in a primary header. */
  readonly toolbarActions?: ReactNode;
  readonly topExtension?: ReactNode;
}

/** Renders the message composer, including editor, attachments, toolbar, and its send, steer and stop actions. */
export default function SessionComposer(props: SessionComposerProps) {
  const {
    attachments,
    disabled,
    draft,
    onInterrupt,
    onSteer,
    onQueue,
    onStartGoal,
    onSubmit,
    onAccepted,
    controlTray,
    controlsPending = false,
    queuePending = false,
    placeholder = "Ask anything, @ to add files, or / for commands",
    projectPath,
    slashCommandActions,
    streamStatus = "idle",
    toolbarControls,
    toolbarActions,
    topExtension,
  } = props;

  const [draftText, setDraftText] = useState(() => textFromComposerContentParts(draft.contentParts));
  const [suggestionMatch, setSuggestionMatch] = useState<ComposerSuggestionMatch | null>(null);
  const [goalInput, setGoalInput] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const submittingRef = useRef(false);

  const inputDisabled = disabled;
  const isStreaming = streamStatus === "streaming" || streamStatus === "stopping" || streamStatus === "compacting";
  const queueMode = (isStreaming || queuePending) && onQueue !== undefined;
  const goalObjective = goalCommandObjective(draftText);
  const goalMode = goalInput || goalObjective !== null;
  const pending = submitting || controlsPending;
  const attachmentDisabled = inputDisabled || attachments.isProcessing || pending;
  const canSubmit =
    (draftText.trim().length > 0 || (!goalMode && attachments.attachments.length > 0)) &&
    !inputDisabled &&
    !attachments.isProcessing &&
    !pending &&
    streamStatus !== "checkpoint-navigating" &&
    (streamStatus === "idle" || queueMode || goalMode);
  const canInterrupt = streamStatus === "streaming" || streamStatus === "compacting";
  // Steering carries text only, so attachments stay in the draft for the next turn.
  const canSteer = onSteer !== undefined && streamStatus === "streaming" && draftText.trim().length > 0 && !inputDisabled && !pending && !goalMode;

  const editor = useEditor(
    {
      editable: !inputDisabled,
      content: contentPartsToEditorContent(draft.contentParts),
      editorProps: {
        attributes: {
          class: cn(
            "scroll-fade-y max-h-48 min-h-10 w-full min-w-0 overflow-y-auto whitespace-pre-wrap wrap-anywhere bg-transparent p-1 text-sm leading-5 text-ink outline-none",
            inputDisabled && "cursor-default opacity-60"
          ),
        },
      },
      extensions: [Document, Paragraph, Text, ComposerHardBreak, History, ComposerReferenceNode, createSuggestionExtension(setSuggestionMatch)],
      onCreate: ({editor: currentEditor}) => {
        setDraftText(currentEditor.getText());
        if (draft.contentParts.length > 0) draft.setEditableContentParts?.(editorToContentParts(currentEditor));
      },
      onUpdate: ({editor: currentEditor}) => {
        setDraftText(currentEditor.getText());
        draft.setEditableContentParts?.(editorToContentParts(currentEditor));
      },
    },
    []
  );

  const openGoalInput = (): void => {
    if (pending || inputDisabled) return;
    setGoalInput(true);
    setSubmissionError(null);
    if (goalCommandObjective(editor?.getText() ?? draftText) === "") {
      editor?.commands.clearContent();
      setDraftText("");
      draft.setEditableContentParts?.([]);
    }
    editor?.commands.focus();
  };

  const deliver = async (steering = false): Promise<void> => {
    if (submittingRef.current || (steering ? !canSteer : !canSubmit)) return;
    const text = editor?.getText() ?? draftText;
    const objective = goalCommandObjective(text);
    if (!steering && (goalInput || objective !== null) && !(objective ?? text).trim()) {
      openGoalInput();
      return;
    }
    if (!steering && (goalInput || objective !== null) && !onStartGoal) {
      setSubmissionError("Start a chat before setting a goal. Your command has not been sent.");
      return;
    }

    const contentParts = [...(editor ? editorToContentParts(editor) : draft.contentParts.filter((part) => part.type !== "attachment")), ...attachments.attachments];
    const startingGoal = !steering && (goalInput || objective !== null);
    submittingRef.current = true;
    setSubmitting(true);
    setSubmissionError(null);
    editor?.setEditable(false);
    try {
      const accepted = await submitComposerDraft({
        contentParts,
        includeAttachments: !steering && !startingGoal,
        send: () => {
          if (startingGoal) return onStartGoal?.((objective ?? text).trim());
          if (steering) return onSteer?.(text);
          const parts = [...trimComposerContentParts(contentParts.filter((part) => part.type !== "attachment")), ...attachments.attachments];
          return queueMode ? onQueue?.(parts) : onSubmit(parts);
        },
        readCurrentContent: () => (editor && !editor.isDestroyed ? editorToContentParts(editor) : draft.contentParts),
        clearEditable: () => {
          if (editor?.isDestroyed) return;
          editor?.commands.clearContent();
          setDraftText("");
          draft.setEditableContentParts?.([]);
        },
        removeAttachment: attachments.remove,
      });
      if (!accepted) setSubmissionError("The message was not accepted. Your draft has been kept.");
      else {
        if (startingGoal) setGoalInput(false);
        onAccepted?.();
      }
    } catch (cause) {
      setSubmissionError(cause instanceof Error ? cause.message : "Unable to send. Your draft has been kept.");
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
      if (editor && !editor.isDestroyed) editor.setEditable(!inputDisabled);
    }
  };

  const handleInterrupt = (): void => {
    if (canInterrupt) onInterrupt?.();
  };

  return (
    <div className="relative z-20 px-4 pb-7 md:px-6">
      <div className="relative mx-auto max-w-3xl">
        {topExtension && (
          <div className="pointer-events-none absolute inset-x-0 bottom-full z-0">
            <div className="pointer-events-auto">{topExtension}</div>
          </div>
        )}
        {controlTray}
        {goalInput && (
          <div className="flex items-start gap-2 rounded-t-2xl border border-b-0 border-border bg-surface-drawer px-3 py-2.5 text-sm">
            <Icon name="gauge" className="mt-0.5 text-ink-muted" size="sm" />
            <div className="min-w-0 flex-1">
              <p className="font-medium text-ink">New goal</p>
              <p className="text-xs text-ink-muted">Describe the outcome below. Pi+ continues in bounded passes; you can pause at any time.</p>
              {attachments.attachments.length > 0 && <p className="mt-1 text-xs text-ink-muted">Attachments stay in your draft; send them as a message for the agent to read.</p>}
            </div>
            <Button disabled={pending} onClick={() => setGoalInput(false)} variant="ghost">
              Cancel
            </Button>
          </div>
        )}
        <div
          className={cn(
            "@container relative z-10 rounded-2xl border border-border bg-surface-control px-3 py-2.5 transition-colors focus-within:border-ink-faint",
            isStreaming && "border-ink-faint"
          )}
          data-stream-status={streamStatus}
        >
          <SessionComposerAttachments
            attachments={{
              ...attachments,
              remove: (id) => {
                if (!pending) attachments.remove(id);
              },
            }}
          />
          <SessionComposerInput
            attachmentDisabled={attachmentDisabled}
            attachments={attachments}
            input={{draftText, editable: !inputDisabled && !pending, editor, onSuggestionMatchChange: setSuggestionMatch, suggestionMatch}}
            onSubmit={() => void deliver()}
            onGoal={openGoalInput}
            placeholder={goalInput ? "What should this chat accomplish?" : placeholder}
            projectPath={projectPath}
            slashCommandActions={slashCommandActions}
          />
          {submissionError && (
            <p role="alert" className="px-1 pt-2 text-xs text-danger-ink">
              {submissionError}
            </p>
          )}
          <div className="mt-2 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <SessionComposerAttachButton attachments={attachments} disabled={attachmentDisabled} />
              {toolbarControls}
            </div>
            <div className="flex shrink-0 items-center gap-3">
              {toolbarActions}
              <ComposerSendAction
                canInterrupt={canInterrupt}
                canSend={canSubmit}
                canSteer={canSteer}
                onInterrupt={handleInterrupt}
                onSend={() => void deliver()}
                onSteer={() => void deliver(true)}
                sendLabel={goalMode ? "Start goal" : queueMode ? "Queue message" : "Send message"}
                streamStatus={streamStatus}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
