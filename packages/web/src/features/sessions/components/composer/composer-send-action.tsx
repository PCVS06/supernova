import Button from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import IconButton from "@/components/ui/icon-button";
import type {SessionLiveStatus} from "@/features/sessions/stores/session-live-store";

interface ComposerSendActionProps {
  readonly canInterrupt: boolean;
  readonly canSend: boolean;
  readonly canSteer: boolean;
  readonly dictating: boolean;
  readonly dictationSupported: boolean;
  readonly onInterrupt: () => void;
  readonly onSend: () => void;
  readonly onSteer: () => void;
  readonly onToggleDictation: () => void;
  readonly streamStatus: SessionLiveStatus;
  readonly sendLabel?: "Send message" | "Queue message" | "Start goal";
}

/** Shows one clear primary action: dictate, send, steer, queue, or start a goal. */
export default function ComposerSendAction(props: ComposerSendActionProps) {
  const {canInterrupt, canSend, canSteer, dictating, dictationSupported, onInterrupt, onSend, onSteer, onToggleDictation, streamStatus, sendLabel = "Send message"} = props;
  const streaming = streamStatus === "streaming" || streamStatus === "stopping" || streamStatus === "compacting";
  const steerPrimary = canSteer && sendLabel === "Queue message";
  const primaryLabel = steerPrimary ? "Steer now" : sendLabel;
  const showDictation = !canSend && sendLabel !== "Start goal";

  return (
    <div className="flex items-center gap-1.5">
      {steerPrimary && (
        <Button aria-label="Queue message" className="shrink-0 px-2 text-xs" onClick={onSend} title="Run this message after the current turn" variant="ghost">
          Queue
        </Button>
      )}
      {showDictation ? (
        <IconButton
          className="size-8 shrink-0 rounded-full"
          disabled={!dictationSupported}
          label={dictating ? "Stop dictation" : "Start dictation"}
          onClick={onToggleDictation}
          size="none"
          title={dictationSupported ? (dictating ? "Stop dictation" : "Dictate a message") : "Dictation is not available in this browser"}
          variant="ghost"
        >
          <Icon className={dictating ? "animate-pulse text-ink" : undefined} name="microphone" size="md" />
        </IconButton>
      ) : (
        <IconButton
          className="size-7 shrink-0 rounded-full"
          disabled={!canSend}
          label={primaryLabel}
          onClick={steerPrimary ? onSteer : onSend}
          size="none"
          title={steerPrimary ? "Give this text to the running agent now" : sendLabel === "Queue message" ? "Queue message — runs after the current turn, in order" : sendLabel}
          variant="filled"
        >
          <Icon name={sendLabel === "Start goal" ? "gauge" : sendLabel === "Queue message" && !steerPrimary ? "new-chat" : "send"} size="sm" />
        </IconButton>
      )}
      {streaming && (
        <IconButton
          label={streamStatus === "stopping" ? "Stopping stream" : "Stop streaming"}
          className="size-8"
          disabled={!canInterrupt}
          onClick={onInterrupt}
          size="none"
          title={streamStatus === "stopping" ? "Stopping the current turn" : "Stop this turn and pause the goal and queue"}
        >
          <Icon name="stop" size="md" />
        </IconButton>
      )}
    </div>
  );
}
