interface BackgroundJob {
  readonly controller: AbortController;
  readonly completion: Promise<void>;
}

/** Owns background worker lifetimes; results remain in the durable run store. */
export class BackgroundDelegations {
  private readonly chats = new Map<string, Map<string, BackgroundJob>>();

  /** Reserves all slots before starting a batch so capacity failures cannot launch a partial batch. */
  public start(chatId: string, jobs: readonly {id: string; execute: (signal: AbortSignal, ready: () => void) => Promise<unknown>}[], parent?: AbortSignal): Promise<void> {
    if (parent?.aborted) return Promise.reject(new Error("Delegation cancelled."));
    if (!jobs.length) return Promise.resolve();
    const active = this.chats.get(chatId) ?? new Map<string, BackgroundJob>();
    if (active.size + jobs.length > 3) return Promise.reject(new Error("Three background agents are already reserved for this chat. Wait for a result before starting more."));
    this.chats.set(chatId, active);
    const acknowledgements = jobs.map(({id, execute}) => {
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
      active.set(id, {controller, completion});
      return ready;
    });
    return Promise.all(acknowledgements).then(() => undefined);
  }

  /** Joins existing workers without polling or launching duplicate work. */
  public async wait(chatId: string, runIds: readonly string[], signal?: AbortSignal): Promise<void> {
    const jobs = runIds.map((id) => this.chats.get(chatId)?.get(id)).filter((job) => job !== undefined);
    const abort = () => jobs.forEach((job) => job.controller.abort());
    signal?.addEventListener("abort", abort, {once: true});
    try {
      if (signal?.aborted) abort();
      await Promise.all(jobs.map((job) => job.completion));
    } finally {
      signal?.removeEventListener("abort", abort);
    }
  }

  /** Cancels one selection, or every worker when its owning chat stops or closes. */
  public async cancel(chatId: string, runIds?: readonly string[]): Promise<void> {
    const jobs = [...(this.chats.get(chatId)?.entries() ?? [])].filter(([id]) => !runIds || runIds.includes(id)).map(([, job]) => job);
    jobs.forEach((job) => job.controller.abort());
    await Promise.all(jobs.map((job) => job.completion));
  }
}

export const backgroundDelegations = new BackgroundDelegations();
