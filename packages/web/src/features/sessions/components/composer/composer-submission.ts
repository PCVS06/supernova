import type {UserMessageContentPart} from "@supernova/contracts/sessions/schemas";

export type ComposerAcknowledgement = boolean | void | Promise<boolean | void>;

interface SubmitComposerDraftOptions {
  readonly contentParts: readonly UserMessageContentPart[];
  readonly send: () => ComposerAcknowledgement;
  readonly readCurrentContent: () => readonly UserMessageContentPart[];
  readonly clearEditable: () => void;
  readonly removeAttachment: (id: string) => void;
  readonly includeAttachments: boolean;
}

/** Clears only acknowledged, unchanged text and the exact attachments that were sent. */
export async function submitComposerDraft(options: SubmitComposerDraftOptions): Promise<boolean> {
  const {contentParts, send, readCurrentContent, clearEditable, removeAttachment, includeAttachments} = options;
  const editable = contentParts.filter((part) => part.type !== "attachment");
  if ((await send()) === false) return false;

  const currentEditable = readCurrentContent().filter((part) => part.type !== "attachment");
  if (JSON.stringify(editable) === JSON.stringify(currentEditable)) clearEditable();
  if (includeAttachments) {
    for (const part of contentParts) if (part.type === "attachment") removeAttachment(part.id);
  }
  return true;
}
