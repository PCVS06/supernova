import Button from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import IconButton from "@/components/ui/icon-button";
import type {SessionLiveStatus} from "@/features/sessions/stores/session-live-store";

export const STEER_EXPLANATION = "Steering interrupts the current step and hands your message to the running turn.";

interface ComposerSendActionProps {
  readonly canInterrupt: boolean;
  readonly canSend: boolean;
  readonly canSteer: boolean;
  readonly onInterrupt: () => void;
  readonly onSend: () => void;
  readonly onSteer: () => void;
  readonly streamStatus: SessionLiveStatus;
}

/** The composer's primary action: send while the chat is idle, steer while a turn is running. */
export default function ComposerSendAction(props: ComposerSendActionProps) {
  const {canInterrupt, canSend, canSteer, onInterrupt, onSend, onSteer, streamStatus} = props;
  const streaming = streamStatus === "streaming" || streamStatus === "stopping";

  if (!streaming) {
    return (
      <IconButton
        label="Send message"
        className="grid size-9 place-items-center rounded-lg bg-ink text-ink-inverse transition hover:bg-ink-strong disabled:cursor-default disabled:bg-overlay-pressed disabled:text-ink-muted"
        disabled={!canSend}
        onClick={onSend}
        size="none"
        title="Send message"
        variant="bare"
      >
        <Icon name="send" size="md" />
      </IconButton>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <IconButton
        label={streamStatus === "stopping" ? "Stopping stream" : "Stop streaming"}
        className="grid size-9 place-items-center rounded-lg border border-border text-ink transition hover:bg-overlay-hover disabled:cursor-default disabled:text-ink-muted"
        disabled={!canInterrupt}
        onClick={onInterrupt}
        size="none"
        title={streamStatus === "stopping" ? "Stopping the current turn" : "Stop the current turn"}
        variant="bare"
      >
        <Icon name="stop" size="md" />
      </IconButton>
      <Button
        aria-label="Steer this turn"
        className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-ink px-3 text-sm font-medium text-ink-inverse transition hover:bg-ink-strong disabled:cursor-default disabled:bg-overlay-pressed disabled:text-ink-muted"
        disabled={!canSteer}
        onClick={onSteer}
        title={STEER_EXPLANATION}
        variant="bare"
      >
        <Icon name="corner-left-up" size="sm" />
        <span>Steer</span>
      </Button>
    </div>
  );
}
