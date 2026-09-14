type Lease = {readonly write: boolean; readonly grant: (release: () => void) => void; readonly reject: (error: Error) => void; readonly signal?: AbortSignal; abort?: () => void};
type Workspace = {readers: number; writer: boolean; queue: Lease[]};
const workspaces = new Map<string, Workspace>();

/** Grants adjacent readers together; a waiting writer prevents later readers from overtaking it. */
function drain(path: string, workspace: Workspace): void {
  while (workspace.queue.length > 0 && !workspace.writer) {
    const next = workspace.queue[0]!;
    if (next.write && workspace.readers > 0) return;
    workspace.queue.shift();
    if (next.abort) next.signal?.removeEventListener("abort", next.abort);
    if (next.write) workspace.writer = true;
    else workspace.readers += 1;
    let released = false;
    next.grant(() => {
      if (released) return;
      released = true;
      if (next.write) workspace.writer = false;
      else workspace.readers -= 1;
      drain(path, workspace);
    });
  }
  if (!workspace.writer && workspace.readers === 0 && workspace.queue.length === 0) workspaces.delete(path);
}

/** Shares read-only workflow work, and serializes writers against all workflow work in the same directory. */
export async function withWorkflowWorkspace<A>(path: string, write: boolean, signal: AbortSignal, run: () => Promise<A>): Promise<A> {
  if (signal.aborted) throw new Error("Workflow cancelled before workspace access.");
  const workspace = workspaces.get(path) ?? {readers: 0, writer: false, queue: []};
  workspaces.set(path, workspace);
  const release = await new Promise<() => void>((grant, reject) => {
    const lease: Lease = {write, grant, reject, signal};
    lease.abort = () => {
      workspace.queue = workspace.queue.filter((item) => item !== lease);
      reject(new Error("Workflow cancelled while waiting for the workspace."));
      drain(path, workspace);
    };
    workspace.queue.push(lease);
    signal.addEventListener("abort", lease.abort, {once: true});
    drain(path, workspace);
  });
  try {
    if (signal.aborted) throw new Error("Workflow cancelled before workspace access.");
    return await run();
  } finally {
    release();
  }
}
