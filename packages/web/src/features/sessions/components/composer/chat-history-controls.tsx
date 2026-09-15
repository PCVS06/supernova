import {useState} from "react";
import Icon from "@/components/ui/icon";
import IconButton from "@/components/ui/icon-button";

interface ChatHistoryControlsProps {
  readonly current: number;
  readonly remaining: number;
  readonly disabled: boolean;
  readonly pending: boolean;
  readonly detailsOpen: boolean;
  readonly onToggleDetails: () => void;
  readonly onStep: (direction: "back" | "forward") => void;
}

/** Unfolds compact checkpoint arrows without interrupting the draft or opening a dialog. */
export default function ChatHistoryControls(props: ChatHistoryControlsProps) {
  const {current, remaining, disabled, pending, detailsOpen, onToggleDetails, onStep} = props;
  const [open, setOpen] = useState(false);
  return (
    <div className="flex shrink-0 items-center gap-0.5" role="group" aria-label="Chat history">
      <IconButton
        label="Chat history"
        title="Step backward or forward through saved turns"
        aria-expanded={open}
        onClick={() => {
          if (open && detailsOpen) onToggleDetails();
          setOpen(!open);
        }}
      >
        <Icon name="undo" size="sm" />
      </IconButton>
      {open && (
        <>
          <IconButton label="Step backward" title="Undo the last turn and its captured file changes" disabled={disabled || current === 0} onClick={() => onStep("back")}>
            <Icon name="arrow-left" size="sm" />
          </IconButton>
          <span className="min-w-8 text-center font-mono text-xs tabular-nums text-ink-muted" role="status" aria-label="History position" aria-busy={pending}>
            {current}/{current + remaining}
          </span>
          <IconButton
            label="Step forward"
            title="Restore the next saved turn and its captured file changes"
            disabled={disabled || remaining === 0}
            onClick={() => onStep("forward")}
          >
            <Icon name="arrow-right" size="sm" />
          </IconButton>
          {remaining > 0 && (
            <IconButton label="History details" title="Choose a saved turn" aria-expanded={detailsOpen} onClick={onToggleDetails}>
              <Icon name="chevron-down" size="xs" />
            </IconButton>
          )}
        </>
      )}
    </div>
  );
}
