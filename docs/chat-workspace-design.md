# Chat workspace: navigation, control and observation

## Design intent

The problem is inconsistent representation, not too much explanatory detail. Keep the evidence and capabilities; give each kind of information a stable location and visual hierarchy.

## Layout, step by step

1. **Navigate on the left.** Harnesses group projects; projects contain chats. Section headings are quiet labels, not dark cards competing with chat rows. Names, status and actions have separate columns. Preserve pinning, search, project controls and keyboard access.
2. **Keep activity with its owner.** Show actual working agents beneath their owning chat, with clear role and status. Open a worker's observed conversation, activity and context from its row. Never imply that a role definition is a running agent, or a saved result is a live stream.
3. **Give the conversation the center.** Keep the chat header to identity, Context and chat actions. Remove the project planning-document strip; long-term documents remain in project settings and the file viewer.
4. **Attach run controls to the composer.** A goal is a persistent objective for this chat, not a project planning document. Its row shows objective, state and pause/resume controls. Waiting messages have a separate queue row with delete and explicit steering actions. Enter queues while busy; Steer changes the active run.
5. **Put workspace tools on the right.** Files and Browser toggles occupy the far-right edge of a shared title bar and open the right workspace panel. Chat and panel headers sit beneath that bar, including split view.
6. **Inspect without stacked disclosure.** One Context button opens Instructions, Resources and Runtime. Instruction layers are directly readable. Distinguish the captured configuration from current settings, available skills from skills actually read, and recorded runtime context from inference.

## Shared visual rules

- One row vocabulary: identity left, descriptive content center, status and actions right.
- One restrained neutral palette and spacing scale; role color is an identity cue, never the only status indicator.
- A visible selected state, readable full details, short transitions and reduced-motion support.
- Loading, empty, failed, paused and completed states are explicit. Do not show optimistic success before the server accepts an action.
- Detail belongs in a named view, not another nested banner or unlabeled accordion.

## Run-control behavior

| Action                | Intended effect                                                                         |
| --------------------- | --------------------------------------------------------------------------------------- |
| Send while idle       | Start a normal chat turn.                                                               |
| Queue while working   | Save a new message for the next available turn, in FIFO order.                          |
| Steer now             | Send text into the active Pi run; do not silently drop it if the run has already ended. |
| Remove queued message | Remove pending work only; never retract a message already executing.                    |
| `/goal objective`     | Start a bounded, persisted objective with explicit completion/blocking reporting.       |
| Pause/Stop            | Prevent automatic continuation; keep the remaining objective and queue inspectable.     |
| Resume                | Continue explicitly after a pause, interruption or restart.                             |

Goals and queues are server-owned. Client navigation must not own execution. Existing checkpoint boundaries still apply, and filesystem checkpoints do not promise reversal of external actions. Agent-reported completion is not independent verification of the result.

Goals default to 10 passes. Automatically dispatched passes also have per-pass time and tool-loop limits. Pausing a goal stops its continuation, while Stop also interrupts current work and pauses the queue. After a server restart, continuation requires an explicit resume. An uncertain message delivery is shown for review and is never automatically replayed.

## Acceptance checks

- A queued message remains visible across navigation/reload and executes once in order.
- Failed steering leaves the draft/queued message intact.
- Stop, provider failure and restart cannot silently launch more work.
- A goal stays visible when paused and cannot run beyond its bound without a new user action.
- Every worker view identifies its owning chat and distinguishes observed conversation from missing historical transcript.
- Context opens in one click without losing instruction content or provenance.
- Files/Browser controls remain at the right edge without overlapping chat or panel controls.

Tests and live UI inspection establish implementation status separately from this design specification.
