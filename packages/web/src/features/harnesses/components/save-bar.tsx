import {AnimatePresence, motion} from "framer-motion";
import Button from "@/components/ui/button";
import {cn} from "@/lib/cn";

const transition = {duration: 0.18, ease: [0.32, 0.72, 0, 1]} as const;

interface SaveBarProps {
  dirty: boolean;
  /** Names the owners with unsaved edits, such as "Science Pi, Robot Lab". */
  changed: string;
  savePending: boolean;
  /** The last save failure, kept until the next attempt. */
  error?: unknown;
  onDiscard: () => void;
  onSave: () => void;
}

/** The only save in harness configuration: one bar along the bottom that exists while there is something to save. */
export default function SaveBar(props: SaveBarProps) {
  const {dirty, changed, savePending, error, onDiscard, onSave} = props;
  const failed = error !== undefined && error !== null;
  const visible = dirty || savePending || failed;

  return (
    <AnimatePresence initial={false}>
      {visible && (
        <motion.div
          animate={{opacity: 1, y: 0}}
          aria-label="Unsaved changes"
          className="z-10 flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-border bg-surface-sidebar px-5 py-3 sm:px-6"
          exit={{opacity: 0, y: 24}}
          initial={{opacity: 0, y: 24}}
          key="save-bar"
          role="group"
          transition={transition}
        >
          <p className={cn("min-w-0 truncate text-xs", failed ? "text-danger-ink" : "text-ink-muted")} role={failed ? "alert" : undefined}>
            {failed ? `${String(error)} Unsaved edits are still here.` : savePending ? "Saving…" : `Unsaved changes · ${changed}`}
          </p>
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
        </motion.div>
      )}
    </AnimatePresence>
  );
}
