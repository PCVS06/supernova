import Button from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import IconButton from "@/components/ui/icon-button";
import type {SessionLiveStatus} from "@/features/sessions/stores/session-live-store";

interface ComposerSendActionProps {
  readonly canInterrupt: boolean;
  readonly canSend: boolean;
  readonly canSteer: boolean;
  readonly onInterrupt: () => void;
  readonly onSend: () => void;
  readonly onSteer: () => void;
  readonly streamStatus: SessionLiveStatus;
  readonly sendLabel?: "Send message" | "Queue message" | "Start goal";
}

/** Enter's action stays primary; steering and stop remain explicit secondary controls. */
export default function ComposerSendAction(props: ComposerSendActionProps) {
  const {canInterrupt, canSend, canSteer, onInterrupt, onSend, onSteer, streamStatus, sendLabel = "Send message"} = props;
  const streaming = streamStatus === "streaming" || streamStatus === "stopping" || streamStatus === "compacting";

  return (
    <div className="flex items-center gap-1.5">
      {streaming && sendLabel !== "Start goal" && (
        <Button
          aria-label="Steer now"
          className="shrink-0 px-2 text-xs"
          disabled={!canSteer}
          onClick={onSteer}
          title="Give this text to the running agent now. Attachments stay in your draft."
          variant="ghost"
        >
          Steer now
        </Button>
      )}
      <IconButton
        className="size-7 shrink-0 rounded-full"
        disabled={!canSend}
        label={sendLabel}
        onClick={onSend}
        size="none"
        title={sendLabel === "Queue message" ? "Queue message — runs after the current turn, in order" : sendLabel}
        variant="filled"
      >
        <Icon name={sendLabel === "Start goal" ? "gauge" : sendLabel === "Queue message" ? "new-chat" : "send"} size="sm" />
      </IconButton>
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
