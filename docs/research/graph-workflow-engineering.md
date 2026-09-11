# Graph workflow engineering for a Pi+ coding harness

Research snapshot: 2026-09-11. Companion to [graphs-orchestration.md](./graphs-orchestration.md). That file catalogues what other frameworks expose. This file answers the three questions it leaves open: how a graph workflow works mechanically, what Supernova's harness graph is today, and what it has to become before it can carry real coding work.

Revised after review on 2026-09-11. The revisions are marked `revised`; the first-release implementation that followed is summarised in section 17.

Every claim carries a label.

| Label | Meaning |
|---|---|
| `repo` | Verified by reading this repository at commit `4104c99`. File and line are given. |
| `documented` | Stated in first-party documentation, linked inline. |
| `measured` | A number from a named study or benchmark. The source and its weakness are both given. |
| `proposed` | A design proposal for Supernova. Not shipped, and not implied by any cited source. |

## 1. A graph workflow has five parts

Nodes and edges are the visible part and the least important. Five mechanisms decide whether a workflow survives contact with a long coding task. Remove any one and the graph degrades into a loop with extra syntax.

| Part | What it is | What breaks without it |
|---|---|---|
| Typed state with a per-key merge rule | A named channel per piece of shared state, each with a declared rule for combining concurrent writes | Parallel branches overwrite each other, and the last writer wins silently |
| A node contract | Declared input channels, output channels, and an output schema the runtime enforces | Downstream nodes parse prose, and a malformed handoff is discovered three nodes later |
| An edge predicate evaluated by code | Routing as a pure function of state, not a model judgement | Routing is unreplayable, so the same inputs can take a different path on retry |
| A step boundary | A durable write of the cursor and channels between nodes | A crash costs the whole run rather than one node |
| A join rule | An explicit reducer plus a tolerated-failure threshold for fan-in | One slow or failed branch decides the fate of the entire fan-out |

The test to apply to any implementation: **a crash between two nodes should cost exactly the node that was running.** LangGraph checkpoints between supersteps, and within a parallel superstep it persists each task's successful output as a pending write so a failed sibling does not force the successful ones to rerun; work inside one still-running node is what a crash loses (`documented`, [durable execution](https://docs.langchain.com/oss/python/langgraph/durable-execution), [checkpointers](https://docs.langchain.com/oss/python/langgraph/checkpointers), `revised`). That makes node size a durability decision before it is a modelling decision: **make a node as large as the work you are willing to redo, and no larger.**

The reliability arithmetic is the reason any of this matters. Steps that are independently 95% reliable compound to roughly 36% success across twenty unsupervised steps. The lever is fewer steps with firmer boundaries, not a better framework.

## 2. Two different graphs, both required

"Graph" means two unrelated things in agentic coding, and conflating them produces designs that do neither well.

| | Orchestration graph | Code graph |
|---|---|---|
| Nodes | Agent invocations, gates, commands | Files, symbols, tests, owners |
| Edges | Control flow and state handoff | Defines, references, calls, imports, tests |
| Built by | The harness author | An indexer over the repository |
| Changes | When the workflow is edited | On every commit |
| Answers | "What runs next, and with what state?" | "What code is involved, and what breaks if I change it?" |

Sections 3 through 10 concern the orchestration graph. Section 11 concerns the code graph. A harness needs both: the orchestration graph decides who works, the code graph decides what they look at.

## 3. What the harness graph is today

All `repo`.

| Finding | Location |
|---|---|
| A graph is a flat list of agent names: `graph: {steps: Schema.Array(Schema.String)}` | [harness.ts:36](../../packages/contracts/src/harnesses/schemas/harness.ts#L36) |
| Validation is existence plus a cap of twelve. No edges, no conditions, no contracts | [harness-config.ts:64](../../packages/agent-runtime/src/layers/harnesses/lib/harness-config.ts#L64) |
| `harness_workflow` runs the steps sequentially, passing one shared task string to all of them | [harness-runtime.ts:279](../../packages/agent-runtime/src/layers/harnesses/internal/harness-runtime.ts#L279) |
| Fan-out is capped at three tasks, fails fast, and aborts siblings on the first rejection | [harness-runtime.ts:245](../../packages/agent-runtime/src/layers/harnesses/internal/harness-runtime.ts#L245) |
| Both join rules concatenate strings with a `---` separator | same |
| Specialists cannot delegate further. Depth is not one, though: the head orchestrator delegates to a lab lead through `lab_agent`, and the lead delegates to specialists, so the hierarchy is head, lead, specialist | `subagent` and `lab_agent` tool descriptions, `revised` |
| Runs persist as receipts with atomic rename, and orphans become `interrupted` by a pid liveness check | [harness-run-store.ts](../../packages/agent-runtime/src/layers/harnesses/internal/harness-run-store.ts) |
| No cursor is persisted, so an `interrupted` run can be reported but not resumed | same |

The honest summary: Supernova has a **handoff list**, durable **receipts**, and no step boundary. Two of the five parts in section 1 are absent outright, and a third exists only as string concatenation.

What already exists is more valuable than what is missing. Shadow-git checkpoints capture and restore workspace trees, restore only paths that differ, detect manual conflicts before mutating, and never touch the user's `.git` ([checkpoint-system.md](../checkpoint-system.md), `repo`). That is the compensation primitive a coding graph needs, and most frameworks surveyed do not have it. It is simply not bound to workflow steps yet.

## 4. The handoff mechanism is the specific defect

`chain()` builds each step's prompt as the original task plus `previous.slice(-80000)` ([harness-runtime.ts:231](../../packages/agent-runtime/src/layers/harnesses/internal/harness-runtime.ts#L231), `repo`). Three distinct problems follow, and they are worth separating because they have different fixes.

1. **The cut keeps the tail.** Slicing the last 80,000 characters discards the beginning of the upstream output. Agents conventionally put conclusions first, so this preferentially deletes the verdict and keeps the working notes. A budget is correct; taking it from the wrong end is not.
2. **The boundary is arbitrary.** The cut lands mid-token and mid-structure, so a downstream agent can receive a half-written table or an unterminated code fence.
3. **The contract is positional.** A step knows only "the previous specialist said something." It cannot require a field, cannot detect that a required field is missing, and cannot fail fast. Structured outputs exist precisely for this: a JSON-schema-constrained response is guaranteed valid and its grammar is cached for 24 hours (`documented`, [structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs)).

The fix is not a larger window. It is a named channel per artifact, with a schema, and a merge rule.

## 5. The convergent pipeline for coding work

Production systems converge on five stages in this order. The stage names vary; the order and the gate placement do not. This is a design judgment drawn from reading the systems in the companion research, not a measured finding, and Science workflows may need different stages (`revised`).

| Stage | Receives | Emits | Who decides |
|---|---|---|---|
| Plan | Task, repository context, code-graph slice | File list, task breakdown, acceptance criteria | Model, reviewed by human in the stronger setups |
| Implement | One task plus its acceptance criteria | Edits on an isolated branch or worktree | Model |
| Verify | The diff | Lint, typecheck and test results | Executable checks, not a model |
| Review | Diff plus verification results | Approve, or a specific change request | Human, or a separate model with a rubric |
| Integrate | Approved diff | Merge, and the consequences | The host |

Three points hold across the systems examined.

- **State travels as an append-only log or as git.** OpenHands keeps a JSON event per action; SWE-agent writes trajectory files; the git-centric tools treat the branch and working tree as the state (`documented`).
- **Isolation is a worktree, a branch, or a container**, chosen per agent, so concurrent agents cannot corrupt each other and conflicts surface at integration time (`documented`).
- **Verification is executable before it is conversational.** Lint and typecheck run in the loop where the agent can self-correct; the full suite runs as an asynchronous gate.

Contested, with no primary measurement found either way: whether to pre-plan expensively before acting, whether to split architect from editor, and whether spec files beat message history as the carrier of state. Treat vendor numbers in this area as unverified. One token-reduction figure that is measured applies only to API specifications, not to coding tasks generally.

## 6. Proposed graph model

`proposed`. Shaped to drop into `packages/contracts/src/harnesses/schemas/` beside the existing schemas, and deliberately additive: `graph.steps` can be derived from a linear graph so saved harnesses keep working.

```ts
export const ChannelMerge = Schema.Literals(["replace", "append", "concat", "union", "max"]);

export const GraphChannel = Schema.Struct({
  name: Schema.String,
  merge: ChannelMerge,
  maxTokens: Schema.optional(Schema.Number),
});

export const EdgePredicate = Schema.Struct({
  channel: Schema.String,
  op: Schema.Literals(["eq", "ne", "lt", "gte", "exists", "empty", "contains"]),
  value: Schema.optional(Schema.Unknown),
});

export const GraphNode = Schema.Struct({
  id: Schema.String,
  kind: Schema.Literals(["agent", "gate", "command", "subgraph"]),
  agent: Schema.optional(Schema.String),
  reads: Schema.Array(Schema.String),
  writes: Schema.Array(Schema.String),
  outputSchema: Schema.optional(Schema.String),
  execution: Schema.optional(HarnessExecution),
  limits: Schema.Struct({maxTurns: Schema.Number, timeoutSeconds: Schema.Number, maxBudgetUsd: Schema.optional(Schema.Number)}),
  retry: Schema.Struct({attempts: Schema.Number, backoffSeconds: Schema.Number, onExhausted: Schema.Literals(["fail", "skip", "route"]), routeTo: Schema.optional(Schema.String)}),
  effects: Schema.Literals(["none", "workspace", "external"]),
  checkpointBefore: Schema.Boolean,
});

export const GraphFanOut = Schema.Struct({
  overChannel: Schema.String,
  node: Schema.String,
  maxConcurrency: Schema.Number,
  toleratedFailurePercent: Schema.Number,
  join: Schema.String,
});

export const HarnessGraph = Schema.Struct({
  entry: Schema.String,
  nodes: Schema.Array(GraphNode),
  edges: Schema.Array(Schema.Struct({from: Schema.String, to: Schema.String, when: Schema.optional(EdgePredicate)})),
  channels: Schema.Array(GraphChannel),
  fanOuts: Schema.Array(GraphFanOut),
  limits: Schema.Struct({maxSteps: Schema.Number, maxWallClockSeconds: Schema.Number, maxBudgetUsd: Schema.optional(Schema.Number)}),
});
```

Two corrections from review (`revised`). A channel that declares only a name and a merge rule is not typed; it needs a value schema, and `outputSchema` needs either an embedded schema or a registry it resolves against. Command nodes need a command definition and gate nodes need a decision contract, or they are labels. And a node must reference an existing lead or specialist and inherit that agent's prompt, tools and settings, with explicit overrides, so the workflow never becomes a second, conflicting place to configure agents. The implementation in section 17 embeds a closed field-type schema per step for this reason.

Four fields carry most of the weight. `outputSchema` turns a handoff into a contract. `effects` states whether a node touches the workspace or the outside world, which is what decides retry safety. `checkpointBefore` binds the node to the existing shadow-git machinery. `toleratedFailurePercent` makes fan-in failure a policy instead of a hard-coded rule; Step Functions exposes exactly this control with a default of zero, which is Supernova's current behaviour (`documented`).

## 7. Validation is where the value is

A schema that is not validated is a suggestion. These rules extend `validateHarness` and are the point at which configuration becomes a contract (`proposed`).

1. `entry` exists, and every node is reachable from it.
2. Every edge endpoint names a declared node.
3. Every channel a node reads is declared and is written on *every* path that reaches the reader, not merely by some possible predecessor (`revised`). In a sequential workflow that reduces to "the producer precedes the reader".
4. The channel that a fan-out's branches *write into* has merge `append` or `concat`; `replace` is a silent data-loss bug under concurrency. The rule concerns the merged output, not the channel the fan-out iterates over (`revised`).
5. Any node with `effects` other than `none` must set `checkpointBefore`.
6. Any node with `effects: "external"` must be preceded by a `gate` node, or carry an idempotency key.
7. `limits.maxSteps` is at least the node count, and bounds every cycle. LangGraph's equivalent defaults to 25 and raises on breach (`documented`).
8. A node whose `retry.attempts` exceeds one and whose `effects` is `external` is rejected outright. Retrying an irreversible effect is not a retry.

Rule 8 is the one most systems learn the hard way.

## 8. Durability: from receipt to resume

The store already does the hard parts: per-chat directories, `0o600` files, write-to-temp-then-rename, and a pid liveness check that converts orphans to `interrupted` (`repo`). What is missing is the thing being written.

```ts
export const GraphCursor = Schema.Struct({
  completed: Schema.Array(Schema.Struct({nodeId: Schema.String, attempt: Schema.Number, at: Schema.String, outputDigest: Schema.String})),
  channels: Schema.Record(Schema.String, Schema.Unknown),
  pending: Schema.optional(Schema.Struct({nodeId: Schema.String, kind: Schema.Literals(["approval", "input"]), payload: Schema.Unknown})),
  workspaceCheckpointId: Schema.optional(Schema.String),
});
```

That sketch is too small (`revised`). A completed list, a channel map and one pending item cannot represent parallel branches, repeated loop iterations, several approvals, or an action interrupted mid-flight. Resume needs the frozen workflow version it is executing, one execution record per step attempt, what is scheduled and what is running, join progress, and the limits remaining. The receipt store is useful groundwork; adding a cursor alone does not make it a durable scheduler. The implemented model in section 17 freezes the workflow and records one execution per step, and stops there because the first release is sequential.

Write the state at every step boundary through the existing atomic path. Three consequences follow.

- **`interrupted` becomes actionable.** Resume replays completed nodes from the cursor and re-runs only the node that was in flight. The Workflow tool in Claude Code resumes this way, with one caveat: a failed node re-runs itself *and everything after it* (`documented`, [workflows](https://code.claude.com/docs/en/workflows)).
- **That caveat is not yet survivable here, and the first draft of this note overstated it** (`revised`). Re-running a node that edited files is safe only if the tree is first returned to the state the node started from. The checkpoint system can do that in principle, but its own documentation lists a process crash leaving a partially restored workspace, no startup recovery journal, no cross-process lock, and agent tool writes not serialised against checkpoint operations ([checkpoint-system.md, accepted limitations](../checkpoint-system.md)). Restoration also needs both a current and a target checkpoint, not the single id sketched above. And specialists today run in separate conversations but the same project folder (the worker session in [harness-runtime.ts](../../packages/agent-runtime/src/layers/harnesses/internal/harness-runtime.ts) is created with the project path as its working directory), so parallel coding steps need isolated worktrees or a serialised writer *before* any automatic retry is safe. The advantage over the frameworks is real but it is potential, not present.
- **Replay has rules.** Durable execution forbids nondeterminism in the orchestrating code: clocks, random values, ambient reads, and unjournaled I/O. Every such effect belongs behind a node boundary, which is the same discipline Temporal enforces by separating workflows from activities (`documented`).

## 9. Gates and irreversible effects

A `gate` node suspends the run and persists `pending`, then resumes on a decision. Because the wait is state and not a held process, it can last days at no cost.

For anything irreversible, persist the intent before acting, and give the logical action a persistent identifier that is reused across retries of the same step in the same run, with a new identifier only for a new loop iteration or a new run. The first draft of this note put `attempt` into the key, which changes the key on every retry and lets the same external action happen twice; that was wrong and is corrected here (`revised`). Three things must stay separate: an approval decides whether the action may happen, the action identifier decides whether a retry is the same action, and output validation decides whether the result is well formed. None substitutes for another, a workspace snapshot cannot undo a remote action, and all three need runtime enforcement around the actual tools rather than a promise in a prompt. For Science workflows in particular, schema-valid output can still contain fabricated findings or citations, so evidence verification is its own step after output validation. One refinement worth adopting: verify the *intent* and not only the argument hash on resume, because arguments can hash identically while the surrounding plan has changed. This is the semantic-rollback failure the ACRFence work describes for checkpoint-restore systems.

Classify failures before reacting to them, and never use one policy for both kinds:

| Failure | Response |
|---|---|
| Rate limit with `Retry-After` | Honour the header, then exponential backoff with jitter |
| Timeout, 5xx | Bounded retry, three attempts |
| 4xx, missing file, bad tool arguments | Do not retry. Re-plan with the error as input |
| Unknown | Stop and escalate rather than spend the retry budget |

The distinction that matters: a transient failure means retry the same call, and a semantic failure means the plan was wrong, so retrying it is waste.

## 10. Cost and context per node

Multi-agent structures are expensive and the multiplier is documented, not speculative: agents consume roughly four times the tokens of a chat turn, and multi-agent systems roughly fifteen times (`measured`, Anthropic's [multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system)). The same source names the failure modes, each of which maps to a control in section 6: fifty subagents spawned for a trivial query (`limits.maxSteps`), subagents duplicating identical work from vague instructions (`reads` and `outputSchema`), and no cheap rollback for stateful multi-step execution (`checkpointBefore`).

Four controls, in descending order of effect.

- **Tier the model per node.** `HarnessAgent.execution` already exists; the node-level override in section 6 lets one agent run cheap when classifying and strong when planning. Route the bulk of nodes to the cheap tier and reserve the frontier tier for planning and review.
- **Order the prompt so the cache holds.** The cache hierarchy is tools, then system, then messages, and a change at any level invalidates everything after it (`documented`, [prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)). Shared instructions, project instructions, role prompt and tool definitions belong in the stable prefix; only the task and the channel values should vary. Confirm it works by reading `cache_read_input_tokens`, because a prefix below the minimum cacheable length silently does not cache at all.
- **Budget per node, not per run.** `maxBudgetUsd` on a node stops one runaway branch from consuming the run's allowance.
- **Keep orchestration out of the context window.** The Workflow tool's design point is that intermediate results live in script variables rather than the conversation (`documented`). The same principle applied to MCP tool output took one measured workflow from about 150,000 tokens to about 2,000 (`measured`, [code execution with MCP](https://www.anthropic.com/engineering/code-execution-with-mcp)).

## 11. The code graph layer

Evidence here is weaker than vendor marketing suggests, and the honest reading is narrow.

- **Structural graphs help localisation.** LocAgent, a graph-guided agent over file, function and class nodes with imports, calls and inherits edges, reports 94.16% file-level Acc@5 and 77.37% function-level Acc@10 on SWE-Bench-Lite localisation (`measured`, [LocAgent](https://arxiv.org/abs/2503.09089)). That is a localisation benchmark, not end-to-end patch success.
- **Generic GraphRAG is not a free win, and the evidence is not about code.** One study finds graph retrieval raises recall while lowering relevance, producing noisier context that can hurt the generation that follows (`measured`, [arXiv 2604.09666](https://arxiv.org/pdf/2604.09666)). It evaluates question-answering retrieval; it does not establish that code graphs harm coding performance, and the first draft of this note implied more than that (`revised`).
- **Token-saving claims deserve hostility.** A compression tool marketed at 60 to 90% savings produced a 7.6% cost *increase* across 425 trials once multi-turn accumulation and tool-call overhead were counted. One graph tool reporting roughly ten times fewer tokens also reported lower answer quality, 83% against a 92% file-exploring baseline (`measured`). No controlled ablation isolating "code graph versus agentic grep" on end-to-end resolution was found.
- **Deterministic graphs are the exception.** Build-graph queries such as `bazel query 'tests(rdeps(//..., set(//target)))'` or `nx affected` are exact, cheap, and do not depend on an LLM having extracted anything. For scoping a change and selecting tests, use these first.

A defensible minimum: a tree-sitter-parsed graph of files, symbols, imports and calls in one SQLite file, rebuilt incrementally on content-hash diff, exposed as three or four tools such as find-symbol, find-references and trace-callers. The load-bearing edges are defines and references; everything richer is optional until a concrete query class justifies it. Turborepo already gives this repository the deterministic half through `--filter` on the task graph (`repo`).

Two rules. **A stale graph is worse than no graph**, because it gives confident answers that no longer match the tree. And the payoff threshold is a design judgment rather than a measurement: below a few hundred thousand lines, tree-sitter tags plus grep are likely cheaper and fresher than any index (`revised`). A code graph is optional for this product and must never become a prerequisite for Science workflows.

## 12. Observability

One trace per run, one span per node, named by the OpenTelemetry GenAI conventions: `gen_ai.invoke_workflow`, `gen_ai.invoke_agent`, `gen_ai.execute_tool`, carrying `gen_ai.provider.name`, `gen_ai.request.model`, and the input and output token counts. The conventions are still marked experimental, so pin the version rather than tracking the tip (`documented`).

Per node, record the node id, attempt, resolved model, the channels read and written, token and cost counts, the workspace checkpoint id, and the verdict. Record digests of inputs and outputs rather than the text. Prompts and tool output routinely contain credentials and personal data, and an observability backend is the wrong place to discover that.

The existing `HarnessRun.events` array is the natural carrier for a node-level timeline, and `HarnessRuntimeContext` already captures the effective prompt per chat (`repo`).

## 13. Security

A coding graph reads attacker-influenced text by design: issue bodies, pull request descriptions, review comments, dependency metadata, and repository files. Indirect prompt injection through these channels is documented in the wild, including a public issue leading to environment exfiltration and a pushed commit, and in work on injection through CI workflows and coding editors.

Three controls that fit the model in section 6.

1. **Per-node least privilege.** `HarnessAgent.tools` already narrows the tool set; a node that summarises an issue has no reason to hold write or network tools. In Claude Code terms, `PreToolUse` is the only hook that can hard-deny or rewrite a call, and it runs outside the model's context at no token cost (`documented`).
2. **Treat repository text as data.** Content read by a node is input to that node, never instruction to the graph. Edge predicates over typed channels, rather than model-chosen routing, are what make this enforceable.
3. **Isolate the tree and scope the credential.** A worktree or container per concurrent node, short-lived tokens rather than session-lifetime ones, and an egress allowlist whenever a node holds a credential.

## 14. Evaluation

Evaluate nodes and runs separately, because they fail differently. A per-node eval is a fixed input channel set, a fixed expected output shape, and an assertion; it is fast enough for CI and it attributes failure precisely. An end-to-end eval is faithful but opaque about which node broke.

Three cautions. Model judges carry position and length bias and are sensitive to paraphrase, so validate the rubric against hand-labelled cases before trusting it. Variance is large enough that a two to three point difference on a handful of tasks means nothing; run several seeds and use a paired test. And public benchmarks have moved on, with SWE-bench Verified saturating while harder suites such as Terminal-Bench 2.0 keep frontier agents well below two thirds on 89 curated tasks (`measured`).

## 15. Staged adoption

Each stage is shippable alone and leaves the harness working.

| Stage | Change | Why first |
|---|---|---|
| 1 | Typed channels and `outputSchema` on nodes; keep sequential execution | Fixes the section 4 defect without touching the engine |
| 2 | `GraphCursor` written at step boundaries; `interrupted` runs resume | Reuses the existing store; makes long runs survivable |
| 3 | Edges with predicates, gate nodes, `toleratedFailurePercent` on fan-in | Real branching and real approvals |
| 4 | Per-node budgets, OTel spans, code-graph tools | Cost and navigation, once the structure is stable |

Nothing here requires adopting a framework. The companion catalogue's conclusion stands: declare the graph yourself and keep the durability in your own store, because Supernova already owns the two things the frameworks cannot give it, the Pi session tree and the workspace checkpoints.

## 16. What not to build

- **A second autonomy layer.** Anthropic's guidance is to add structure only when it demonstrably improves outcomes, and to prefer a single well-built call with good context over a graph (`documented`, [building effective agents](https://www.anthropic.com/engineering/building-effective-agents)).
- **Model-chosen routing as the default.** It is the right tool when the decision space cannot be enumerated, and the wrong default everywhere else, because it is not replayable and it destroys failure attribution.
- **Deep nesting.** Unbounded delegation multiplies cost without adding capability. The existing head, lead, specialist hierarchy is already two levels of delegation; treating that as the ceiling is a design judgment, not a measured limit (`revised`).
- **A general graph editor before the graph is typed.** The current editor faithfully renders a twelve-item list. A visual editor over an untyped model would make the untyped model permanent.
- **A full code property graph.** Statement and expression granularity is where index size explodes; it earns its cost for vulnerability dataflow, not for navigation.

## 17. First release, as implemented

Scope chosen on the reviewer's recommendation: one named sequential workflow with validated handoffs, saved step results and a visible run timeline, before any branching, fan-out or automatic retry.

| Area | What lives there |
|---|---|
| Agents | Main orchestrator, project leads and specialist definitions, unchanged |
| Workflows | Multiple named workflows per harness, shared across its projects; a step references an existing agent and inherits its settings with explicit overrides |
| Chat and workflow run | Actual steps, working agents, inputs, validated outputs, failures, spend and the resume instruction, beneath the owning chat |
| Memory | Unchanged and kept distinct from run state |
| Code navigation | Not built; optional for the Coding harness only |

What the implementation guarantees, each backed by a test: malformed output stops at its source with the failure kind recorded and the cursor left on that step; a resumed run reuses the same run id, never re-executes a completed step, and feeds completed outputs to later reads; a failed step with external effects is not rerun without an explicit override, and when rerun keeps its action identifier with the attempt incremented; every step's output is validated locally with the same schema on every provider; the turn and time limits steer the worker to write up one turn before aborting instead of truncating silently; and a configuration whose instructions cannot fit the model window is refused before a session is created.

What it does not do yet, deliberately: parallel branches, conditional edges, bounded revision loops, automatic retry of any failure, workspace isolation per step, and evidence verification as a distinct step. Each of those is gated on the guarantees above holding in use.

## Evidence and limits

- Claims about this repository were verified by reading the files cited, at commit `4104c99`. No behaviour was executed or benchmarked.
- Framework and API behaviour is taken from first-party documentation on the snapshot date. Versions and prices move; pin before implementing.
- Benchmark numbers are reported as published. Localisation benchmarks do not predict end-to-end patch success, and single-number token-saving claims from tool vendors were treated as unverified unless a study reproduced them.
- Research for this note was gathered by five parallel agents. One of them returned fabricated performance figures for per-task time and cost, which were withdrawn when challenged and are not included here. That is itself a finding about unsupervised research fan-out: a node that cannot cite must be made to say so, which is the argument for `outputSchema` in section 6.
- Sections 6 through 15 are design proposals. They are not shipped behaviour and no source endorses them.

## Primary sources

- [LangGraph durable execution](https://docs.langchain.com/oss/python/langgraph/durable-execution), [persistence](https://docs.langchain.com/oss/python/langgraph/persistence), [interrupts](https://docs.langchain.com/oss/python/langgraph/interrupts)
- [Temporal: dynamic AI agents](https://temporal.io/blog/of-course-you-can-build-dynamic-ai-agents-with-temporal), [saga pattern](https://docs.temporal.io/design-patterns/saga-pattern)
- [AWS Step Functions tolerated failure threshold](https://docs.aws.amazon.com/step-functions/latest/dg/maprun-fail-threshold.html)
- [Google ADK workflow agents](https://google.github.io/adk-docs/agents/custom-agents/)
- [Claude Code workflows](https://code.claude.com/docs/en/workflows), [subagents](https://code.claude.com/docs/en/agent-sdk/subagents), [hooks](https://code.claude.com/docs/en/hooks), [worktrees](https://code.claude.com/docs/en/worktrees)
- [Anthropic: building effective agents](https://www.anthropic.com/engineering/building-effective-agents), [multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system), [effective context engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents), [code execution with MCP](https://www.anthropic.com/engineering/code-execution-with-mcp)
- [Prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching), [structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs), [batch processing](https://platform.claude.com/docs/en/build-with-claude/batch-processing)
- [LocAgent](https://arxiv.org/abs/2503.09089), [Do we still need GraphRAG](https://arxiv.org/pdf/2604.09666), [Aider repo map](https://aider.chat/2023/10/22/repomap.html), [SCIP](https://sourcegraph.com/blog/announcing-scip)
- [Bazel query](https://bazel.build/query/language), [Nx affected](https://nx.dev/docs/features/ci-features/affected)
- [OpenTelemetry GenAI semantic conventions](https://opentelemetry.io/docs/specs/semconv/gen-ai/)
- [SWE-agent trajectories](https://github.com/SWE-agent/SWE-agent/blob/main/docs/usage/trajectories.md), [Aider architect mode](https://aider.chat/2024/09/26/architect.html), [Terminal-Bench](https://github.com/laude-institute/terminal-bench)
- [ACRFence: semantic rollback in agent checkpoint-restore](https://eunomia.dev/blog/2026/05/21/acrfence-preventing-semantic-rollback-attacks-in-agent-checkpoint-restore/)
