import {sessionComposerDraftKey, useComposerDraftsStore} from "@/features/sessions/stores/composer-drafts-store";
import {pathFileName} from "@/features/workspace/lib/workspace-paths";

interface InsertComposerFileReferenceInput {
  /** Project-relative file path, exactly as the agent should receive it. */
  readonly path: string;
  readonly sessionId: string;
}

/** Appends a file reference to a chat's composer draft so the next message can point at the file. */
export function insertComposerFileReference(input: InsertComposerFileReferenceInput): void {
  const {path, sessionId} = input;
  const key = sessionComposerDraftKey(sessionId);
  const drafts = useComposerDraftsStore.getState();
  const draft = drafts.drafts[key];

  drafts.setDraftContentParts(key, [
    ...(draft?.editableContentParts ?? []),
    {id: `part_${crypto.randomUUID()}`, kind: "file", name: pathFileName(path), type: "reference", value: path},
    {text: " ", type: "text"},
    ...(draft?.attachments ?? []),
  ]);
}
