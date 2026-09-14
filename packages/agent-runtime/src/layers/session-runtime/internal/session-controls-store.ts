import {randomUUID} from "node:crypto";
import {open, readFile, rename, unlink} from "node:fs/promises";
import {dirname} from "node:path";
import {Schema} from "effect";
import {QueuedSessionMessage, SessionControls} from "@supernova/contracts/session-runtime/schemas";
import type {PiSessionManager} from "@supernova/agent-runtime/layers/shared/internal/pi-session-store";

const runtimeOwner = randomUUID();

const StoredControls = Schema.Struct({
  runtimeOwner: Schema.optional(Schema.String),
  state: SessionControls,
  inFlight: Schema.optional(QueuedSessionMessage),
  steering: Schema.Array(Schema.Struct({message: QueuedSessionMessage, text: Schema.String})),
});

export type StoredSessionControls = typeof StoredControls.Type;

/** Atomic sidecar storage, separate from Pi's mutable conversation/checkpoint branch. */
export class SessionControlsStore {
  private readonly records = new Map<string, {path: string | undefined; value: StoredSessionControls}>();

  /** Resolves ownership through the session manager before looking up a sidecar. Existing state is recovered paused. */
  public async load(sessionId: string, manager: PiSessionManager): Promise<StoredSessionControls> {
    if (manager.getSessionId() !== sessionId) throw new Error("Session not found.");
    const cached = this.records.get(sessionId);
    if (cached) return cached.value;
    const file = manager.getSessionFile();
    const path = file ? `${file}.controls.json` : undefined;
    let value: StoredSessionControls = {state: {sessionId, revision: 0, goal: null, queue: [], queuePaused: false}, steering: []};
    if (path) {
      let data: string | undefined;
      try {
        data = await readFile(path, "utf8");
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      }
      if (data !== undefined) {
        value = Schema.decodeUnknownSync(StoredControls)(JSON.parse(data));
        if (value.state.sessionId !== sessionId) throw new Error("Controls do not belong to this session.");
        const uncertain = [...value.steering.map((entry) => entry.message), ...(value.inFlight ? [value.inFlight] : [])];
        const ids = new Set(uncertain.map((entry) => entry.id));
        value = {
          state: {
            ...value.state,
            queuePaused: true,
            revision: value.state.revision + 1,
            queue: [...uncertain.map((entry) => ({...entry, deliveryStatus: "uncertain" as const})), ...value.state.queue.filter((entry) => !ids.has(entry.id))],
            goal:
              value.state.goal?.status === "active"
                ? {...value.state.goal, status: "paused", updatedAt: new Date().toISOString(), message: "Server restarted. Review the last turn and resume explicitly."}
                : value.state.goal,
          },
          steering: [],
        };
      }
    }
    this.records.set(sessionId, {path, value});
    try {
      await this.save(value);
    } catch (error) {
      this.records.delete(sessionId);
      throw error;
    }
    return value;
  }

  /** Replaces state only after an atomic, owner-only durable write succeeds. */
  public async save(value: StoredSessionControls): Promise<void> {
    const record = this.records.get(value.state.sessionId);
    if (!record) throw new Error("Session controls have not been loaded.");
    if (record.path) {
      const temporary = `${record.path}.${randomUUID()}.tmp`;
      try {
        const handle = await open(temporary, "wx", 0o600);
        try {
          await handle.writeFile(JSON.stringify({...value, runtimeOwner}));
          await handle.sync();
        } finally {
          await handle.close();
        }
        await rename(temporary, record.path);
        // Windows cannot open directory handles through fs.open; the file itself
        // is still flushed before replacement there.
        if (process.platform !== "win32") {
          const directory = await open(dirname(record.path), "r");
          try {
            await directory.sync();
          } finally {
            await directory.close();
          }
        }
      } finally {
        await unlink(temporary).catch((error: NodeJS.ErrnoException) => {
          if (error.code !== "ENOENT") throw error;
        });
      }
    }
    this.records.set(value.state.sessionId, {...record, value});
  }
}

/** Reads a bounded navigation snapshot without loading a runtime or reviving abandoned work. */
export function readControlsOverview(raw: unknown): SessionControls {
  const stored = Schema.decodeUnknownSync(StoredControls)(raw);
  const uncertain = stored.runtimeOwner === runtimeOwner ? [] : [...stored.steering.map((entry) => entry.message), ...(stored.inFlight ? [stored.inFlight] : [])];
  const ids = new Set(uncertain.map((entry) => entry.id));
  const state = stored.state;
  return {
    ...state,
    queuePaused: state.queuePaused || stored.runtimeOwner !== runtimeOwner,
    goal: state.goal
      ? {
          ...state.goal,
          objective: state.goal.objective.slice(0, 600),
          message:
            stored.runtimeOwner !== runtimeOwner && state.goal.status === "active"
              ? "Saved before restart. Open the chat to review and resume."
              : state.goal.message?.slice(0, 600),
          status: stored.runtimeOwner !== runtimeOwner && state.goal.status === "active" ? "paused" : state.goal.status,
        }
      : null,
    queue: [...uncertain.map((entry) => ({...entry, deliveryStatus: "uncertain" as const})), ...state.queue.filter((entry) => !ids.has(entry.id))].map((entry) => ({
      ...entry,
      contentParts: [
        {
          type: "text",
          text: entry.contentParts
            .map((part) => (part.type === "text" ? part.text : "[Attachment]"))
            .join(" ")
            .slice(0, 300),
        },
      ],
    })),
  };
}
