import Button from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import IconButton from "@/components/ui/icon-button";
import ExpandableControlRow from "@/features/sessions/components/composer/expandable-control-row";
import type {SessionControlsAction, SessionControlsState} from "@/features/sessions/hooks/api/use-session-controls";
import {textFromComposerContentParts} from "@/features/sessions/lib/composer/composer-content-parts";
import {cn} from "@/lib/cn";

interface GoalRowProps {
  readonly goal: NonNullable<SessionControlsState["goal"]>;
  readonly pending: boolean;
  readonly onAction: (action: SessionControlsAction) => Promise<boolean>;
}

function GoalRow(props: GoalRowProps) {
  const {goal, pending, onAction} = props;
  const active = goal.status === "active";
  const canResume = (goal.status === "paused" || goal.status === "blocked") && goal.turnsUsed < goal.maxTurns;
  const status = {active: "Active", paused: "Paused", completed: "Done", blocked: "Needs attention"}[goal.status];

  return (
    <ExpandableControlRow
      label={goal.objective}
      status={status}
      leading={<Icon name={goal.status === "completed" ? "check" : "gauge"} size="sm" />}
      actions={
        <>
          {(active || canResume) && (
            <Button
              className="shrink-0 px-2 text-xs"
              disabled={pending}
              onClick={() => void onAction({type: active ? "pause_goal" : "resume_goal"})}
              title={active ? "Pause goal" : "Resume goal"}
              variant="ghost"
            >
              {active ? "Pause" : "Resume"}
            </Button>
          )}
          <IconButton
            className="grid size-8 place-items-center"
            label="Clear goal"
            title="Clear goal; current work is not undone"
            disabled={pending}
            onClick={() => void onAction({type: "clear_goal"})}
            size="none"
          >
            <Icon name="trash" size="xs" />
          </IconButton>
        </>
      }
    >
      <p className="whitespace-pre-wrap wrap-anywhere text-sm text-ink">{goal.objective}</p>
      {goal.message && <p className="mt-1 whitespace-pre-wrap wrap-anywhere text-xs text-ink-muted">{goal.message}</p>}
      {goal.status !== "completed" && (
        <Button className="mt-2 text-xs" disabled={pending} onClick={() => void onAction({type: "complete_goal"})} variant="ghost">
          Mark complete
        </Button>
      )}
    </ExpandableControlRow>
  );
}

interface QueuedMessageRowProps {
  readonly message: SessionControlsState["queue"][number];
  readonly index: number;
  readonly pending: boolean;
  readonly working: boolean;
  readonly paused: boolean;
  readonly onAction: (action: SessionControlsAction) => Promise<boolean>;
}

function QueuedMessageRow(props: QueuedMessageRowProps) {
  const {message, index, pending, working, paused, onAction} = props;
  const text = textFromComposerContentParts(message.contentParts);
  const attachments = message.contentParts.filter((part) => part.type === "attachment");
  const preview = text || `${attachments.length} attachment${attachments.length === 1 ? "" : "s"}`;
  // The server prepares the complete queued message, including attached files.
  const uncertain = message.deliveryStatus === "uncertain";
  const canSteer = working && !uncertain && message.contentParts.length > 0;

  return (
    <li className="flex items-start gap-2 px-3 py-2.5">
      <span className="w-4 shrink-0 pt-0.5 text-center text-xs tabular-nums text-ink-faint">{index + 1}</span>
      <details className="group min-w-0 flex-1">
        <summary className="flex cursor-pointer list-none items-center gap-2 text-sm text-ink [&::-webkit-details-marker]:hidden">
          <span className="min-w-0 flex-1">
            <span className="line-clamp-2 wrap-anywhere">{preview}</span>
            <span className="mt-0.5 block text-xs text-ink-muted">{uncertain ? "Delivery needs review" : paused ? "Queued · paused" : "Queued · after the current turn"}</span>
          </span>
          <Icon className="ml-auto text-ink-faint transition-transform group-open:rotate-90" name="chevron-right" size="xs" />
        </summary>
        <div className="mt-2 whitespace-pre-wrap wrap-anywhere text-sm text-ink">{text}</div>
        {attachments.map((attachment) => (
          <p className="mt-1 flex items-center gap-1 text-xs text-ink-muted" key={attachment.id}>
            <Icon name="paperclip" size="xs" />
            {attachment.name}
          </p>
        ))}
        <p className="mt-1 text-xs text-ink-faint">
          {message.modelReference.id}
          {message.modelReference.thinkingLevel ? ` · ${message.modelReference.thinkingLevel}` : ""}
        </p>
        {uncertain && <p className="mt-1 text-xs text-danger-ink">Delivery is uncertain. Inspect the chat before removing or sending this message again.</p>}
      </details>
      {uncertain && <span className="shrink-0 text-xs text-danger-ink">Check delivery</span>}
      {working && (
        <Button
          className="shrink-0 text-xs"
          disabled={pending || !canSteer}
          onClick={() => void onAction({type: "steer_queued", id: message.id})}
          title={canSteer ? "Give this complete message to the running agent now" : "Steering requires confirmed delivery state"}
          variant="ghost"
        >
          Steer now
        </Button>
      )}
      <IconButton
        label={`Remove queued message ${index + 1}`}
        title="Remove from queue"
        disabled={pending}
        onClick={() => void onAction({type: "remove_queued", id: message.id})}
        size="sm"
      >
        <Icon name="trash" size="xs" />
      </IconButton>
    </li>
  );
}

interface SessionControlsTrayProps {
  readonly state?: SessionControlsState;
  readonly error?: unknown;
  readonly pending: boolean;
  readonly working: boolean;
  readonly onAction: (action: SessionControlsAction) => Promise<boolean>;
  readonly onRefresh: () => void;
}

/** One attached surface for durable goals and FIFO messages, with complete text available in place. */
export default function SessionControlsTray(props: SessionControlsTrayProps) {
  const {state, error, pending, working, onAction, onRefresh} = props;
  if (!state?.goal && !state?.queue.length && !state?.error && !error) return null;
  const uncertain = state?.queue.some((message) => message.deliveryStatus === "uncertain") === true;
  const controlsDisabled = pending || !!state?.error;

  return (
    <section aria-label="Goal and queued messages" className="w-full overflow-hidden border-b border-border bg-surface-drawer">
      {state && state.queue.length > 0 && (
        <>
          <div className="flex items-center justify-between gap-2 px-3 pb-1 pt-2 text-xs text-ink-muted">
            <span>
              {state.queuePaused ? "Queue paused" : "Up next"} · {state.queue.length} {state.queue.length === 1 ? "message" : "messages"}
            </span>
            {state.queuePaused ? (
              <Button
                disabled={controlsDisabled || uncertain}
                onClick={() => void onAction({type: "resume_queue"})}
                title={uncertain ? "Review and remove messages with uncertain delivery first" : "Run waiting messages in order"}
                variant="ghost"
              >
                Resume queue
              </Button>
            ) : (
              <span>Runs in order</span>
            )}
          </div>
          <ol className="max-h-48 divide-y divide-border overflow-y-auto">
            {state.queue.map((message, index) => (
              <QueuedMessageRow key={message.id} message={message} index={index} pending={controlsDisabled} working={working} paused={state.queuePaused} onAction={onAction} />
            ))}
          </ol>
        </>
      )}
      {state?.goal && (
        <div className={cn(state.queue.length > 0 && "border-t border-border")}>
          <GoalRow goal={state.goal} pending={controlsDisabled} onAction={onAction} />
        </div>
      )}
      {(!!error || !!state?.error) && (
        <div role="alert" className="flex items-start justify-between gap-3 px-3 py-2 text-xs text-danger-ink">
          <span>
            {state?.error
              ? `${state.error} New actions are paused. Fix storage and restart the server; you can still inspect or stop work.`
              : error instanceof Error
                ? error.message
                : "Unable to refresh chat controls. Your draft and queue have been kept."}
          </span>
          <Button className="shrink-0" onClick={onRefresh} variant="ghost">
            Refresh
          </Button>
        </div>
      )}
    </section>
  );
}
