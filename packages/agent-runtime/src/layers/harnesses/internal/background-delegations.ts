interface BackgroundJob {
  readonly controller: AbortController;
  readonly completion: Promise<void>;
  readonly owner: string;
  readonly receiver: Promise<(text: string) => Promise<void>>;
  readonly connect: (receiver: (text: string) => Promise<void>) => void;
  readonly messages: Map<string, Promise<void>>;
  readonly projectKey?: string;
}

/** Owns background worker lifetimes; results remain in the durable run store. */
export class BackgroundDelegations {
  private readonly chats = new Map<string, Map<string, BackgroundJob>>();

  /** Reserves all slots before starting a batch so capacity failures cannot launch a partial batch. */
  public start(
    chatId: string,
    jobs: readonly {id: string; projectKey?: string; execute: (signal: AbortSignal, ready: () => void) => Promise<unknown>}[],
    parent?: AbortSignal,
    owner = "root"
  ): Promise<void> {
    if (parent?.aborted) return Promise.reject(new Error("Delegation cancelled."));
    if (!jobs.length) return Promise.resolve();
    const active = this.chats.get(chatId) ?? new Map<string, BackgroundJob>();
    const projects = new Map([...active].flatMap(([id, job]) => (job.projectKey ? [[job.projectKey, id] as const] : [])));
    for (const job of jobs) {
      if (!job.projectKey) continue;
      const current = projects.get(job.projectKey);
      if (current)
        return Promise.reject(
          new Error(
            `This project already has an active lead: ${current}. Use subagent action:message to correct that assignment or action:wait to collect it before starting another.`
          )
        );
      projects.set(job.projectKey, job.id);
    }
    if ([...active.values()].filter((job) => job.owner === owner).length + jobs.length > 3)
      return Promise.reject(new Error("Three background agents are already reserved for this lead. Wait for a result before starting more."));
    if (active.size + jobs.length > 12)
      return Promise.reject(new Error("Twelve background agents are already reserved for this chat hierarchy. Wait for a result before starting more."));
    this.chats.set(chatId, active);
    const acknowledgements = jobs.map(({id, execute, projectKey}) => {
      let connect!: (receiver: (text: string) => Promise<void>) => void;
      const receiver = new Promise<(text: string) => Promise<void>>((resolve) => {
        connect = resolve;
      });
      const controller = new AbortController();
      const abort = () => controller.abort();
      parent?.addEventListener("abort", abort, {once: true});
      let acknowledge!: () => void;
      let reject!: (error: unknown) => void;
      const ready = new Promise<void>((resolve, fail) => {
        acknowledge = resolve;
        reject = fail;
      });
      const completion = Promise.resolve()
        .then(() => execute(controller.signal, acknowledge))
        .then(acknowledge, reject)
        .finally(() => {
          parent?.removeEventListener("abort", abort);
          active.delete(id);
          if (!active.size) this.chats.delete(chatId);
        });
      active.set(id, {controller, completion, owner, receiver, connect, messages: new Map(), projectKey});
      return ready;
    });
    return Promise.all(acknowledgements).then(() => undefined);
  }

  /** Registers the live session only once it can accept a correction; early messages wait for this boundary. */
  public connect(chatId: string, runId: string, receiver: (text: string) => Promise<void>): void {
    this.chats.get(chatId)?.get(runId)?.connect(receiver);
  }

  /** A stable message ID deduplicates retries. Finished or cancelled workers never acknowledge undelivered messages. */
  public message(chatId: string, runId: string, messageId: string, text: string): Promise<void> {
    const job = this.chats.get(chatId)?.get(runId);
    if (!job || job.controller.signal.aborted) return Promise.reject(new Error("This worker is no longer running. Start a new assignment with its saved result as context."));
    const previous = job.messages.get(messageId);
    if (previous) return previous;
    if (!text.trim() || text.length > 10000) return Promise.reject(new Error("A correction needs between 1 and 10,000 characters."));
    if (job.messages.size >= 32) return Promise.reject(new Error("This worker has reached its correction limit. Wait for its result before assigning more work."));
    const delivery = Promise.race([
      job.receiver,
      job.completion.then(() => {
        throw new Error("The worker finished before the correction could be delivered.");
      }),
    ]).then(async (receive) => {
      if (job.controller.signal.aborted || this.chats.get(chatId)?.get(runId) !== job) throw new Error("The worker stopped before the correction could be delivered.");
      await receive(text);
    });
    job.messages.set(messageId, delivery);
    return delivery;
  }

  /** Joins existing workers without polling or launching duplicate work. */
  public async wait(chatId: string, runIds: readonly string[], signal?: AbortSignal, hasPendingMessages?: () => boolean): Promise<"completed" | "steering"> {
    const jobs = runIds.map((id) => this.chats.get(chatId)?.get(id)).filter((job) => job !== undefined);
    const abort = () => jobs.forEach((job) => job.controller.abort());
    signal?.addEventListener("abort", abort, {once: true});
    let timer: ReturnType<typeof setInterval> | undefined;
    try {
      if (signal?.aborted) abort();
      const completed = Promise.all(jobs.map((job) => job.completion)).then(() => "completed" as const);
      if (!hasPendingMessages) return await completed;
      // Pi consumes steering between tool calls. Yield this wait, leaving the owned jobs alive.
      const steering = new Promise<"steering">((resolve) => {
        const check = () => {
          if (hasPendingMessages()) resolve("steering");
        };
        timer = setInterval(check, 100);
        timer.unref();
        check();
      });
      return await Promise.race([completed, steering]);
    } finally {
      if (timer) clearInterval(timer);
      signal?.removeEventListener("abort", abort);
    }
  }

  /** Cancels one selection, or every worker when its owning chat stops or closes. */
  public async cancel(chatId: string, runIds?: readonly string[]): Promise<void> {
    const jobs = [...(this.chats.get(chatId)?.entries() ?? [])].filter(([id]) => !runIds || runIds.includes(id)).map(([, job]) => job);
    jobs.forEach((job) => job.controller.abort());
    await Promise.all(jobs.map((job) => job.completion));
  }

  /** Closing an isolated lead also closes any assignments it failed to collect. */
  public async cancelOwned(chatId: string, owner: string): Promise<void> {
    const ids = [...(this.chats.get(chatId)?.entries() ?? [])].filter(([, job]) => job.owner === owner).map(([id]) => id);
    await this.cancel(chatId, ids);
  }
}

export const backgroundDelegations = new BackgroundDelegations();
