# Stable harness delivery

Implementation assessment of [the agent-systems landscape and plan](./radian-complete-agent-systems-landscape-and-plan.md), 15 September 2026.

## Assessment

The plan is useful as a capability map. Its separation of harness, collaboration policy, execution, and acceptance is the right foundation. Its phases are too broad for a first delivery: durable scheduling, policy enforcement, workspace isolation, and persistent partner sessions each need independent acceptance gates. The week estimates are planning assumptions, not measured estimates.

The immediate product gap is simpler: a chat captures one harness at creation and keeps one Pi runtime. Users cannot choose a collaboration setup from the composer, and changing a label would not change the runtime's tools or instructions.

This assessment checks the local implementation. It does not refresh the document's vendor comparisons or establish that additional agents improve answer quality.

## Delivered first slice

The **Harness setup** control is available beside the model in new and existing chats. It selects a saved harness and an independent collaboration mode:

| Mode          | Execution                                        | Result                                                                        |
| ------------- | ------------------------------------------------ | ----------------------------------------------------------------------------- |
| Solo          | Existing harness tools and configured delegation | Normal agent work, including implementation                                   |
| Advisor       | One isolated assessment, then the lead           | Recommendation, objections, evidence and uncertainty                          |
| Compare       | Two independent candidates, then the lead        | Both alternatives retained separately                                         |
| Document Fuse | Two candidates → critic → synthesizer → lead     | Document/plan with contributions from each candidate and unresolved conflicts |

The runtime starts collaboration automatically at each submitted-turn boundary. Presets compile to the existing workflow runner, which validates handoffs and retains run records, public worker transcripts, status, cost and failures. The lead receives all candidate records, not only the last step. Completed collaboration appears as an inspectable workflow entry in the conversation.

### Switching semantics

- A selection is acknowledged and persisted as **Next**. It applies before the next user message, queued message, or goal continuation.
- A running answer and its existing children keep their original setup. Steering still addresses that answer.
- Preparation loads the new resources before committing the replacement. Failed preparation retains the old active configuration and the unsent message. The pending change can be cancelled.
- The conversation, selected model, workspace path, and checkpoint history remain in the same chat. Existing saved harnesses and project assignments are not edited.
- Changing only the collaboration mode preserves the chat's pinned harness version. Switching to another harness captures its current configuration; project overrides apply when that harness has a project for the same folder. Otherwise project instructions and planning documents carry over without importing another project's agents or coordinator authority.
- Active and pending configurations are separate records in the atomically written session-controls sidecar. Restart preserves both and recovers queued/goal work paused. This is setup persistence; workers themselves still lack durable continuation.
- Conflicting setup selections are rejected. Queue updates and turn settlement do not invalidate an otherwise current setup choice. A pending change can be replaced or cancelled explicitly.

### Boundaries

Advisor, Compare and Document Fuse expose only `read`, `grep`, `find`, `ls`, and `web_fetch` to the lead and workers. Imported extensions are not loaded in these modes. Solo restores the saved harness's configured tools and extensions. This is a restricted tool surface, not an operating-system sandbox or a complete solution for the research-tool capability gap.

Workers inherit the model currently selected in the chat. Each worker has at most six model turns, 90 seconds and a $0.75 budget; shorter harness limits remain in force. The workflow has a five-minute, $3 budget and at most two simultaneous workers. Cost guards operate on reported usage and do not guarantee an exact final invoice. The lead's final answer uses additional tokens.

Workers receive the current text request and up to 24,000 characters of prior user/assistant text. They do not receive prior hidden reasoning, tool transcripts, or image attachments. Each output excerpt handed to the lead is capped at 20,000 characters; the full worker output remains in the recorded run. For image-specific analysis, use Solo.

Malformed or failed worker results fail the collaboration visibly. They cannot silently turn into a Solo answer. Typed evidence and attribution fields establish structure, not factual correctness or independent acceptance.

## Next priorities

1. Explicit tool capability metadata and preflight checks, especially for research retrieval. Preserve the restricted presets until permissions can be checked beyond tool names.
2. Separate execution, verification and acceptance with task-specific checks. Establish single-agent baselines before claiming quality or cost gains.
3. Shared durable worker identity, follow-up and restart recovery, with workspace ownership. These are prerequisites for persistent Fusion Partner and handoff.
4. Bounded Verify/Repair and Committee once evidence and acceptance are represented consistently.
5. Dynamic organizations, swarms, auctions and autonomous profile changes remain experiments.

## Verification scope

The checks for this slice use the real browser, RPC server, Pi sessions, harness loading, workflow runner and durable files with a deterministic synthetic provider. They cover new-chat selection, switching while an answer runs, reload, unchanged workspace/history, read-only worker and lead tools, all Fuse stages, retained drafts after preparation failure, and visible malformed-output failure. Storage tests separately cover active/pending setup recovery and owner validation.

Verified on 15 September 2026:

- All five browser scenarios passed, including queued dispatch, cancellation followed by a Solo turn, and conflicting setup selections.
- All 11 setup persistence/recreation tests passed, alongside the full repository test suite. The test environment used the server's bundled `fd` tool on its search path.
- Repository type checking, lint, formatting and the production web/server/desktop build passed.
- Fixed an existing delegation test race by waiting for all three saved running receipts before asserting on them.

These checks establish application behavior, not paid-provider quality, performance improvements, or installation in the packaged desktop app.

### Installed on 16 September 2026

The harness controls and audit repairs were subsequently packaged, signature-checked, installed at `/Applications/Radian.app`, and launched with the existing projects and chats. The composer showed the Harness setup control in an existing chat. The previous installation was retained as a backup. See the [delivery and verification record](/Users/philippcarlvictorstrieder/Developer/supernova/docs/qa/radian-repairs-2026-09-16/report.md) for the final checks and remaining native acceptance limits.
