import {parsePatchFiles} from "@pierre/diffs";
import type {CheckpointPreview} from "@supernova/contracts/session-runtime/procedures";
import {useState} from "react";
import Button from "@/components/ui/button";
import Dialog from "@/components/ui/dialog";
import DiffViewer from "@/features/sessions/components/diffs/diff-viewer";
import {useGeneralSettingsStore} from "@/features/settings/stores/general-settings-store";

/** Parses supported patch formats without hiding raw evidence on parser failure. */
function parseRestorePatch(patch: string, fingerprint: string) {
  try {
    return parsePatchFiles(patch, fingerprint, true).flatMap((entry) => entry.files);
  } catch {
    return [];
  }
}

interface RestorePatchProps {
  readonly patch: string;
  readonly fingerprint: string;
}

/** Falls back to readable patch text for binary files or unsupported diff formats. */
function RestorePatch({patch, fingerprint}: RestorePatchProps) {
  const files = parseRestorePatch(patch, fingerprint);
  if (files.length)
    return (
      <>
        {files.map((file, index) => (
          <DiffViewer fileDiff={file} key={`${fingerprint}:${index}`} />
        ))}
      </>
    );
  return (
    <pre className="overflow-x-auto whitespace-pre-wrap text-xs text-ink-muted">{patch || "No textual changes. The restore may affect file permissions or binary content."}</pre>
  );
}

interface CheckpointConflictDialogProps {
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
  readonly open: boolean;
  readonly reason: "conflict" | "uncaptured" | "review";
  readonly preview?: CheckpointPreview;
  readonly message?: string;
  readonly turnsBefore?: number;
  readonly turnsAfter?: number;
}

/** Shows the exact restore scope before changing the workspace or conversation. */
export default function CheckpointConflictDialog(props: CheckpointConflictDialogProps) {
  const {onCancel, onConfirm, open, reason, preview, message, turnsBefore, turnsAfter} = props;
  const [dontAskAgain, setDontAskAgain] = useState(false);
  const setConfirmCheckpointConflicts = useGeneralSettingsStore((state) => state.setConfirmCheckpointConflicts);

  const handleCancel = (): void => {
    setDontAskAgain(false);
    onCancel();
  };

  const handleConfirm = (): void => {
    if (dontAskAgain && !preview) setConfirmCheckpointConflicts(false);
    setDontAskAgain(false);
    onConfirm();
  };

  return (
    <Dialog
      className="h-auto max-h-[85vh]"
      containerClassName={preview ? "h-auto w-[min(calc(100vw-1rem),56rem)]" : "h-auto w-[min(calc(100vw-1rem),26rem)]"}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) handleCancel();
      }}
      open={open}
      title={preview ? "Review and restore" : "Discard changes?"}
    >
      <div className="flex min-h-0 flex-col gap-4 pb-5 pt-2">
        {preview ? (
          <>
            <div className="space-y-2 text-sm text-ink-muted">
              <p>{message}</p>
              <p className="font-medium text-ink">Current workspace → selected checkpoint</p>
              <p>
                Conversation: {turnsBefore} → {turnsAfter} turns. {preview.files.length} affected {preview.files.length === 1 ? "file" : "files"}.
              </p>
              {preview.manualChanges && <p className="text-danger-ink">This restore includes manual changes to affected files. Review them below before continuing.</p>}
              <p>
                {preview.filesCaptured
                  ? "Only captured files in the project repository and immediate child repositories can be restored. Ignored untracked files, other untracked files over 2 MiB and external actions are outside this snapshot. Unaffected files are kept."
                  : "No workspace snapshot was captured for this checkpoint. Files will stay as they are."}
              </p>
            </div>
            <div className="max-h-[45vh] space-y-3 overflow-auto rounded-md border border-edge p-3" aria-label="Restore preview">
              {preview.files.length === 0 ? (
                <p className="text-sm text-ink-muted">No file changes in this restore.</p>
              ) : (
                <ul className="space-y-1 text-xs">
                  {preview.files.map((file) => (
                    <li className="flex gap-2" key={file.path}>
                      <span className="w-14 shrink-0 text-ink-muted">{file.action === "delete" ? "Delete" : "Restore"}</span>
                      <span className="break-all font-mono">{file.path}</span>
                    </li>
                  ))}
                </ul>
              )}
              {preview.patches.map((entry) => (
                <section className="space-y-2" key={`${preview.fingerprint}:${entry.repository}`}>
                  <h3 className="text-xs font-medium">{entry.repository === "." ? "Project repository" : entry.repository}</h3>
                  {entry.unavailable ? (
                    <p className="text-sm text-danger-ink">{entry.patch}</p>
                  ) : (
                    <RestorePatch fingerprint={`${preview.fingerprint}:${entry.repository}`} patch={entry.patch} />
                  )}
                </section>
              ))}
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-ink-muted">
              {reason === "uncaptured"
                ? "The current checkpoint has no workspace snapshot because checkpoint capture was disabled or failed. Continuing may discard later changes, including manual edits."
                : "Changes have been made to files since the current checkpoint. Continuing will overwrite affected changes."}
            </p>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-muted">
              <input checked={dontAskAgain} className="size-3.5 accent-ink" onChange={(event) => setDontAskAgain(event.target.checked)} type="checkbox" />
              Don&apos;t ask again for conflicts
            </label>
          </>
        )}
        <div className="flex justify-end gap-2">
          <Button className="w-auto px-3 py-1.5 text-sm" onClick={handleCancel} variant="primary">
            Cancel
          </Button>
          <Button className="w-auto px-3 py-1.5 text-sm text-danger-ink" onClick={handleConfirm} variant="primary">
            {preview ? (preview.files.length ? "Restore files and conversation" : "Restore conversation") : "Discard and continue"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
