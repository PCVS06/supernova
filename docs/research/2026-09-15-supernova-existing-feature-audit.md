# Supernova / Radian: refine the features already here

_Audit date: 15 September 2026._

The findings below record the original audit. The subsequent [refinement and verification report](../qa/radian-2026-09-15-refinement/verification.md) records the implemented changes and acceptance results.

## Verdict

Supernova already contains substantial functionality. Its clearest gap against advanced coding-agent products is how completely that functionality is presented: users still have to infer what a control will do, open extra layers to see an outcome, and reconcile settings with the state of an existing chat.

The next investment should finish the everyday loop: **give an instruction → understand what is running → inspect the result → review changes → recover confidently**.

This is an assessment of the current implementation and installed app. Earlier feature and orchestration plans were not used as evidence of current behavior. Recommendations below refine existing surfaces; they do not require expanding the product into more agent-system categories.

## What was inspected

- **Installed app:** `/Applications/Radian.app`, version **0.2.0**, running its bundled local API. Inspected existing conversations, context usage, the Context and Terminal workspace tabs, a completed specialist result, General settings, and a harness Overview.
- **Checkout:** `docs/graph-workflow-engineering`, HEAD `6cdf7664d56228729f24365e9c2431916c2c1642`, with 68 tracked files modified and additional untracked work. Current working files were inspected, including uncommitted changes.
- **Industry:** current first-party documentation from Cursor, Claude Code/Desktop, and Codex. The companion [industry benchmark report](2026-09-15-industry-refinement-benchmarks.md) contains nine reference patterns and their boundaries.

The installed bundle's exact source commit was not established. **Live** below means observed in the installed app; **code** means established from the current checkout. Competitor behavior is **documented**, not independently exercised. No provider tasks, destructive restores, or live server interruptions were initiated for this audit.

## Existing strengths to preserve

- The Context panel already exposes harness, project, role, resources, and a recorded runtime prompt. The problem is interpreting provenance and freshness, rather than the absence of inspection.
- Worker pages preserve results, assignments, transcripts, activity, and context. Stale worker data can be labeled as last observed.
- The composer preserves drafts on failed acceptance and contains distinct delivery paths for sending, steering, and queuing.
- Queued messages have durable state, an uncertain-delivery label, and a resume guard. These are useful foundations even though the normal interaction needs refinement.
- Settings already have a navigation tree, an explicit Save bar, revision-conflict feedback, and protection when leaving with unsaved changes.
- Diffs, checkpoint navigation, and conflict handling already exist. Their user-facing review and restore contract can be completed without replacing the underlying approach.

These are presence and inspected-behavior findings, not a claim that every failure path passed end-to-end testing.

## Priority overview

Prioritization considers the consequence of misunderstanding an action first, then frequency of use, then the size of a contained refinement. Implementation effort has not been estimated through a design exercise.

| Priority          | Existing surface      | Current gap                                                                            | Refinement                                                                                            |
| ----------------- | --------------------- | -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| First             | Composer and queue    | Delivery timing is chosen implicitly; text and attachments can take different paths.   | Make “Steer now” and “Queue next” deliberate, clearly labeled choices.                                |
| First             | Diffs and checkpoints | Individual edit previews do not form a clear review-and-restore flow.                  | State the comparison point, affected files, and scope before acting.                                  |
| First             | Session recovery      | Event reconnect retries are quiet; an unexpected bundled API exit quits the app.       | Preserve an inspectable workspace and distinguish reconnecting, interrupted, and unknown outcomes.    |
| Quick improvement | Worker result         | A completed answer starts collapsed with every other section.                          | Show the result immediately; keep supporting detail expandable.                                       |
| Quick improvement | Context inspector     | Captured versus reconstructed context and capture time are not surfaced.               | Show origin, freshness, effective model, and useful usage details.                                    |
| Next              | Chat navigation       | Primary chats have no identity header; long worker lists displace other chats.         | Keep chat/project identity and navigation orientation visible.                                        |
| Next              | Settings and goals    | Defaults, pinned chat settings, immediate saves, and goal progress need clearer scope. | Explain when a change takes effect and expose already-recorded progress.                              |
| Quick improvement | Terminal tab          | It opens an implementation placeholder.                                                | Make availability clear before selection; decide explicitly whether to complete the existing surface. |

## 1. Make message delivery predictable

**Current evidence — code.** During a normal streaming turn with a text draft, the composer makes steering the primary action. Enter also calls the steering path when steering is possible. That path sends text only and leaves attachments in the draft. The queue path supports complete structured messages, but the inspected primary control does not offer a direct choice between steering and queuing the same text draft. When queuing is the path, the action is labeled “Send message.” Queue rows expose steering and deletion, but no edit or reorder controls.

**Why it matters.** A user writing “After this, update the tests” and a user writing “Stop using that approach” need different delivery timing. A draft containing a screenshot also looks like one message, even when only its text is delivered. Retaining the attachment prevents loss, but the split remains something the user must understand.

**Industry reference.** Codex documents separate steering and queued follow-ups, with editing, reordering, sending, and deletion in the queue. Its documented default follow-up behavior is configurable. [Codex steering and queuing](https://learn.chatgpt.com/docs/prompting#steering-and-queuing)

**Refinement.** Put the actual timing on the existing action: “Steer now” or “Queue next.” Let the user choose. Make attachment handling explicit before submission, and give queued text a simple edit action. Preserve the current acceptance and uncertain-delivery protections.

**Completion check.** While an agent is running, submit a correction, a later instruction, and a text-plus-image draft. The visible choice must predict exactly what is delivered and when; remaining attachments and pending messages must stay understandable after a reconnect. This scenario was not executed in the live app.

## 2. Turn diffs and checkpoints into a complete review flow

**Current evidence — code.** File mutation tool details render individual patches in the transcript. The Files view displays current content. The inspected workspace view registry contains Files, Browser, Terminal, and Context; no consolidated review view was found in the related implementation. The checkpoint conflict dialog explains potential loss in general terms but receives only a conflict reason, not an affected-file list or a preview of the target state.

**Why it matters.** Reading the history of edit operations is different from reviewing the final change. A generic “Discard changes?” question also makes the user approve a consequence without inspecting its exact scope in that dialog.

**Industry reference.** Codex documents scoped diff actions and inline feedback. Claude Desktop supports comments attached to changed lines, and Claude Code documents distinct code/conversation rewind choices and coverage limitations. [Codex Git tools](https://learn.chatgpt.com/docs/environments/local-environment#use-built-in-git-tools), [Claude Desktop diff review](https://code.claude.com/docs/en/desktop#review-changes-with-diff-view), [Claude Code checkpointing](https://code.claude.com/docs/en/checkpointing)

**Refinement.** Connect the existing diff and checkpoint surfaces: identify the baseline, summarize affected files, and preview what a restore changes in files and conversation. Keep later manual edits visible. File-level or chunk-level controls can follow once their scope is reliable; a full Git client is unnecessary for this pass.

**Completion check.** In a disposable project, combine agent edits with unrelated manual edits. A user must be able to predict the affected files before restoring and verify the result afterward. Do not infer that restoring files reverses remote actions. No restore was attempted in this audit.

## 3. Make recovery an understandable state of the app

**Current evidence — code.** The global event stream retries after completion or connection errors at a one-second interval. That path does not publish a connection-status value for the UI. Separately, an unexpected exit of the bundled API enters `failStartup`, displays an error dialog, and quits the desktop app. Worker detail has useful stale-state wording that could inform a consistent approach.

**Why it matters.** A quiet reconnect can look like a slow agent. A crashed local server is a different situation from a disconnected client: it may leave an interrupted action rather than live work waiting to be reattached.

**Industry reference.** Claude Code documents what resuming restores and explicitly excludes finishing or replaying an interrupted tool. This is a useful recovery contract, not evidence that its desktop app survives every crash. [Claude Code resumed sessions](https://code.claude.com/docs/en/sessions#what-a-resumed-session-restores)

**Refinement.** Retain the last readable workspace when the API fails. Show “Reconnecting,” “Interrupted,” or “Last saved state,” with an appropriate recovery action. Preserve drafts and reconcile queued/accepted work before offering to retry it. Recovery should never silently replay work whose outcome is unknown.

**Completion check.** Test a temporary client disconnect separately from server termination in a disposable environment. Confirm transcript, draft, queue, and action states after each. The implementation finding is strong; actual crash and reconnect behavior was not exercised here.

## 4. Put the worker's answer first

**Current evidence — live and code.** Opening a completed specialist showed six collapsed sections: Result, Assignment, Conversation, Delegated work, Activity, and Context. Expanding Result revealed the saved answer. `WorkerConversation` wraps both Result and Latest response in a shared disclosure whose initial state is closed.

**Why it matters.** Inspecting a completed worker is usually an attempt to read its answer. The first screen currently presents navigation to that answer. This adds friction every time the user checks delegated work.

**Industry reference.** Claude Desktop documents different transcript detail levels and direct inspection of background task output. The applicable principle is immediate access to outcomes with details available on demand. [Claude Desktop transcript modes](https://code.claude.com/docs/en/desktop#switch-view-modes), [background tasks](https://code.claude.com/docs/en/desktop#watch-background-tasks)

**Refinement.** Show the final result or latest substantive response by default, with the assignment summarized nearby. Keep the longer transcript, activity, and context expandable. Preserve partial, truncated, failed, and stale labels.

**Completion check.** Opening completed, failed, and still-running workers should expose the useful result or current obstacle without an initial disclosure click. The existing content should remain reachable.

## 5. Explain what the Context panel actually represents

**Current evidence — live and code.** The usage popover showed only percentage, used tokens, and window size. The Context panel showed the existing instruction and resource groups. The API separately returns a `captured` flag, and the store distinguishes a saved chat snapshot from current defaults used for a legacy chat. `InstructionReceipt` accepts that flag but does not use it. Recorded runtime context also includes a capture timestamp and model, which this renderer does not display.

**Why it matters.** A saved setting, a pinned chat configuration, a list of available skills, and an actual runtime capture answer different questions. Displaying them without those distinctions makes it harder to explain why an existing chat behaves differently after editing defaults.

**Industry reference.** Cursor documents a context breakdown by category. Claude Code exposes live context and loaded instructions. [Cursor context usage](https://cursor.com/docs/agent/prompting#context-usage), [Claude Code context inspection](https://code.claude.com/docs/en/context-window#check-your-own-session)

**Refinement.** Start with information already recorded: “Captured for this chat” versus “Current defaults,” capture time, configuration revision, and observed model. Distinguish available resources from invoked or included content. Add usage categories only where the runtime can support accurate measurements or clearly labeled estimates.

**Completion check.** Compare a new bound chat, a legacy chat, and an existing chat after changing defaults. The panel should explain their different origins and avoid presenting an old capture as a live measurement.

## 6. Keep users oriented as work accumulates

**Current evidence — live and code.** The primary chat showed no title/project row above the conversation. This is intentional in `SessionLayout`, which renders the identity header only for a secondary pane. In the installed sidebar, expanding a chat with many completed workers produced repeated role names and pushed other chats far down the list. The full task assignment remained available through accessibility help, so the information exists but is not easy to scan visually.

**Why it matters.** With a narrow sidebar, similar titles, or multiple panes, users need a quick answer to “Which chat and project am I acting on?” Repeated role names alone do not distinguish several runs of the same specialist.

**Industry reference.** Codex makes task environment and checkout identity explicit; Claude Desktop surfaces project and session controls near the prompt. [Codex workspace identity](https://learn.chatgpt.com/docs/environments/git-worktrees), [Claude Desktop session setup](https://code.claude.com/docs/en/desktop#choose-a-permission-mode)

**Refinement.** Preserve the minimal visual design while keeping a compact chat/project identity cue visible. Give worker rows a short assignment or outcome cue and an easy way to collapse completed history. Confirm which chat owns the workspace panel when navigating into a worker or using split view. The latter is an acceptance requirement, not a reproduced wrong-target bug.

**Completion check.** With two similar chat titles and many worker runs, identify the active chat, working folder, and intended worker without depending on hover text or remembering navigation history.

## 7. Surface settings scope and goal progress

**Current evidence — live and code.** Harness settings provide a clear Save bar. The editor also contains explicitly immediate operations, including planning-document changes, while bound chats retain their configuration snapshots. Goal state records `turnsUsed` and `maxTurns`; the goal row shows a short status but does not display those values, and its explanatory message is inside the expanded editor.

**Why it matters.** Saving a default should not imply that an existing chat has adopted it. Likewise, “Active,” “Done,” or “Needs attention” is easier to act on when the reason and remaining allowance are visible.

**Industry reference.** Claude Desktop documents scope distinctions between per-folder defaults and per-session choices. [Claude Desktop setting scope](https://code.claude.com/docs/en/desktop#choose-a-permission-mode)

**Refinement.** Label where a setting comes from and when it takes effect. Mark immediate operations at the action itself. Show goal progress and the latest completion/blocking explanation beside its status. Make it clear when completion is an agent report rather than independently verified acceptance; this requires honest wording, not a new evaluation subsystem.

**Completion check.** Change a harness default, inspect an older chat, and create a new one. The interface should explain which value each uses. A paused or blocked goal should expose its reason without opening an edit form.

## 8. Resolve the unfinished Terminal surface

**Current evidence — live and code.** Selecting Terminal opened “Terminal transport required” and explained that this build does not expose a server-side terminal session. The current component is a placeholder.

**Why it matters.** Terminal appears alongside functional workspace views, but leads to implementation terminology instead of an available user action.

**Refinement.** Make its unavailable status clear in the picker and use plain product language. If completing the existing terminal is selected for this refinement cycle, require a working project-bound session, reconnect behavior, and predictable process lifetime before considering it finished. Do not count the visible tab as a delivered terminal feature.

**Completion check.** A user can tell whether Terminal is available before opening it. A completed implementation must operate in the clearly identified project and behave predictably across tab closure and reconnect.

## Recommended next cycle

Start with three contained, high-confidence changes: **explicit delivery timing, an immediately visible worker result, and context provenance labels**. Each improves a frequent workflow using data and behavior already present.

Then complete the review/restore and recovery contracts. Settle acceptance behavior before implementing broader controls. Keep navigation, settings scope, goal feedback, and unavailable-state wording in the same refinement backlog.

Before taking on a new feature category, demonstrate one complete disposable-project flow: send → steer/queue → inspect worker result → review final changes → restore → reconnect. Include manual edits and an interrupted operation. Passing isolated component checks is not enough to establish this flow.

## Validation and limits

- `bun run typecheck` passed. All five package typecheck tasks were cache hits; the root script typecheck also completed.
- `bun run test` failed at the desktop package: 65 passed, 2 timed out, with one accompanying error. The failures were “Electron's Node mode starts and stops the bundled headless API” and “idle starts checking.” The process test also reported a build result with a null status.
- Turbo stopped the repository run at that failure. The run does not establish completed web or agent-runtime suites. Server test success was replayed from cache.
- The timeouts were not diagnosed or reproduced in isolation. They establish a non-green validation run, not proof of two user-facing defects or of their cause.
- The live inspection used existing data. No fresh model run, paid-provider comparison, destructive checkpoint test, performance benchmark, or crash-injection test was performed.
- Read-only evidence collection was grouped by independent topic with bounded outputs. Some early inventories exceeded output limits; the specific source files supporting the findings were subsequently read in full or completed in targeted sections. A few guessed paths did not exist and were replaced with paths found from the repository.
- This audit created research documents only. Product behavior was not changed, and existing implementation work was preserved.

## Current implementation evidence

Paths are repository-relative; line numbers describe the inspected working tree and may move as ongoing work continues.

| Finding                                  | Source locations                                                                                                                                                                                                                                                                                                                                                                       |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Implicit steering and text-only delivery | `packages/web/src/features/sessions/components/composer/session-composer.tsx:285`, `:384`, `:465`; `composer-send-action.tsx:23`; `session-controls-tray.tsx:57`                                                                                                                                                                                                                       |
| Review and restore scope                 | `packages/web/src/features/sessions/components/timeline/items/assistant/tools/tool-details.tsx`; `packages/web/src/features/sessions/components/diffs/diff-viewer.tsx`; `packages/web/src/features/sessions/components/checkpoint-conflict-dialog.tsx:35`; `packages/web/src/features/workspace/lib/workspace-view-definitions.ts`                                                     |
| Recovery paths                           | `apps/desktop/src/main.ts:106`, `:132`; `packages/web/src/features/sessions/lib/streaming/session-event-stream.ts:102`; `packages/web/src/features/harnesses/components/worker-run/worker-run-detail.tsx`                                                                                                                                                                              |
| Hidden result                            | `packages/web/src/features/harnesses/components/worker-run/worker-conversation.tsx:28`; `packages/web/src/components/ui/disclosure.tsx:17`                                                                                                                                                                                                                                             |
| Context provenance and usage             | `packages/agent-runtime/src/rpc/agent-rpc-live.ts:48`; `packages/agent-runtime/src/layers/harnesses/internal/harness-store.ts:470`; `packages/agent-runtime/src/layers/harnesses/internal/harness-run-context.ts`; `packages/web/src/features/harnesses/components/instruction-receipt.tsx:81`; `packages/web/src/features/sessions/components/composer/session-context-indicator.tsx` |
| Chat identity                            | `packages/web/src/features/sessions/components/session-layout.tsx:43`; live sidebar and primary-chat inspection                                                                                                                                                                                                                                                                        |
| Settings and goals                       | `packages/web/src/features/harnesses/pages/harness-config-page.tsx`; `packages/contracts/src/session-runtime/schemas/session-controls.ts`; `packages/web/src/features/sessions/components/composer/session-controls-tray.tsx:18`                                                                                                                                                       |
| Terminal availability                    | `packages/web/src/features/workspace/components/workspace-terminal-view.tsx:10`                                                                                                                                                                                                                                                                                                        |
