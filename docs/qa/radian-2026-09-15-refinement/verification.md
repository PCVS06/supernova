# Existing-feature refinements

15 September 2026 · Supernova / Radian 0.2.0

Built from the working checkout on `docs/graph-workflow-engineering`, based on `6cdf7664d56228729f24365e9c2431916c2c1642`. Existing uncommitted work was preserved. The source fingerprint and file inventory are in [build-evidence.json](build-evidence.json).

## Completed audit scope

| Existing interaction  | Refined behavior                                                                                                                                                                                                                                                                                      |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sending and steering  | **Steer now** sends a correction at the next agent step and retains attachments. **Queue next** and Enter submit the complete draft for a later turn. A draft keeps a disabled send control while disconnected.                                                                                       |
| Queued messages       | Pause waiting messages while the current response continues. Edit text without dropping attachments or references, move messages up or down, remove entries, and resume the saved order. Stale edits and uncertain deliveries are rejected.                                                           |
| Review and restore    | **Review & restore** opens a file list, readable diff, conversation scope and manual-change warning. Cancel leaves the conversation and files intact. A changed workspace requires a fresh preview before restore. Unrelated files and the user's Git index and HEAD remain untouched.                |
| Recovery              | A disconnected workspace shows its connection state and retains the draft. A local API crash keeps the desktop window open and offers an explicit restart on the same endpoint. Reconnection refreshes saved state and replays a surviving run; ambiguous queued deliveries remain paused for review. |
| Worker results        | The latest response or saved result opens immediately; supporting detail remains expandable.                                                                                                                                                                                                          |
| Context               | Saved configuration, current defaults and unknown provenance are distinguished. Capture time and recorded model are visible when available. Token counts and remaining capacity are explicitly estimates.                                                                                             |
| Navigation            | Primary chats retain compact title and project cues. Workspace panels name the owning chat and folder. Opening a worker targets its owning chat's workspace. Rows show assignment and status, and older completed runs collapse.                                                                      |
| Settings and goals    | Settings distinguish defaults for new chats from saved chat configuration and explain immediate plan-file selection saves. Goals show turns used, limits and reported outcomes while collapsed.                                                                                                       |
| Terminal availability | The picker marks Terminal **Unavailable**, and its page explains using an external terminal. An embedded terminal is still outside this refinement scope.                                                                                                                                             |

## Verification

| Check                                             | Result                                                                                                                                                                     |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Web unit tests                                    | 500 passed                                                                                                                                                                 |
| Runtime unit tests                                | 115 passed                                                                                                                                                                 |
| Runtime integration tests                         | 285 passed                                                                                                                                                                 |
| Server tests                                      | 9 passed                                                                                                                                                                   |
| Desktop tests                                     | 67 passed                                                                                                                                                                  |
| Total repository tests                            | **976 passed**                                                                                                                                                             |
| Type checking, lint, formatting, whitespace check | Passed                                                                                                                                                                     |
| Desktop production build and packaging            | Passed                                                                                                                                                                     |
| Bundle signature verification                     | Passed; local ad-hoc signature, not a published/notarized release                                                                                                          |
| Desktop crash and restart                         | Passed with the production main/preload/renderer and an isolated profile and data directory; same renderer, URL and unsent draft after restarting the terminated API child |
| Final browser verification                        | **43 scenarios passed across the full run and focused reruns**                                                                                                             |
| Installation                                      | **Installed and launched at `/Applications/Radian.app`; signature and bundle hashes verified**                                                                             |

The installed app was inspected after replacement: harness-default scope, chat/project identity, workspace ownership and Terminal availability matched the new behavior. The previous bundle is preserved at `/var/folders/fc/5twr3n1s2_q7qg6qllx4vqdh0000gn/T/radian-before-refinement-dkz4mh0t/Radian.app`. No project files or account settings were changed during this installed-app check.

Repository checks ran from the root. Tests used the existing app-bundled `fd` on PATH. The final web unit run repeated the 500 checks after the connection banner moved inside the workspace layout.

The desktop recovery test uses the unchanged production bundles with a bootstrap that isolates Electron's profile. A local-only model definition enables editing; this test sends no prompt. Run `node docs/qa/radian-2026-09-15-refinement/desktop-recovery.mjs` after building to reproduce it.

The first final browser run passed 40 of 43 scenarios. Two remaining assertions were updated to match the intended completed-worker collapse and continuing ring animation. Those two scenarios and the reconnect scenario then passed with the production client. The reconnect check is production-only because Vite reloads its development page after network restoration.

The browser tests use an isolated API, a deterministic test provider, and separate mock UI fixtures. They cover sending, queue changes, worker conversations, review, manual-file conflicts, restore and reconnect. They do not establish behavior with every external model provider.

### Limits that remain explicit

- Restarting the local API does not resume a terminated worker at its former instruction. Saved conversation and queue records are recovered; uncertain deliveries require review.
- Checkpoints cover captured files in the project repository and immediate child repositories. Ignored untracked files, other untracked files over 2 MiB and external actions are outside that snapshot. Large or unsupported patches show a clear preview limitation.
- Context usage is estimated from provider usage plus subsequent messages. No invented per-source accounting is shown.
- Draft survival was tested across connection and API failure with the renderer kept open. This does not claim draft persistence across a whole-app or operating-system crash.

## Screenshots

### Restore preview after a manual edit changed again

![Restore preview and refreshed approval](/Users/philippcarlvictorstrieder/Developer/supernova/docs/qa/radian-2026-09-15-refinement/restore-preview.png)

### Local API interrupted; the draft remains visible

![Desktop interruption and explicit restart](/Users/philippcarlvictorstrieder/Developer/supernova/docs/qa/radian-2026-09-15-refinement/desktop-interrupted.png)

### Temporary connection loss during an active response

![Unsent draft retained while reconnecting](/Users/philippcarlvictorstrieder/Developer/supernova/docs/qa/radian-2026-09-15-refinement/reconnecting-draft.png)

### Same desktop renderer and draft after restart

![Recovered desktop workspace](/Users/philippcarlvictorstrieder/Developer/supernova/docs/qa/radian-2026-09-15-refinement/desktop-recovered.png)

### Explicit follow-up controls and worker result

![Steering and queue actions with attachment guidance](/Users/philippcarlvictorstrieder/Developer/supernova/docs/qa/radian-2026-09-15-refinement/follow-up-controls.png)

![Worker result with supporting details collapsed](/Users/philippcarlvictorstrieder/Developer/supernova/docs/qa/radian-2026-09-15-refinement/agent-result.png)
