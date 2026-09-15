# Chat orchestration and communication

The chat remains the workspace. Its compact identity opens into the orbital view; projects and workers come from recorded assignments. A separate project chat shows only its own system.

## Roles and ownership

| Role            | Coordinates                       | Communication                                                                                                                |
| --------------- | --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Harness lead, τ | Projects assigned to this harness | `manage_projects` maintains the directory; `lab_agent` starts an isolated project lead.                                      |
| Project lead, φ | Its configured specialist team    | `subagent` starts specialists or hands a task through a chain; `harness_workflow` runs a configured graph.                   |
| Specialist, e   | Its bounded assignment            | Receives its task and supervisory corrections, returns a recorded result. It cannot recursively delegate or manage projects. |
| Curator, i      | Instruction and memory reviews    | Reads recorded evidence and files proposals in Inbox. It does not grant execution authority.                                 |

Project runs use their own directory and current project configuration. Existing user chats retain their pinned instructions. Starting a delegated project run does not redirect or modify an independently open project conversation.

## Project management

The harness lead lists projects to get their IDs and the configuration revision. It can then create a project with a new folder, assign an existing folder, or update a project's name and brief. Folder creation requires `createDirectory: true`; linking a folder preserves its files. Mutations require the observed revision, and the current lead relationship is checked again inside the write transaction. A lead cannot move another harness's project or reassign an existing project's folder.

The directory is resolved again when delegating, so projects added after a lead chat began are immediately available. Status reports bounded recorded runs, including runs originating in independent project chats. Missing receipts do not imply those chats are idle. Presentation changes remain available through `manage_lab_view`.

Each chat permits one running delegated lead per project. Another assignment to that project must wait or correct the existing run. Separate user chats retain independent control. In the chat system, completed and current assignments share one project planet with selectable history. Removed projects leave the current system; their recorded conversations remain accessible through their own links.

## Assignments, corrections and results

1. Start a bounded assignment. `background: true` returns a run ID after its durable receipt exists.
2. Continue independent work. Each run records its chat, project and supervising run.
3. Send `subagent` with `action: "message"`, one `runIds` entry and `message` to correct a running direct assignment. The same tool-call ID is deduplicated. An early correction waits for the session to become available; stopped or finished workers reject it explicitly.
4. Use `action: "wait"` to join and read results, `status` to inspect, or `cancel` to stop owned work. Results are retrieved explicitly, not automatically injected into the parent's conversation.
5. Pass reviewed results onward as fallible context. A project lead cannot read, steer or cancel a sibling lead's assignments through these controls. An isolated lead must collect its own children before finishing; uncollected children are cancelled when it closes.

There are up to three direct background workers per lead and twelve across the chat hierarchy. This allows three project leads with three specialists each without the parent reservations consuming all child slots. These are background execution limits; large orbital histories remain searchable and grouped without rendering hundreds of animated symbols.

## User steering

During a running response, a correction enters that response's next model step. If the response has already finished but is still saving its checkpoint, the correction is saved once in the durable queue and the UI confirms that change. It runs at the next available boundary if the queue is active. Stop remains authoritative and does not silently restart the queue. A failed delivery keeps the draft and exposes the actual error.

A lead waiting on background assignments yields that wait when new steering arrives. Its workers continue until explicitly corrected, collected or cancelled. Corrections sent during worker startup wait for the actual session-start event before delivery. Long individual tool calls still finish at their tool boundary.

A user correction to the harness lead does not broadcast blindly. The lead can forward the relevant part to the appropriate running project lead, which can then steer its own specialist.

## Motion

Sidebar symbols fade and titles briefly resolve into digits belonging to their own constant before a branch closes. Hidden rows are inert during departure and removed afterwards. Harness settings controls reveal on hover and keyboard focus. The workspace seams fade at their endpoints.

Project numbers keep their original artwork and move on the dotted orbital tracks. Numeric contours stay readable at the far side of an orbit. Orbital motion pauses during inspection, when hidden, when activity is stale, and under reduced-motion settings. There are no coronas or trailing effects.

Nearby projected project lanes share a phase clock and keep their relative spacing throughout an orbit. Small systems preview their moons; larger systems expose those workers when their project is opened. Hovering or keyboard-focusing a participant pauses motion for selection; hovering the central chat symbol does not. The explicit orbit motion setting also animates idle numeric contours in subtle appearance mode.

The composer animates changes in content height without scaling text. Accepted sends and model or effort choices return typing focus to the existing draft; a pending send does not make the editor temporarily uneditable.
