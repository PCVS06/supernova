import Button from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import IconButton from "@/components/ui/icon-button";
import Disclosure from "@/components/ui/disclosure";
import ExpandableControlRow from "@/features/sessions/components/composer/expandable-control-row";
import type {SessionControlsAction, SessionControlsState} from "@/features/sessions/hooks/api/use-session-controls";
import {textFromComposerContentParts} from "@/features/sessions/lib/composer/composer-content-parts";
import {cn} from "@/lib/cn";
import {useState} from "react";

interface GoalRowProps {
  readonly goal: NonNullable<SessionControlsState["goal"]>;
  readonly pending: boolean;
  readonly onAction: (action: SessionControlsAction) => Promise<boolean>;
  readonly draft?: string;
  readonly onEdit?: (objective: string | null) => void;
}

function GoalRow(props: GoalRowProps) {
  const {goal, pending, onAction, draft, onEdit} = props;
  const status = {active: "Active", paused: "Paused", completed: goal.message?.startsWith("Agent-reported") ? "Reported complete" : "Done", blocked: "Needs attention"}[
    goal.status
  ];

  return (
    <ExpandableControlRow
      label={goal.objective}
      status={status}
      summary={
        <>
          <p>
            {goal.turnsUsed} of {goal.maxTurns} turns used
          </p>
          {goal.message && <p className="mt-1 whitespace-pre-wrap wrap-anywhere">{goal.message}</p>}
        </>
      }
      expanded={draft !== undefined}
      onExpandedChange={(expanded) => onEdit?.(expanded ? goal.objective : null)}
      leading={<Icon name={goal.status === "completed" ? "check" : "gauge"} size="sm" />}
      actions={
        <>
          <IconButton
            className="grid size-8 place-items-center"
            label="Delete goal"
            title="Delete goal; current work is not undone"
            disabled={pending}
            onClick={() => void onAction({type: "clear_goal"})}
            size="none"
          >
            <Icon name="trash" size="xs" />
          </IconButton>
        </>
      }
    >
      <textarea
        aria-label="Goal objective"
        className="min-h-20 max-h-36 w-full resize-none rounded-lg bg-transparent p-1 text-sm leading-5 text-ink outline-none focus-visible:ring-1 focus-visible:ring-border-strong"
        value={draft ?? goal.objective}
        disabled={pending}
        maxLength={20_000}
        onChange={(event) => onEdit?.(event.target.value)}
      />
      <p className="mt-1 text-xs text-ink-muted">Edit here, then use the send button below to update and run this goal.</p>
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
  readonly revision: number;
  readonly count: number;
}

function QueuedMessageRow(props: QueuedMessageRowProps) {
  const {message, index, pending, working, paused, onAction, revision, count} = props;
  const [edit, setEdit] = useState<{text: string; revision: number} | null>(null);
  const text = textFromComposerContentParts(message.contentParts);
  const attachments = message.contentParts.filter((part) => part.type === "attachment");
  const preview = text || `${attachments.length} attachment${attachments.length === 1 ? "" : "s"}`;
  // The server prepares the complete queued message, including attached files.
  const uncertain = message.deliveryStatus === "uncertain";
  const canSteer = working && !uncertain && message.contentParts.length > 0;

  return (
    <li className="flex items-start gap-2 px-3 py-2">
      <span className="w-4 shrink-0 pt-0.5 text-center text-xs tabular-nums text-ink-faint">{index + 1}</span>
      <div className="min-w-0 flex-1">
        {edit ? (
          <div className="space-y-2">
            <textarea
              aria-label={`Edit queued message ${index + 1}`}
              className="min-h-20 w-full rounded-lg bg-surface-raised p-2 text-sm"
              value={edit.text}
              disabled={pending}
              onChange={(event) => setEdit({...edit, text: event.target.value})}
            />
            <p className="text-xs text-ink-muted">Attached files and references are kept.</p>
            <div className="flex gap-3">
              <Button
                disabled={pending || uncertain}
                onClick={() =>
                  void onAction({type: "edit_queued", id: message.id, text: edit.text, expectedRevision: edit.revision}).then((accepted) => {
                    if (accepted) setEdit(null);
                  })
                }
                variant="ghost"
              >
                Save queued message
              </Button>
              <Button disabled={pending} onClick={() => setEdit(null)} variant="ghost">
                Cancel edit
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-ink">
            <span className="min-w-0 flex-1">
              <span className="line-clamp-1 wrap-anywhere">{preview}</span>
              <span className="mt-0.5 block text-xs text-ink-muted">{uncertain ? "Delivery needs review" : paused ? "Queued · paused" : "Queued · after the current turn"}</span>
            </span>
          </div>
        )}
        {!edit && !uncertain && (
          <div className="mt-1 flex gap-3 text-xs">
            <Button
              disabled={pending || !paused}
              title={paused ? "Edit this waiting message" : "Pause the queue to edit while the current turn continues"}
              onClick={() =>
                setEdit({
                  text: message.contentParts
                    .filter((part) => part.type === "text")
                    .map((part) => part.text)
                    .join("\n"),
                  revision,
                })
              }
              variant="ghost"
              aria-label={`Edit queued message ${index + 1}`}
            >
              Edit
            </Button>
            <Button
              disabled={pending || index === 0}
              onClick={() => void onAction({type: "move_queued", id: message.id, direction: "up", expectedRevision: revision})}
              variant="ghost"
              aria-label={`Move queued message ${index + 1} up`}
            >
              Move up
            </Button>
            <Button
              disabled={pending || index === count - 1}
              onClick={() => void onAction({type: "move_queued", id: message.id, direction: "down", expectedRevision: revision})}
              variant="ghost"
              aria-label={`Move queued message ${index + 1} down`}
            >
              Move down
            </Button>
          </div>
        )}
        {(text.length > 120 || attachments.length > 0) && (
          <Disclosure label="Message details">
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
          </Disclosure>
        )}
      </div>
      {uncertain && <span className="shrink-0 text-xs text-danger-ink">Check delivery</span>}
      {working && (
        <Button
          className="shrink-0 text-xs"
          disabled={pending || !canSteer}
          onClick={() => void onAction({type: "steer_queued", id: message.id})}
          title={canSteer ? "Give this complete message to the running agent now" : "Steering requires confirmed delivery state"}
          variant="ghost"
        >
          Steer
        </Button>
      )}
      <IconButton
        label={`Remove queued message ${index + 1}`}
        title="Delete message"
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
  readonly goalDraft?: string;
  readonly onGoalEdit?: (objective: string | null) => void;
}

/** One attached surface for durable goals and FIFO messages, with complete text available in place. */
export default function SessionControlsTray(props: SessionControlsTrayProps) {
  const {state, error, pending, working, onAction, onRefresh, goalDraft, onGoalEdit} = props;
  if (!state?.goal && !state?.queue.length && !state?.steering?.length && !state?.error && !error) return null;
  const uncertain = state?.queue.some((message) => message.deliveryStatus === "uncertain") === true;
  const controlsDisabled = pending || !!state?.error;

  return (
    <section aria-label="Goal and queued messages" className="w-full overflow-hidden bg-surface-control">
      {!!state?.steering?.length && (
        <div aria-label="Accepted steering" role="status" className="max-h-24 space-y-1 overflow-y-auto px-3 py-2 text-xs text-ink-muted">
          <p>Steering accepted · available to the agent at its next step</p>
          {state.steering.map((message) => (
            <p className="line-clamp-2 whitespace-pre-wrap text-ink" key={message.id}>
              {textFromComposerContentParts(message.contentParts)}
            </p>
          ))}
        </div>
      )}
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
              <Button
                disabled={controlsDisabled}
                onClick={() => void onAction({type: "pause_queue"})}
                title="Pause waiting messages to edit them; the current response continues"
                variant="ghost"
              >
                Pause queue
              </Button>
            )}
          </div>
          <ol className="max-h-40 overflow-y-auto">
            {state.queue.map((message, index) => (
              <QueuedMessageRow
                key={message.id}
                message={message}
                index={index}
                pending={controlsDisabled}
                working={working}
                paused={state.queuePaused}
                onAction={onAction}
                revision={state.revision}
                count={state.queue.length}
              />
            ))}
          </ol>
        </>
      )}
      {state?.goal && (
        <div className={cn(state.queue.length > 0 && "pt-1")}>
          <GoalRow goal={state.goal} pending={controlsDisabled} onAction={onAction} draft={goalDraft} onEdit={onGoalEdit} />
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
