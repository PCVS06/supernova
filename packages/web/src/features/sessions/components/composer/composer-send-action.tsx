import Icon from "@/components/ui/icon";
import IconButton from "@/components/ui/icon-button";
import Button from "@/components/ui/button";
import type {SessionLiveStatus} from "@/features/sessions/stores/session-live-store";

interface ComposerSendActionProps {
  readonly canInterrupt: boolean;
  readonly canSend: boolean;
  readonly hasDraft?: boolean;
  readonly canSteer: boolean;
  readonly dictating: boolean;
  readonly dictationSupported: boolean;
  readonly onInterrupt: () => void;
  readonly onSend: () => void;
  readonly onSteer: () => void;
  readonly onToggleDictation: () => void;
  readonly streamStatus: SessionLiveStatus;
  readonly sendLabel?: "Send message" | "Queue message" | "Start goal" | "Update goal";
}

/** Keeps queued follow-ups and immediate corrections separate while preserving send, goal and stop controls. */
export default function ComposerSendAction(props: ComposerSendActionProps) {
  const {
    canInterrupt,
    canSend,
    canSteer,
    dictating,
    dictationSupported,
    onInterrupt,
    onSend,
    onSteer,
    onToggleDictation,
    streamStatus,
    sendLabel = "Send message",
    hasDraft = canSend,
  } = props;
  const streaming = streamStatus === "streaming" || streamStatus === "stopping" || streamStatus === "compacting";
  const queueMode = sendLabel === "Queue message";
  const showDictation = !hasDraft && sendLabel !== "Start goal" && sendLabel !== "Update goal";

  return (
    <div className="flex items-center gap-1.5">
      {showDictation ? (
        <IconButton
          className="grid size-8 shrink-0 place-items-center rounded-full"
          disabled={!dictationSupported}
          label={dictating ? "Stop dictation" : "Start dictation"}
          onClick={onToggleDictation}
          size="none"
          title={dictationSupported ? (dictating ? "Stop dictation" : "Dictate a message") : "Dictation is not available in this browser"}
          variant="ghost"
        >
          <Icon className={dictating ? "animate-pulse text-ink" : undefined} name="microphone" size="md" />
        </IconButton>
      ) : queueMode ? (
        <>
          {canSteer && (
            <Button aria-label="Steer now" className="w-auto whitespace-nowrap" onClick={onSteer} size="sm" title="Send this text at the next available agent step" variant="ghost">
              Steer now
            </Button>
          )}
          <Button
            aria-label="Queue next"
            className="w-auto whitespace-nowrap"
            disabled={!canSend}
            onClick={onSend}
            size="sm"
            title="Queue the complete message for the next turn · Enter"
            variant="filled"
          >
            Queue next
          </Button>
        </>
      ) : (
        <IconButton
          className="grid size-8 shrink-0 place-items-center rounded-full"
          disabled={!canSend}
          label={sendLabel}
          onClick={onSend}
          size="none"
          title={sendLabel}
          variant="filled"
        >
          <Icon name="send" size="sm" />
        </IconButton>
      )}
      {streaming && (
        <IconButton
          label={streamStatus === "stopping" ? "Stopping stream" : "Stop streaming"}
          className="grid size-8 place-items-center"
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
