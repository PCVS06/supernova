import {randomUUID} from "node:crypto";
import type {SendMessagePayload, SessionControlsAction} from "@supernova/contracts/session-runtime/procedures";
import type {QueuedSessionMessage, SessionControls} from "@supernova/contracts/session-runtime/schemas";
import type {PiSessionRuntime} from "@supernova/agent-runtime/layers/session-runtime/internal/pi-session-runtime";
import type {PiSessionTitleGeneratorShape} from "@supernova/agent-runtime/layers/session-runtime/internal/pi-session-title-generator";
import {SessionControlsStore} from "@supernova/agent-runtime/layers/session-runtime/internal/session-controls-store";
import type {StoredSessionControls} from "@supernova/agent-runtime/layers/session-runtime/internal/session-controls-store";
import {sendMessage} from "@supernova/agent-runtime/layers/session-runtime/operations/send-message";
import {steerSession} from "@supernova/agent-runtime/layers/session-runtime/operations/steer-session";
import {prepareSendMessageContext} from "@supernova/agent-runtime/layers/session-runtime/lib/user-message/send-message-context";

const DEFAULT_GOAL_TURNS = 10;
const MAX_GOAL_TURNS = 50;
const MAX_QUEUE_MESSAGES = 50;
const MAX_QUEUE_BYTES = 32 * 1024 * 1024;

/** Serializes durable chat controls without holding the lock across provider execution. */
export class SessionControlsRuntime {
  private readonly store = new SessionControlsStore();
  private serial: Promise<unknown> = Promise.resolve();
  private working = false;
  private halted = false;
  private disposed = false;
  private stopEpoch = 0;
  private executingGoalId: string | undefined;
  private dispatchedQueueId: string | undefined;
  private storageFailure: string | undefined;
  private loaded = false;
  private dispatchScheduled = false;

  public constructor(
    private readonly runtime: PiSessionRuntime,
    private readonly titleGenerator: PiSessionTitleGeneratorShape
  ) {}

  /** Returns a detached snapshot suitable for polling. */
  public get(): Promise<SessionControls> {
    return this.exclusive(async () => {
      const record = await this.load();
      if (!this.storageFailure) return structuredClone(record.state);
      const uncertain = [...record.steering.map((entry) => entry.message), ...(record.inFlight ? [record.inFlight] : [])];
      const ids = new Set(uncertain.map((entry) => entry.id));
      return structuredClone({
        ...record.state,
        error: this.storageFailure,
        queuePaused: true,
        queue: [...uncertain.map((entry) => ({...entry, deliveryStatus: "uncertain" as const})), ...record.state.queue.filter((entry) => !ids.has(entry.id))],
        goal: record.state.goal?.status === "active" ? {...record.state.goal, status: "blocked" as const, message: this.storageFailure} : record.state.goal,
      });
    });
  }

  /** Applies one requested transition; enqueueing may dispatch at the next idle boundary. */
  public async update(action: SessionControlsAction): Promise<SessionControls> {
    const state = await this.exclusive(async () => {
      this.assertMutable();
      const record = await this.load();
      const current = record.state;
      const now = new Date().toISOString();
      let next = current;
      switch (action.type) {
        case "enqueue": {
          if (!action.contentParts.some((part) => part.type !== "text" || part.text.trim())) throw new Error("A queued message cannot be empty.");
          this.runtime.resolveModel(action.modelReference);
          const message: QueuedSessionMessage = {
            contentParts: action.contentParts,
            modelReference: action.modelReference,
            captureCheckpoints: action.captureCheckpoints,
            id: randomUUID(),
            createdAt: now,
          };
          if (current.queue.length >= MAX_QUEUE_MESSAGES || Buffer.byteLength(JSON.stringify([...current.queue, message])) > MAX_QUEUE_BYTES) {
            throw new Error("Queue limit reached (50 messages or 32 MiB). Remove queued messages before adding more.");
          }
          next = {...current, queue: [...current.queue, message]};
          break;
        }
        case "remove_queued":
          if (!current.queue.some((entry) => entry.id === action.id)) throw new Error("Queued message not found.");
          next = {...current, queue: current.queue.filter((entry) => entry.id !== action.id)};
          break;
        case "steer_queued": {
          const message = current.queue.find((entry) => entry.id === action.id);
          if (!message) throw new Error("Queued message not found.");
          if (message.deliveryStatus === "uncertain") throw new Error("Delivery is uncertain after a restart. Check the chat before removing and resending this message.");
          await this.deliverSteer(record, message);
          return structuredClone((await this.load()).state);
        }
        case "start_goal": {
          const objective = action.objective.trim();
          const maxTurns = action.maxTurns ?? DEFAULT_GOAL_TURNS;
          if (!objective || objective.length > 20_000) throw new Error("A goal needs an objective of 1–20,000 characters.");
          if (!Number.isInteger(maxTurns) || maxTurns < 1 || maxTurns > MAX_GOAL_TURNS) throw new Error("Goal maxTurns must be an integer between 1 and 50.");
          if (current.goal && ["active", "paused", "blocked"].includes(current.goal.status)) throw new Error("Clear or complete the existing goal before starting another.");
          this.runtime.resolveModel(action.modelReference);
          next = {
            ...current,
            goal: {
              id: randomUUID(),
              objective,
              status: "active",
              turnsUsed: 0,
              maxTurns,
              modelReference: action.modelReference,
              captureCheckpoints: action.captureCheckpoints,
              createdAt: now,
              updatedAt: now,
            },
          };
          this.halted = false;
          break;
        }
        case "resume_goal":
          if (!current.goal || current.goal.status === "completed") throw new Error("There is no paused or blocked goal to resume.");
          if (current.goal.turnsUsed >= current.goal.maxTurns) throw new Error("The goal reached its turn limit. Review it and start a new bounded goal.");
          next = {...current, goal: {...current.goal, status: "active", message: undefined, updatedAt: now}};
          this.halted = false;
          break;
        case "pause_goal":
          if (!current.goal || current.goal.status !== "active") throw new Error("There is no active goal to pause.");
          next = {...current, goal: {...current.goal, status: "paused", updatedAt: now, message: "Paused by you. The current turn may finish; no goal continuation will start."}};
          break;
        case "clear_goal":
          next = {...current, goal: null};
          break;
        case "complete_goal":
          if (!current.goal) throw new Error("There is no goal to complete.");
          next = {...current, goal: {...current.goal, status: "completed", updatedAt: now, message: "Marked complete by you."}};
          break;
        case "resume_queue":
          if (current.queue.some((entry) => entry.deliveryStatus === "uncertain"))
            throw new Error("Some deliveries are uncertain after restart. Check the chat and remove those entries before resuming.");
          next = {...current, queuePaused: false};
          this.halted = false;
          break;
      }
      await this.save({...record, state: next});
      return structuredClone((await this.load()).state);
    });
    this.kick();
    return state;
  }

  /** Accepts an explicit user message through the normal checkpointed turn pipeline. */
  public send(input: SendMessagePayload): Promise<void> {
    const epoch = this.stopEpoch;
    return this.exclusive(async () => {
      this.assertMutable();
      if (this.working || this.runtime.isRunning()) throw new Error("Session already has active work. Queue the message or steer the running turn.");
      const record = await this.load();
      if (epoch !== this.stopEpoch) throw new Error("Session was cancelled.");
      this.halted = false;
      await this.start(input, record, false);
    });
  }

  /** Durably accepts steering; an idle or stopping turn is a rejection, never a silent drop. */
  public steer(text: string): Promise<void> {
    return this.exclusive(async () => {
      this.assertMutable();
      if (!text.trim()) throw new Error("A steering message cannot be empty.");
      if (!this.runtime.canSteer() || this.halted) throw new Error("The session is not accepting steering. Send or queue the message instead.");
      const message: QueuedSessionMessage = {
        id: randomUUID(),
        createdAt: new Date().toISOString(),
        contentParts: [{type: "text", text}],
        modelReference: this.runtime.getSelectedModel().modelReference,
      };
      await this.deliverSteer(await this.load(), message);
    });
  }

  /** Serializes checkpoint/compaction commands with control transitions and dispatch. */
  public command(run: () => Promise<void>): Promise<void> {
    return this.exclusive(async () => {
      this.assertMutable();
      if (this.working) throw new Error("Session already has active work.");
      await run();
      this.kick();
    });
  }

  /** Immediately inhibits dispatch, even while a turn is still being prepared. */
  public async stop(message = "Stopped by you. Resume the queue or goal explicitly."): Promise<void> {
    this.halted = true;
    this.stopEpoch += 1;
    const abort = this.runtime.abort();
    await this.exclusive(async () => {
      const record = await this.load();
      await this.save({
        ...record,
        state: {
          ...record.state,
          queuePaused: true,
          goal: record.state.goal?.status === "active" ? {...record.state.goal, status: "paused", message, updatedAt: new Date().toISOString()} : record.state.goal,
        },
      });
    });
    await abort;
    await this.runtime.waitForWork();
    await this.serial;
  }

  /** Records a goal result only for the active goal attached to this executing turn. */
  public reportGoalResult(goalId: string, status: "completed" | "blocked", summary: string): Promise<void> {
    return this.exclusive(async () => {
      const record = await this.load();
      const goal = record.state.goal;
      if (!goal || goal.status !== "active" || goal.id !== goalId || this.executingGoalId !== goalId || !this.working || this.halted) {
        throw new Error("This turn has no matching active goal to report.");
      }
      if (!summary.trim()) throw new Error("A goal result needs a summary.");
      await this.save({
        ...record,
        state: {
          ...record.state,
          queuePaused: record.state.queuePaused || status === "blocked",
          goal: {...goal, status, updatedAt: new Date().toISOString(), message: `Agent-reported ${status}: ${summary.trim().slice(0, 4000)}`},
        },
      });
    });
  }

  /** Prevents new dispatch before shutdown or archival. */
  public async dispose(): Promise<void> {
    this.disposed = true;
    if (this.loaded && !this.storageFailure) await this.stop("Session closed. Review the last turn and resume explicitly.");
    else {
      this.halted = true;
      await this.runtime.abort();
      await this.runtime.waitForWork();
      await this.serial;
    }
  }

  private assertMutable(): void {
    if (this.disposed) throw new Error("Session runtime is closed.");
    if (this.storageFailure) throw new Error(this.storageFailure);
  }

  private exclusive<T>(run: () => Promise<T>): Promise<T> {
    const result = this.serial.then(run, run);
    this.serial = result.catch(() => undefined);
    return result;
  }

  private async load(): Promise<StoredSessionControls> {
    const record = await this.store.load(this.runtime.sessionId, await this.runtime.getSessionManager());
    this.loaded = true;
    return record;
  }

  private async save(record: StoredSessionControls): Promise<void> {
    try {
      const current = await this.load();
      await this.store.save({...record, state: {...record.state, revision: current.state.revision + 1}});
    } catch (error) {
      this.halted = true;
      this.storageFailure = "Session controls could not be saved. Delivery may be uncertain. Fix storage and restart; review the chat before resending.";
      void this.runtime.abort();
      throw error;
    }
  }

  private async deliverSteer(record: StoredSessionControls, message: QueuedSessionMessage): Promise<void> {
    if (!this.runtime.canSteer() || this.halted) throw new Error("The session is not accepting steering. The message has not been removed.");
    const manager = await this.runtime.getSessionManager();
    const context = await prepareSendMessageContext(
      {...message, sessionId: this.runtime.sessionId},
      {projectPath: manager.getCwd(), resourceCatalog: this.runtime.resourceCatalog}
    );
    if (!this.runtime.canSteer() || this.halted) throw new Error("The turn finished before steering could be accepted. The message has not been removed.");
    await this.save({...record, inFlight: message});
    let acceptedText: string;
    try {
      acceptedText = await steerSession(this.runtime, {sessionId: this.runtime.sessionId, text: context.prompt}, undefined, [...context.images]);
    } catch (error) {
      await this.save({...record, inFlight: undefined});
      throw error;
    }
    await this.save({
      ...record,
      inFlight: undefined,
      steering: [...record.steering, {message, text: acceptedText}],
      state: {...record.state, queue: record.state.queue.filter((entry) => entry.id !== message.id)},
    });
  }

  /** Dispatches only on idle boundaries, with queued user work taking priority over goal continuation. */
  private kick(): void {
    if (this.disposed || this.halted || this.dispatchScheduled) return;
    this.dispatchScheduled = true;
    setImmediate(() => {
      this.dispatchScheduled = false;
      void this.exclusive(async () => {
        if (this.disposed || this.halted || this.working || this.runtime.isRunning()) return;
        const record = await this.load();
        const queued = !record.state.queuePaused ? record.state.queue[0] : undefined;
        if (queued?.deliveryStatus === "uncertain") return;
        const goal = record.state.goal?.status === "active" ? record.state.goal : undefined;
        if (!queued && !goal) return;
        if (!queued && goal && goal.turnsUsed >= goal.maxTurns) {
          await this.save({
            ...record,
            state: {
              ...record.state,
              goal: {...goal, status: "paused", updatedAt: new Date().toISOString(), message: "Goal turn limit reached. Review the work before starting a new goal."},
            },
          });
          return;
        }
        const input: SendMessagePayload = queued
          ? {...queued, sessionId: this.runtime.sessionId}
          : {
              sessionId: this.runtime.sessionId,
              contentParts: [{type: "text", text: `Continue the active goal: ${goal!.objective}`}],
              modelReference: goal!.modelReference,
              captureCheckpoints: goal!.captureCheckpoints,
            };
        await this.start(input, record, true, queued);
      })
        .catch(async (error) => {
          this.halted = true;
          await this.runtime.publishEvent({type: "session.error", sessionId: this.runtime.sessionId, error: error instanceof Error ? error.message : "Automatic dispatch failed."});
        })
        .catch(() => undefined);
    });
  }

  private async start(input: SendMessagePayload, record: StoredSessionControls, automatic: boolean, queued?: QueuedSessionMessage): Promise<void> {
    const epoch = this.stopEpoch;
    const goal = record.state.goal?.status === "active" && record.state.goal.turnsUsed < record.state.goal.maxTurns ? record.state.goal : undefined;
    const reserved: StoredSessionControls = {
      ...record,
      inFlight: queued,
      state: {...record.state, goal: goal ? {...goal, turnsUsed: goal.turnsUsed + 1, updatedAt: new Date().toISOString()} : record.state.goal},
    };
    await this.save(reserved);
    this.working = true;
    this.executingGoalId = goal?.id;
    let accepted = false;
    try {
      if (epoch !== this.stopEpoch) throw new Error("Session was cancelled.");
      if (automatic && (this.halted || this.disposed)) throw new Error("Automatic dispatch was stopped.");
      await sendMessage(this.runtime, this.titleGenerator, input, {
        goal,
        bounded: automatic || !!goal,
        onSettled: (error) => this.exclusive(() => this.settle(error)),
      });
      accepted = true;
      this.dispatchedQueueId = queued?.id;
      if (queued) await this.save({...reserved, inFlight: undefined, state: {...reserved.state, queue: reserved.state.queue.filter((entry) => entry.id !== queued.id)}});
    } catch (error) {
      // Once Pi accepted the turn, only settlement may release it or resolve its
      // delivery marker. A failed receipt write is not permission to replay work.
      if (accepted || this.storageFailure) throw error;
      this.working = false;
      this.executingGoalId = undefined;
      this.halted = true;
      const latest = await this.load();
      await this.save({
        ...latest,
        inFlight: undefined,
        state: {
          ...latest.state,
          queuePaused: true,
          goal:
            latest.state.goal?.status === "active"
              ? {
                  ...latest.state.goal,
                  status: "blocked",
                  updatedAt: new Date().toISOString(),
                  message: this.runtime.getTurnFailure() ?? (error instanceof Error ? error.message : "Could not start the turn."),
                }
              : latest.state.goal,
        },
      });
      throw error;
    }
  }

  private async settle(error: string | undefined): Promise<void> {
    this.working = false;
    this.executingGoalId = undefined;
    const record = await this.load();
    if (this.storageFailure) return;
    const undeliveredTexts = [...this.runtime.takeUndeliveredSteering()];
    const undelivered = record.steering
      .filter((entry) => {
        const index = undeliveredTexts.indexOf(entry.text);
        if (index < 0) return false;
        undeliveredTexts.splice(index, 1);
        return true;
      })
      .map((entry) => entry.message);
    const cancelled = this.runtime.isCancelled();
    if (error || cancelled || undelivered.length) this.halted = true;
    const goal = record.state.goal;
    await this.save({
      state: {
        ...record.state,
        queue: [...undelivered, ...record.state.queue.filter((entry) => entry.id !== this.dispatchedQueueId)],
        queuePaused: record.state.queuePaused || this.halted,
        goal:
          goal?.status === "active" && (error || cancelled || goal.turnsUsed >= goal.maxTurns)
            ? {
                ...goal,
                status: error ? "blocked" : "paused",
                updatedAt: new Date().toISOString(),
                message: error ?? (cancelled ? "Stopped. Resume explicitly." : "Goal turn limit reached. Review the work before starting a new goal."),
              }
            : goal,
      },
      steering: [],
    });
    this.dispatchedQueueId = undefined;
    this.kick();
  }
}
