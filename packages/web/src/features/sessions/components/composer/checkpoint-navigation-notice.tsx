import Button from "@/components/ui/button";

interface CheckpointNavigationNoticeProps {
  readonly reason: "conflict" | "uncaptured" | "review";
  readonly disabled: boolean;
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
}

/** Keeps exceptional workspace conflicts inline while ordinary history steps apply directly. */
export default function CheckpointNavigationNotice(props: CheckpointNavigationNoticeProps) {
  const {reason, disabled, onCancel, onConfirm} = props;
  return (
    <section className="mx-2 mb-2 flex flex-wrap items-center gap-2 rounded-lg bg-surface-recessed px-3 py-2 text-xs" aria-label="History conflict">
      <p className="min-w-0 flex-1 text-ink-muted">
        {reason === "uncaptured" ? "This step has no complete file snapshot. Continuing may overwrite later edits." : "This step would overwrite manual edits in affected files."}
      </p>
      <Button className="w-auto shrink-0" size="sm" onClick={onCancel}>
        Cancel
      </Button>
      <Button className="w-auto shrink-0" size="sm" disabled={disabled} onClick={onConfirm}>
        Restore anyway
      </Button>
    </section>
  );
}
