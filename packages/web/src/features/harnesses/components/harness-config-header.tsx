import Button from "@/components/ui/button";

interface HarnessConfigHeaderProps {
  dirty: boolean;
  /** Names the owners with unsaved edits, such as "Science Pi, Robot Lab". */
  changed: string;
  savePending: boolean;
  onDiscard: () => void;
  onSave: () => void;
}

/** The only save in harness configuration: one sticky bar at the bottom of the page. */
export default function HarnessConfigHeader(props: HarnessConfigHeaderProps) {
  const {dirty, changed, savePending, onDiscard, onSave} = props;

  return (
    <div className="sticky bottom-0 z-10 flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-border bg-surface-sidebar px-5 py-3 sm:px-6" role="group">
      <p className="min-w-0 truncate text-xs text-ink-muted">{dirty ? `Unsaved changes · ${changed}` : "No unsaved changes"}</p>
      <div className="flex items-center gap-2">
        {dirty && (
          <Button className="rounded-lg border border-border px-3 py-2 text-xs text-ink-muted hover:text-ink" onClick={onDiscard}>
            Discard
          </Button>
        )}
        <Button variant="filled" className="px-3 py-2 text-xs" disabled={!dirty || savePending} onClick={onSave}>
          {savePending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </div>
  );
}
