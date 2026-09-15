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
import Icon from "@/components/ui/icon";
import AnimatedHeight from "@/components/ui/animated-height";
import {ComposerFocusContext} from "@/features/sessions/contexts/composer-focus-context";
import IconButton from "@/components/ui/icon-button";
import ComposerAttachmentPreview from "@/features/sessions/components/attachments/composer-attachment-preview";
import ComposerSendAction from "@/features/sessions/components/composer/composer-send-action";
import {submitComposerDraft} from "@/features/sessions/components/composer/composer-submission";
import type {ComposerAcknowledgement} from "@/features/sessions/components/composer/composer-submission";
import {goalCommandObjective} from "@/features/sessions/components/composer/goal-command";
import ComposerEditor from "@/features/sessions/components/composer/editor/composer-editor";
import ComposerReference from "@/features/sessions/components/composer/editor/composer-reference";
import type {ComposerAttachmentsController} from "@/features/sessions/hooks/use-composer-attachments";
import {useComposerDictation} from "@/features/sessions/hooks/use-composer-dictation";
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
  readonly hasGoal?: boolean;
  readonly goalEditor?: {readonly objective: string; readonly onSubmit: () => ComposerAcknowledgement};
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
    hasGoal = false,
    goalEditor,
    onSubmit,
    onAccepted,
    controlTray,
    controlsPending = false,
    queuePending = false,
    placeholder = "",
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
  const goalMode = !!goalEditor || goalInput || goalObjective !== null;
  const pending = submitting || controlsPending;
  const attachmentDisabled = inputDisabled || attachments.isProcessing || pending;
  const canSubmit =
    ((goalEditor?.objective ?? draftText).trim().length > 0 || (!goalMode && attachments.attachments.length > 0)) &&
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

  const handleDictationText = (text: string): void => {
    if (!editor || editor.isDestroyed) return;
    const separator = editor.getText().trim().length > 0 ? " " : "";
    editor.chain().focus().insertContent(`${separator}${text}`).run();
  };

  const dictation = useComposerDictation({onError: setSubmissionError, onText: handleDictationText});

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

  const cancelGoalInput = (): void => {
    const text = editor?.getText() ?? draftText;
    const objective = goalCommandObjective(text);
    setGoalInput(false);
    setSubmissionError(null);
    if (objective === null) {
      editor?.commands.focus();
      return;
    }

    editor?.commands.setContent(objective);
    setDraftText(objective);
    draft.setEditableContentParts?.(objective ? [{type: "text", text: objective}] : []);
    editor?.commands.focus();
  };

  const deliver = async (steering = false): Promise<void> => {
    if (submittingRef.current || (steering ? !canSteer : !canSubmit)) return;
    if (goalEditor && !steering) {
      submittingRef.current = true;
      setSubmitting(true);
      setSubmissionError(null);
      try {
        const accepted = await goalEditor.onSubmit();
        if (accepted === false) setSubmissionError("The goal update was not accepted. Your edits have been kept.");
      } catch {
        setSubmissionError("Unable to update the goal. Your edits have been kept.");
      } finally {
        submittingRef.current = false;
        setSubmitting(false);
      }
      return;
    }
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
      if (editor && !editor.isDestroyed && !inputDisabled) {
        const active = document.activeElement;
        if (active === document.body || editor.view.dom.closest('[aria-label="Message composer"]')?.contains(active)) editor.commands.focus(undefined, {scrollIntoView: false});
      }
    }
  };

  const handleInterrupt = (): void => {
    if (canInterrupt) onInterrupt?.();
  };

  return (
    <ComposerFocusContext value={() => (editor && !editor.isDestroyed ? editor.view.dom : null)}>
      <div className="relative z-20 px-4 pb-7 md:px-6">
        <div className="relative mx-auto max-w-3xl">
          {topExtension && (
            <div className="pointer-events-none absolute inset-x-0 bottom-full z-0">
              <div className="pointer-events-auto">{topExtension}</div>
            </div>
          )}
          <div
            aria-label="Message composer"
            className={cn(
              "relative z-10 overflow-hidden rounded-2xl border border-border bg-surface-control transition-colors focus-within:border-ink-faint",
              isStreaming && "border-ink-faint"
            )}
            data-controls-attached={controlTray != null}
            data-stream-status={streamStatus}
            role="group"
          >
            <AnimatedHeight>
              {controlTray}
              <div className="@container relative px-3 py-2.5">
                {!goalEditor && goalMode && (
                  <div aria-label="Goal draft" className="mb-1 flex items-center gap-1.5 px-1 text-xs text-ink-muted">
                    <Icon name="gauge" size="xs" />
                    <span className="min-w-0 flex-1 font-medium text-ink">Goal</span>
                    <IconButton className="size-6" disabled={pending} label="Cancel goal mode" onClick={cancelGoalInput} title="Send this as a normal message instead">
                      <Icon name="x" size="xs" />
                    </IconButton>
                  </div>
                )}
                <div hidden={!!goalEditor}>
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
                    input={{draftText, editable: !inputDisabled, editor, onSuggestionMatchChange: setSuggestionMatch, suggestionMatch}}
                    onSubmit={() => void deliver()}
                    onGoal={openGoalInput}
                    placeholder={goalInput ? "What should this chat accomplish?" : placeholder}
                    projectPath={projectPath}
                    slashCommandActions={slashCommandActions}
                  />
                </div>
                {submissionError && (
                  <p role="alert" className="px-1 pt-2 text-xs text-danger-ink">
                    {submissionError}
                  </p>
                )}
                {canSteer && attachments.attachments.length > 0 && (
                  <p className="px-1 pt-2 text-xs text-ink-muted" role="status">
                    Steer now sends only text and keeps your attachments here. Queue next sends the complete message.
                  </p>
                )}
                <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-1">
                    <SessionComposerAttachButton attachments={attachments} disabled={attachmentDisabled} />
                    {toolbarControls}
                  </div>
                  <div className="ml-auto flex shrink-0 items-center gap-3">
                    {toolbarActions}
                    <ComposerSendAction
                      canInterrupt={canInterrupt}
                      canSend={canSubmit}
                      hasDraft={(goalEditor?.objective ?? draftText).trim().length > 0 || attachments.attachments.length > 0}
                      canSteer={canSteer}
                      dictating={dictation.listening}
                      dictationSupported={dictation.supported}
                      onInterrupt={handleInterrupt}
                      onSend={() => void deliver()}
                      onSteer={() => void deliver(true)}
                      onToggleDictation={dictation.toggle}
                      sendLabel={goalMode ? (hasGoal ? "Update goal" : "Start goal") : queueMode ? "Queue message" : "Send message"}
                      streamStatus={streamStatus}
                    />
                  </div>
                </div>
              </div>
            </AnimatedHeight>
          </div>
        </div>
      </div>
    </ComposerFocusContext>
  );
}
