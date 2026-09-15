# Organisational AI: a curator for instructions, plans and memory

Design note: 2026-09-12, at commit `81589ab`. Answers one question the product now raises: who keeps the harness instructions, the project instructions and plans, the specialist roles and the memory coherent over months, when no single chat sees more than one context window of them? Fourth companion note, after [ai-engineering-practice.md](./ai-engineering-practice.md).

| Label      | Meaning                                                             |
| ---------- | ------------------------------------------------------------------- |
| `repo`     | Verified by reading this repository. Path given.                    |
| `measured` | A named study from the earlier notes; the weakness is stated there. |
| `proposed` | A design proposal. No source endorses it.                           |

## 1. The answer first

Make it a separate role, the **Curator**, not a duty of the Head Orchestrator.

The orchestrator lives inside a chat: it has a task, a user waiting, a turn budget and a pinned snapshot of the configuration it was started with (`repo`, [harness-store.ts](../../packages/agent-runtime/src/layers/harnesses/internal/harness-store.ts) `bindSession`). Curation is the opposite shape of work: it runs between chats, reads across all of them, has no task of its own and changes the very text every future chat starts from. Folding it into the orchestrator would mean an agent editing its own instructions while it is using them, inside a context already spent on the user's problem. The earlier notes give the reason to distrust that loop: intrinsic self-correction lowers accuracy (`measured`, Huang et al.), and adding text to a context lowers quality even when every token is relevant (`measured`, arXiv 2510.05381). A curator therefore works from **evidence** (what happened in runs) rather than **introspection** (what it thinks of a prompt), and it **proposes** rather than **edits**, except where a change is cheap to reverse.

The orchestrator keeps one link to it: a tool to ask for curation ("record this decision", "the reviewer keeps failing on X") that files evidence and returns immediately. Nothing else changes for chats.

## 2. What exists today (`repo`)

| Artefact             | Where it lives                                                                                                                                                                                                                                 | Who writes it                                                      | Read by chats as                                                                                                                                                                               |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Harness instructions | `HarnessConfig.systemPrompt`, `context.instructions` in `~/.config/pi-plus/harnesses.json`                                                                                                                                                     | The user, in Settings                                              | The `shared` and `context` layers of [harness-prompts.ts](../../packages/agent-runtime/src/layers/harnesses/lib/harness-prompts.ts)                                                            |
| Project instructions | `HarnessProject.systemPrompt`                                                                                                                                                                                                                  | The user, in Settings → Projects → Instructions                    | The `project` layer                                                                                                                                                                            |
| Planning documents   | Markdown files in the project folder, listed in `HarnessProject.planningDocuments`                                                                                                                                                             | The user, in Settings → Projects → Plan; any agent with file tools | Appended as `Project planning document: <path>` ([harness-runtime.ts](../../packages/agent-runtime/src/layers/harnesses/internal/harness-runtime.ts), line 91)                                 |
| Specialist roles     | `HarnessAgent.systemPrompt`, per-project overrides in `HarnessProject.agents`                                                                                                                                                                  | The user                                                           | The `role` layer                                                                                                                                                                               |
| Memory               | `<project>/.science-memory/ledger.jsonl`, append-only records `{recordId, statement, kind, epistemicState, updatedAt, evidence}`; the extension already models verify, contest, supersede (with `supersededBy`) and retract as appended events | The Science Pi memory extension during chats                       | Read by the extension's tools; Supernova only displays it read-only ([harness-resources.ts](../../packages/agent-runtime/src/layers/harnesses/internal/harness-resources.ts), lines 78 to 117) |
| Run receipts         | `~/.config/pi-plus/runs/<chat>/`                                                                                                                                                                                                               | The runtime, on every delegated run and workflow step              | Not read by anyone yet; shown on the run pages                                                                                                                                                 |

Four facts constrain the design.

1. **Budgets are enforced, not advised.** Each instruction piece is capped at 200,000 characters and the assembled instructions at 400,000 (`repo`, [harness-config.ts](../../packages/agent-runtime/src/layers/harnesses/lib/harness-config.ts)). A curator that only adds will hit the wall; one of its jobs is to take text out.
2. **Chats pin their configuration.** Editing a prompt never changes a running chat; the next chat gets the new text. This is what makes curation safe to apply at all, and it makes before/after comparison natural: old chats are the control group.
3. **Every change is revisioned but not versioned.** The library carries a `revision` counter for optimistic concurrency, but no history of what a prompt said last week. Rollback does not exist yet.
4. **Nothing runs in the background.** The API is request driven; the only timers are run timeouts (`repo`, `apps/server/src`, `harness-runtime.ts` lines 40 to 44). A curator needs a scheduler and an event hook, both new.

## 3. What the Curator maintains, and what "good" means

| Artefact             | Good looks like                                                                                                                 | Typical proposal                                                                                                                                                    |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Harness instructions | One voice, no contradictions with project or role text, under budget, every rule traceable to a reason                          | Remove a rule no run has needed in 30 days; merge two rules that say the same thing; move a project-specific rule down a layer                                      |
| Project instructions | Say what this project is, not how to behave (that is the harness's job); consistent with the plan                               | Replace a stale mission line with the one the plan now states; drop instructions duplicated in a planning document                                                  |
| Planning documents   | PLAN.md reflects decisions actually taken; GOALS.md has no goal that chats have stopped serving; open decisions are listed once | Append a dated entry under a curator-owned heading; flag a goal with no run against it in N weeks; ask the user to close a decision that runs keep re-deciding      |
| Specialist roles     | Each role distinct; output contract matches what the workflow reads; failure modes named in the prompt                          | Add one sentence addressing a repeated `malformed_output`; split a role two workflows use for different things; retire an agent no workflow references              |
| Memory               | No duplicate statements; superseded records marked; recurring facts promoted to instructions; nothing deleted                   | Mark record B as superseded by record A; propose promoting a fact stated in 4 records into the project instructions; retire a hypothesis marked refuted for 90 days |

The Curator never writes prose into a chat, never delegates work, never runs a workflow, and never touches project files outside the planning documents and the memory folder.

## 4. Evidence it works from, and evidence it must ignore

Inputs, in order of weight:

1. **Run receipts** (`repo`, `harness-run-store.ts`): status, error, events, the exact instruction layers the run saw, model, spend. Workflow steps add `failureKind` (`malformed_output`, `provider`, `limit`, `cancelled`, `configuration`).
2. **Steers**: what the user typed while a turn was running. Today a steer is forwarded to Pi and not kept by Supernova (`repo`, [steer-session.ts](../../packages/agent-runtime/src/layers/session-runtime/operations/steer-session.ts)); recording it is the single most valuable new signal, because a steer is a user correcting the instructions in real time.
3. **Memory records** and their epistemic states, with their evidence links.
4. **Planning documents and instructions themselves**, only for consistency checks (duplicates, contradictions, budget), never for taste.
5. **Chat transcripts**, only as citations behind a proposal, never as a corpus to summarise. Summarising transcripts into instructions is how prompts grow without bound.

What it must not do: rewrite a prompt because the prompt "could be clearer". Every proposal cites at least one receipt, steer or record, and a proposal about a role prompt needs the same failure in at least three runs (`proposed`). This is the operational form of the self-correction finding: the model is not the judge of its own instructions; the run history is.

## 5. The change model

**Propose, review, apply.** A proposal is a diff against one artefact with a rationale and citations. Three tiers decide who applies it (`proposed`):

| Tier              | Applies                               | Examples                                                                                                                       | Undo                                                                      |
| ----------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| 0, silent         | The Curator, immediately              | Mark a memory record superseded or retracted through the extension's own transitions; index rebuilds; "last reviewed" stamps   | The ledger is append-only, so undo is another append                      |
| 1, apply and tell | The Curator, then a notice in the app | Append a dated entry under `## Curator log` in PLAN.md; promote a memory fact into a `## Learned` block of a planning document | The block is curator-owned and dated; the user deletes lines              |
| 2, needs approval | The user, from the inbox              | Any change to harness, project or role instructions; removing a goal; retiring an agent                                        | Approve, edit-then-approve, or reject with a reason that becomes evidence |

Rules that keep it from thrashing (`proposed`):

- **Minimal diff.** A proposal changes the fewest lines that address its evidence. Rewrites are refused by construction: the tool takes a find/replace pair, not a new document.
- **Cooldown.** One open proposal per artefact; after apply or reject, no new proposal against that artefact for seven days unless the evidence is new.
- **Budget first.** When the assembled instructions exceed 80% of budget, the only tier 2 proposals allowed are removals and merges.
- **Versions.** Every apply writes the previous text to `~/.config/pi-plus/versions/<artefact>/<revision>.md`; the inbox shows a rollback for each applied proposal. Chats already record which revision they ran on, so "which version did this chat use" is answerable.

## 6. When it runs

Three triggers, all bounded (`proposed`):

- **After a run completes**, debounced to at most once per project per 15 minutes, restricted to memory hygiene and evidence filing (cheap, tier 0).
- **A daily sweep** per harness at a configured quiet time, doing the full review with a cost cap (default 0.50 USD per harness per day) and a wall clock cap (10 minutes).
- **On demand** from Settings ("Review now") for one project or the whole harness, with the same caps.

Prompt caches are per model and invalidated by any change to the prefix; applying prompt edits is therefore batched into the daily sweep rather than trickled through the day.

## 7. Architecture

All under the existing server process; nothing new to install.

**Runtime** (`packages/agent-runtime/src/layers/curator/`, new)

- `curator-service.ts`: the scheduler (a single interval, quiet hours, caps) and the event subscription to run completion, hooked where [harness-runtime.ts](../../packages/agent-runtime/src/layers/harnesses/internal/harness-runtime.ts) marks a run completed (line 277).
- `curator-run.ts`: one review = one `runSession` with the harness's model, a fixed set of read tools (`read_receipts`, `read_ledger`, `read_instructions`, `read_document`, `read_steers`) and three write tools (`propose_change`, `apply_memory_op`, `append_curator_log`). `effects: "none"` for everything but the last two, which are tier 0 and tier 1 by definition. Reuses the wind-down and cost accounting the workflow runner already has.
- `curator-store.ts`: proposals, versions and review stamps under `~/.config/pi-plus/curation/`, with the same atomic write and lock discipline as `harness-store.ts`.
- `steer-log.ts`: records every steer as `{chatId, at, text}` next to the run receipts. Ten lines in `steer-session.ts`.

**Contracts** (`packages/contracts/src/harnesses/`)

- `CuratorConfig` on `HarnessConfig`: `{enabled, model?, effort?, dailyAt, maxCostUsdPerDay, autoApply: {memory: boolean, planningLog: boolean}}`.
- `CurationProposal`: `{id, harnessId, projectId?, target: {kind: "harness" | "project" | "role" | "document" | "memory", ref}, change: {find, replace} | {op: "supersede" | "retire", recordId}, rationale, evidence: [{kind: "run" | "steer" | "record" | "document", ref, quote}], status: "pending" | "applied" | "rejected" | "rolled-back", createdAt, decidedAt?, appliedRevision?}`.
- RPCs: `listCurationProposals`, `decideCurationProposal` (approve, edit, reject with reason), `rollbackCurationProposal`, `runCuratorReview`, `listInstructionVersions`.

**Web**

- Settings → Agents gains a **Curator** entry beside Main orchestrator: its model, schedule, caps, what it may auto-apply, and its run history with spend.
- A **Review inbox** (Settings → Harness → Inbox, badge in the sidebar harness header): each proposal as a two-column diff with the rationale and the cited evidence expandable; Approve, Edit, Reject. Applied proposals stay listed with Roll back.
- Planning documents show curator-owned blocks with a subtle mark, so the user can tell their own text from the log.
- The chat context strip shows "instructions revision N"; a chat started before an applied change says so.

## 8. Phases

Each phase ships on its own and is useful without the next.

**Phase 1, the evidence and the inbox.** Steer log; instruction versions on every save; proposal store and RPCs; "Review now" that runs one review with read tools and `propose_change` only; the inbox with diff, approve, reject, roll back. No scheduler, no auto-apply. Acceptance: a review of Science Pi produces proposals that each cite a receipt or steer, and approving one changes the next chat's instructions while an open chat stays on its revision.

**Phase 2, memory hygiene and the plan log.** `apply_memory_op` for supersede and retire, appended to the ledger in the extension's own format so its tools keep working; `append_curator_log` for the dated block in PLAN.md; the after-run trigger with debounce. Acceptance: duplicate records stop appearing in the Memory tab; the plan log lists decisions taken in chats within a day.

**Phase 3, role tuning from failures.** Aggregation over `failureKind` and error text per agent; the three-occurrence rule; proposals against role prompts and workflow output contracts; overlap detection between agents. Acceptance: for one specialist with a repeated `malformed_output`, an approved one-sentence proposal removes the failure in the following runs. This is the first measured claim the feature can make about itself.

**Phase 4, the daily sweep and budgets.** Scheduler with quiet hours, caps, the 80% budget rule, batching of prompt edits, the Curator settings page. Acceptance: a week of sweeps stays under the cost cap and the assembled instruction size does not grow.

## 8a. Implementation status

Phases 1 to 4 are implemented (September 2026): `packages/agent-runtime/src/layers/curator/`, the curation contracts, and the Curator, Inbox and history screens in `packages/web`. Deviations from the plan above: a role prompt may also be changed without three failures when the change does not grow it and cites that role's own text (an overlap or duplicate); the daily sweep is due at the most recent occurrence of its time, so one that falls inside quiet hours runs when the window ends; a memory transition cannot be rolled back because the ledger's terminal states have no inverse, and a pure text removal is restored from the version history instead.

## 9. How we will know it works

Measured on new chats only, since old chats keep their snapshot (`proposed`):

- Proposal acceptance rate, and the reasons given for rejections.
- Malformed-output and limit failures per hundred runs, per agent, before and after an applied role proposal.
- Steers per chat: fewer corrections mid-turn is the most direct sign the instructions improved.
- Assembled instruction size over time; it should fall or hold.
- Curator spend per harness per day against its cap.

If acceptance stays under one in three after Phase 3, the evidence rules are wrong or the model is too small for the job, and the Curator should be narrowed to memory and plan logging, which are cheap and safe.

## 10. Risks

| Risk                                                    | Mitigation                                                                                                             |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Oscillation: a rule removed on Monday returns on Friday | Cooldown per artefact; rejections are evidence the next review reads first                                             |
| Growth: the Curator adds more than it removes           | The 80% budget rule; removals need less evidence than additions                                                        |
| Two authors in one file                                 | Curator-owned blocks in planning documents; the existing modified-time conflict check refuses a stale write            |
| Cost creep                                              | Daily cap, per-run cap, no review without new evidence since the last one                                              |
| Privacy                                                 | Runs on the same local API and provider as every chat; no new service; the ledger and receipts never leave the machine |
| Authority creep                                         | Tier 2 needs a human; the Curator has no tools to run workflows, delegate or execute anything                          |

## 11. Decisions for you

1. **Auto-apply scope.** The proposal above lets the Curator apply memory hygiene and the plan log by itself. If you would rather approve everything for the first month, Phase 2 ships with both switches off.
2. **Model.** The daily sweep reads a lot and writes little; a cheaper model with high effort is likely enough, with the harness model reserved for role-tuning proposals. Say if you want one model for both.
3. **Where the plan log lives.** In PLAN.md under a curator heading, or in a separate `CURATOR.md` the Curator owns outright. The first keeps one plan; the second keeps your text untouched.
4. **Order.** Phases are ordered by safety. If memory hygiene matters most to you day to day, Phase 2 can go first, because the inbox is not needed for tier 0 work.
