# Industry benchmarks for refining Supernova's existing workflows

_Research date: 2026-09-15. Scope: current first-party documentation for Cursor, Claude Code, and Codex desktop workflows, with CLI behavior explicitly labeled._

## Scope and evidence

This report provides reference patterns for improving features Supernova already has. It does not assess Supernova's implementation, reuse an earlier feature roadmap, or propose expanding into new product categories. Apply a benchmark only after inspecting the corresponding current Supernova surface.

**Documented** means a fetched first-party page describes the behavior. It does not mean the competing product was installed, exercised, or independently verified. **Refinement criterion** and **acceptance scenario** are this report's synthesis. They are proposed evaluation criteria, not claims that a competitor passes every scenario. These references illustrate current advanced product practice; they do not establish an absolute state-of-the-art ranking.

OpenAI documentation currently describes the relevant capabilities as Codex in the ChatGPT desktop app. The observations below refer to that documented surface, not a claim about the installed app's version or account access. Some Claude references describe the CLI, which is useful for runtime semantics but should not be attributed to its Desktop UI.

## 1. Make follow-up delivery explicit

**Documented benchmark.** Codex distinguishes steering the current run from queuing a message for the next run. Its desktop queue is visible above the composer and supports editing, reordering, sending, and deletion. The default follow-up behavior is configurable. [Codex: steering and queuing](https://learn.chatgpt.com/docs/prompting#steering-and-queuing)

**Refinement criterion.** Existing chat input should communicate when a message will take effect. Pending, delivered, and canceled instructions must have distinct states. A queue should remain understandable after switching sessions or reconnecting.

**Acceptance scenario.** During a long command, send a correction and queue two later instructions. Reorder the queued instructions, delete one, reconnect, and verify that only the intended instructions are delivered, in the intended order, once. The user should be able to identify what is still pending without reconstructing the transcript.

**Boundary.** The docs specify interaction semantics; they do not establish exactly-once delivery under failures. That is a Supernova reliability requirement to test.

## 2. Explain context use and compaction

**Documented benchmark.** Cursor's context indicator opens a token breakdown covering instructions, tools, rules, skills, MCP, subagents, summaries, and conversation. Claude Code's `/context` exposes live usage and loaded instruction/memory files; its context documentation explains what survives compaction. [Cursor: context usage](https://cursor.com/docs/agent/prompting#context-usage), [Claude Code: context window](https://code.claude.com/docs/en/context-window#check-your-own-session)

**Refinement criterion.** Refine existing context controls so users can tell what is loaded, why it is present, what was compressed, and which instructions remain active. Clearly separate an exact measurement from an estimate. A capacity percentage alone does not answer those questions.

**Acceptance scenario.** Attach a large file, invoke a skill, and trigger compaction in a disposable session. Inspect the resulting context state: identify retained instructions, summarized content, references without full content, and any unavailable measurements. Confirm that the display matches the actual runtime context.

**Boundary.** A visible token breakdown does not prove that a model will attend to an instruction, nor that summaries preserve every detail. Claude's `/context` is a CLI reference here.

## 3. Complete the review loop at the level of the change

**Documented benchmark.** Codex's desktop diff pane exposes current-checkout changes, inline feedback, file-level and chunk-level staging/reverting, and common Git actions. Claude Desktop lets users compose comments on several diff lines and submit them together for revision. [Codex: built-in Git tools](https://learn.chatgpt.com/docs/environments/local-environment#use-built-in-git-tools), [Claude Desktop: diff review](https://code.claude.com/docs/en/desktop#review-changes-with-diff-view)

**Refinement criterion.** Existing diffs should make their baseline, scope, and available action unmistakable. Users should be able to act on the exact changed unit they reviewed and then see the resulting revision. Review feedback should retain file and line context.

**Acceptance scenario.** Start with unrelated uncommitted work, make two agent edits, and review one chunk. Submit comments, refresh after another edit, and revert only the chosen chunk. Verify that unrelated work remains intact and that stale line positions are not silently treated as current.

**Boundary.** A checkout diff is not proof that every displayed change belongs to the active agent. Attribution and concurrent-edit behavior require separate Supernova evidence.

## 4. Make checkpoint restoration honest about its scope

**Documented benchmark.** Claude Code distinguishes restoring code, conversation, or both, and offers targeted conversation summarization. Checkpoints persist with sessions, but its documented file restore coverage excludes changes made through Bash; retention can remove snapshots. [Claude Code: checkpointing](https://code.claude.com/docs/en/checkpointing)

**Refinement criterion.** An existing restore action should state the exact point, affected files, conversation effect, and limitations before applying it. An unavailable or partial snapshot must produce an explicit result. Restoring local files cannot be represented as undoing remote side effects.

**Acceptance scenario.** In a temporary project, make a direct edit, a shell-generated edit, and an unrelated manual edit. Restore an earlier checkpoint and verify what was restored, preserved, or unsupported. Restart and repeat against a retained checkpoint. Inspect how missing snapshots are presented.

**Boundary.** These are Claude Code runtime/CLI semantics, not evidence that every action is reversible or that its Desktop UI offers the same restore menu.

## 5. Separate action approval from execution containment

**Documented benchmark.** Cursor distinguishes Auto-review, Allowlist, and Run Everything. Its documentation separates the policy that decides whether an action may proceed from the sandbox that restricts file and network access, and explicitly says its classifier is not a security boundary. [Cursor: run modes](https://cursor.com/docs/agent/security/run-modes)

**Refinement criterion.** Existing permission settings should explain both what can run without a prompt and what the running process can reach. Display the effective policy and execution boundary. Approval outcomes should say which action was allowed or blocked and what happens next.

**Acceptance scenario.** Using harmless commands, exercise a permitted workspace write, a write outside the workspace, and a network request. Check that the displayed mode predicts each outcome and that failures do not leave the session appearing to run indefinitely. Repeat after changing the relevant setting.

**Boundary.** The benchmark is clarity of actual policy and enforcement. It does not imply that Supernova should copy Cursor's classifier or adopt a new security architecture in this refinement pass.

## 6. Define what session recovery actually restores

**Documented benchmark.** Claude Code's CLI documents which conversation and configuration state is restored. A tool interrupted by process termination is not completed or rerun on resume, and background Bash/monitor tasks are not restored. Some launch configuration must be supplied again. [Claude Code: resumed sessions](https://code.claude.com/docs/en/sessions#what-a-resumed-session-restores)

**Refinement criterion.** Existing session recovery should distinguish saved conversation, attached live process, interrupted operation, and resumable work. An unknown external outcome must remain unknown until checked. Recovery should make changed configuration visible.

**Acceptance scenario.** Disconnect the UI during streaming, then separately terminate the server during a harmless command. Reopen the session and inspect the transcript, run status, pending messages, permissions, and subprocess state. Verify that reconnecting to live work and resuming after process death produce appropriately different states.

**Boundary.** This is a documented CLI recovery contract, not a claim about Claude Desktop crash recovery. Transcript persistence alone does not prove resumable execution.

## 7. Preserve workspace identity through the whole task

**Documented benchmark.** Codex exposes Local versus Worktree, starting-branch selection, and moving a task with its code between those environments. It also documents managed-worktree cleanup, snapshots before deletion, and restoration when reopening the associated task. [Codex: worktrees](https://learn.chatgpt.com/docs/environments/git-worktrees)

**Refinement criterion.** Existing workspace and branch controls should keep the host, checkout path, branch or detached state, and task association consistent across chat, terminal, file view, and review. Cleanup should preserve recoverable work and make the consequences clear.

**Acceptance scenario.** Open two isolated tasks on one repository and change the same file differently. Verify that terminal commands, file links, and diffs resolve to each task's own checkout. Switch tasks, restart, and reopen an archived or missing worktree through the supported recovery flow.

**Boundary.** Git worktrees isolate files and branch state; they do not inherently isolate processes, ports, credentials, or databases. Codex's documented automatic restoration concerns its own managed worktrees.

## 8. Show effective settings and their scope

**Documented benchmark.** Claude Desktop places environment, project, model, and permission mode in the prompt area. Its permission-mode selection is remembered per folder and overrides the configured default, while Plan applies only to the current session. [Claude Desktop: session setup and permission modes](https://code.claude.com/docs/en/desktop#choose-a-permission-mode)

**Refinement criterion.** Refine existing model, profile, and settings surfaces so the user can distinguish saved defaults from the values active in the current task. Make global, workspace, profile, and task overrides comprehensible wherever those scopes already exist.

**Acceptance scenario.** Set a default, override it for one workspace or task, create a second task, and resume the first. Confirm that the active values, their source, and the scope of a subsequent edit are evident. A setting should never look active merely because it was saved elsewhere.

**Boundary.** This source documents a useful scope distinction; it does not establish that Claude has Supernova's profile model or that copying its precedence rules would be appropriate.

## 9. Keep progress readable and the underlying evidence reachable

**Documented benchmark.** Claude Desktop offers Normal, Verbose, and Summary transcript views. Its tasks pane lists background subagents and shell commands, with entry-level output inspection and stopping. [Claude Desktop: transcript modes](https://code.claude.com/docs/en/desktop#switch-view-modes), [Claude Desktop: background tasks](https://code.claude.com/docs/en/desktop#watch-background-tasks)

**Refinement criterion.** Existing progress and tool-result components should support quick scanning while preserving the detailed evidence needed to understand a failure. Running, waiting for approval, failed, stopped, and completed should be visibly distinct. A child operation should remain linked to the task that owns it.

**Acceptance scenario.** Run several background commands with mixed outcomes. Switch tasks and return, inspect a failure, stop one command, and expand an older tool result. Verify that statuses stay current, the correct output opens, and the transcript remains usable without losing the reader's position.

**Boundary.** The docs demonstrate controls and information hierarchy. They supply no independently measured latency, memory-use, accessibility, or large-transcript performance results.

## Applying these benchmarks

For each matching Supernova surface, record three separate outcomes:

1. **Implementation present:** the current code contains the relevant behavior.
2. **Interaction verified:** the running app exposes a usable end-to-end path.
3. **Failure behavior verified:** the path remains understandable after interruption, reconnect, stale data, or partial completion.

Prioritize gaps that can lose work or apply an action to the wrong task, followed by controls whose displayed state differs from runtime behavior, then friction in frequent review and conversation operations. This prioritization is a product judgment for the requested refinement pass, not a measured industry ranking.

## Research limitations

- The comparison uses first-party product documentation, not independent hands-on tests of the three competitors.
- Search snippets for Claude and Cursor contained older behavior and URLs. Freshly opened pages took precedence; a legacy Cursor planning URL redirected to the documentation homepage and was not used as evidence for queue semantics.
- A small local search did not locate relevant bundled Codex product documentation. OpenAI's official documentation search and fetched pages supplied the Codex evidence.
- Independent source reads were grouped with bounded result excerpts. Early batches exceeded output limits; relevant pages were subsequently reopened or fetched, stored, and inspected in targeted excerpts. No conclusion relies on an unseen truncated passage.
- No timing, adoption, productivity, or error-rate benchmark was run. The sources support reference interactions and documented limits, not claims that one product is universally superior.
