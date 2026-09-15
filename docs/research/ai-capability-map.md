# AI capabilities worth building into Supernova

Research snapshot: 2026-09-11. A ranked, costed map of AI capabilities this product does not have, filtered by what its actual architecture can carry. Companion to [graph-workflow-engineering.md](./graph-workflow-engineering.md), which covers orchestration; this note covers product capability.

Claim labels are the same as that note.

| Label | Meaning |
|---|---|
| `repo` | Verified by reading this repository at commit `4104c99`. Path given. |
| `documented` | Stated in first-party documentation, linked inline. |
| `measured` | A number from a named study. Source and weakness both given. |
| `proposed` | A design proposal. Not shipped, and not endorsed by any source. |

## 1. What already exists, and is therefore not proposed here

All `repo`. Several capabilities that competitor surveys flag as gaps are already present, and recommending them would be wrong.

| Capability | Where |
|---|---|
| Automatic session titles, three to six words, from the first user message | [session-title-generator.ts](../../packages/agent-runtime/src/layers/session-runtime/lib/session-title-generator.ts) |
| Live context-usage indicator in the composer | [session-context-indicator.tsx](../../packages/web/src/features/sessions/components/composer/session-context-indicator.tsx) |
| Explicit compaction | [compact-session.ts](../../packages/contracts/src/session-runtime/procedures/compact-session.ts) |
| Workspace checkpoints with snapshot, restore, conflict detection | [checkpoint-system.md](../checkpoint-system.md) |
| Diff rendering, attachments, composer file references and suggestions | `packages/web/src/features/sessions/` |
| Three-level `AGENTS.md` hierarchy: user, repository, project | [pi-sdk.test.ts:101](../../packages/agent-runtime/tests/integration/layers/pi-sdk.test.ts#L101) |
| Harness configuration: specialist agents, skills, context policy, execution limits | [harness.ts](../../packages/contracts/src/harnesses/schemas/harness.ts) |
| Durable run receipts per delegation | [harness-run-store.ts](../../packages/agent-runtime/src/layers/harnesses/internal/harness-run-store.ts) |

Cross-tool instruction files are worth singling out. `AGENTS.md` is read at three levels here, so the common complaint that a client ignores the convention does not apply.

## 2. Constraints that decide what is buildable

These are the facts that eliminate most of the obvious suggestions, and they are specific to this repository.

- **The dev and production runtimes differ.** `apps/server` runs `bun --watch src/cli.ts` in development and `node dist/cli.js` in production (`repo`). Native addons built with node-gyp do not run under Bun as of 2026, while N-API and napi-rs addons generally do (`documented`). A native dependency can therefore pass in the shipped app and break the dev loop. Prefer napi-rs packages, or isolate native code in a Node subprocess.
- **There are currently zero native modules** in the workspace (`repo`). The first one carries the whole setup cost, not an incremental one.
- **Electron raises that cost further.** Every `.node` file must be rebuilt against Electron's ABI, unpacked from the archive, and individually signed, and third-party-signed addons typically need the library-validation entitlement disabled or they fail at launch with no useful error (`documented`). Universal binaries double the payload, so arm64-only is the pragmatic default in 2026.
- **The server owns all native capability and the web package must not assume filesystem access** ([AGENTS.md](../../AGENTS.md), `repo`). Every capability below belongs server-side with a contract addition, never in the client.
- **Providers are generic** in the contract, carrying only id, name, auth types and connection state (`repo`). Anything provider-specific needs a capability check rather than an assumption.
- **The stated priority order is performance, then reliability, then predictable behaviour under failure** ([AGENTS.md](../../AGENTS.md), `repo`). That order rules out capabilities whose value is speculative but whose cost is a permanent latency or packaging tax.

## 2a. One unrelated finding, cheap to fix

Claude Code does not read `AGENTS.md`. The documentation states that it reads `CLAUDE.md` instead, and that sharing between the two is done with an `@AGENTS.md` import at the top of `CLAUDE.md`, or with a symlink (`documented`, [memory](https://code.claude.com/docs/en/memory.md)). This repository has `AGENTS.md` at the root and no `CLAUDE.md` (`repo`), so anyone using Claude Code here gets none of the architecture rules, stack constraints or priority ordering that file sets out.

This is distinct from the product behaviour in section 1: the Pi runtime this app embeds does read `AGENTS.md` at three levels. Both facts are true, and they concern different tools.

A one-line `CLAUDE.md` containing `@AGENTS.md` fixes it. Worth noting alongside it: path-scoped rules are a real documented mechanism, a `.claude/rules/` directory whose markdown files carry an optional `paths` frontmatter array of globs and load only when a matching file is read (`documented`). For a monorepo with distinct web, server, desktop and runtime rules, that is a better fit than one growing root file.

## 3. The ranked list

### Tier A: free or nearly free, and clearly useful

**A1. Stream tool-call arguments as they are generated.** Setting `eager_input_streaming: true` on a tool definition makes the model's tool-call JSON arrive incrementally rather than appearing fully formed, at no extra cost (`documented`). This product already renders tool calls and already treats streaming quality as a priority, and it already solves the hard half of the problem: [message-segments.ts](../../packages/web/src/features/sessions/lib/streaming/message-segments.ts) only promotes complete paragraphs to Markdown and renders the changing tail as text (`repo`). The same discipline applies to partial JSON, which is not valid JSON until the final token.

**A2. Make prompt-cache health visible.** Caching is ordered tools, then system, then messages, and any byte change at one level invalidates everything after it; writes cost 1.25 times base input at the five-minute time-to-live or twice at one hour, reads cost a tenth (`documented`). Two consequences deserve to be surfaced rather than assumed. A prefix below the model's minimum, between 512 and 4096 tokens, silently does not cache at all. And the cache is scoped per model, so switching models mid-session forfeits the whole prefix. Read `usage.cache_read_input_tokens` and show it; a zero on a repeat turn is a bug, not a statistic.

**A3. Pre-flight token and cost estimate in the composer.** The token counting endpoint is free and rate-limited separately from message creation (`documented`). The context indicator already shows pressure after the fact; counting before sending turns it into a decision the user can act on.

**A4. Search session content, not just titles.** Today search is a case-insensitive substring test against the title alone, at [search-sessions-dialog.tsx:83](../../packages/web/src/features/projects/components/search-sessions-dialog.tsx#L83) (`repo`). Message text, tool calls and diffs are never searched, so a session is findable only when its generated six-word title happens to contain the term. The turn model is already well shaped for indexing, with assistant, reasoning, tool and compaction events as distinct cases (`repo`): index assistant text and tool names, skip reasoning. Start with full-text search and add vectors only if full-text proves insufficient, because exact identifier matching matters more in code than semantic similarity, and hybrid retrieval outperforms either alone (`documented`). Notably, no surveyed competitor ships conversation search well, and some ship none at all.

**A5. Account for spend.** `SessionContextUsage` carries only `usedTokens` and `contextWindow` (`repo`). There is no input and output split, no per-turn usage, and no cost, so no budget feature can be built on today's contract. The delegation records in the run store are the natural place to attribute subagent spend. This is a contract change first and a UI change second.

**A6. Classify why a run failed.** A failed run stores a free-text `error` and a status (`repo`), so the UI cannot distinguish causes that need different responses. A small closed set covers the ground: tool error, context exhausted, permission denied, wrong plan, model refusal, user interrupt, environmental error. Derive most of it from signals already in hand, such as the status, the exhausted context, and the denied permission, and reach for a model only for the residue.

### Tier B: real value, real work

**B7. An editable plan artifact before execution.** A structured plan the user can edit before the agent acts is the most direct remedy for an agent proceeding confidently in the wrong direction, and several products now ship it as a first-class document rather than a chat message (`documented`). It composes with the graph work: a plan is the state a gate node approves.

**B8. Grouped diff review.** Order the hunks of an agent-authored change by intent, group related edits, and say which one deserves attention first. This upgrades the existing diff view rather than replacing it. Note the honest limit below on what a model pass can be claimed to catch.

**B9. A semantic code index for the agent.** Hybrid keyword and vector retrieval with a reranker, served as a tool. Costs are real and bounded: a TypeScript compiler-API index of a 1.23-million-line repository took 705.6 seconds on a 32-core Xeon, while a 147,000-line repository took 35 seconds (`measured`, [arXiv 2604.18413](https://arxiv.org/html/2604.18413v1)). For this repository's size, tree-sitter tags plus grep remain cheaper and fresher. Build the index for the user's repositories, not for this one.

**B10. A fleet view for concurrent runs.** Once more than a few runs are in flight, a board showing which are running, blocked on approval, or finished becomes the primary surface. The run store already has the data and a liveness check that marks orphans (`repo`).

**B11. True mid-run steering.** Delivering a user message to a running agent before the current tool call completes, rather than queuing it until the turn ends. At least one product shipped this in 2026 and it remains a genuine differentiator (`documented`). The session runtime's one-mutating-command-at-a-time rule is deliberate (`repo`), so this needs a separate control channel rather than a relaxation of that rule.

**B12. Cross-session project memory.** A file-based memory tool exists at the API level, and Anthropic reports 84% token savings and a 39% performance gain on a hundred-turn benchmark when combined with context editing (`measured`, [memory tool](https://platform.claude.com/docs/en/agents-and-tools/tool-use/memory-tool)). Treat the number as vendor-reported on one benchmark. The honest caution from the wider literature is that staleness and contradiction between memories are unsolved, so scope it to durable project conventions and make every entry visible and deletable.

**B13. Deferred tool loading.** Marking tools `defer_loading: true` behind a tool-search tool stops every definition from being loaded each turn (`documented`). This matters only once a user wires up many servers, at which point it matters a great deal, since tool definitions are re-sent on every request.

### Tier C: situational

**C14. Dictation.** Cloud transcription runs about $0.003 per minute, and a local `base.en` model clears ten times real time on Apple Silicon at 142MB on disk (`documented`). Cheap and private, but not a workflow driver.

**C15. Explaining tool and terminal output.** A scoped explanation of one failing block, using the surrounding context. Low effort given the timeline already renders these, and it applies to every user.

**C16. A local small model for the small jobs.** Titling, failure classification and search ranking are all short, structured tasks that a quantized sub-one-billion-parameter model handles offline with grammar-constrained output. Weigh it against section 2: this is the capability that forces the first native module, and Apple's own frameworks are Swift-only, reachable from Node solely through a signed sidecar binary, with the on-device model capped at 4096 tokens total (`documented`).

**C17. Visual verification walkthroughs.** Screenshots or a recording of the agent exercising the change. Strong for user-interface work and irrelevant elsewhere.

## 4. What not to build, and why

- **A self-review gate sold as a defect catcher.** No study was found showing that a model reviewing its own diff catches defects that lint, typecheck and tests do not already catch. The closest work shows model critics outperforming human reviewers but never measures the delta against deterministic checks (`measured`, [LLM critics](https://arxiv.org/abs/2407.00215)). This repository's CI already runs prettier, lint, typecheck, test and build (`repo`). Build the pass for triage and ordering, which is B8, and do not claim it finds bugs.
- **Generic commit-message generation.** Ubiquitous and close to cosmetic. It earns its place only when grounded in the repository's own conventions, and this repository has strong ones already.
- **An automatic model router, for now.** Published routing results are encouraging but reported against chat benchmarks rather than coding work, and secondary sources were the only ones available. Weigh that against a concrete local cost: the prompt cache is scoped per model, so routing mid-session throws away the cached prefix that A2 exists to protect. Measure before routing.
- **Tab or next-edit prediction.** The highest-adoption feature in the category and the wrong product for it. There is no editor pane here.
- **Event-triggered self-scheduling agents.** Novel, unproven at scale, and an obvious source of unwanted work.
- **A code property graph.** Statement-level granularity is where index size explodes, and it earns its cost for vulnerability dataflow rather than navigation.
- **`AGENTS.md` support in the product.** Already present at three levels, user, repository and project. The separate gap in section 2a concerns Claude Code reading this repository, not the product reading a user's.

## 5. Cost model and the traps

Prices per million tokens, as published on the snapshot date (`documented`). Pin these before building anything that depends on them.

| Model | Input | Output |
|---|---|---|
| Opus 5 | $5 | $25 |
| Sonnet 5 | $2 | $10 |
| Haiku 4.5 | $1 | $5 |
| Fable 5.1 | $10 | $50 |

Four traps worth encoding as tests rather than comments.

1. **The cache can silently not work.** Below the model's minimum prefix length there is no cache and no error. Assert on `cache_read_input_tokens` in a test.
2. **The cache is per model.** Any feature that switches models within a session pays full price for the next prefix.
3. **Documents can bill twice.** A PDF sent to Anthropic contributes both extracted text and a rendered page image, around 50 to 60 percent more tokens than the same content as text. Extract first when the content is textual.
4. **Crossing a context tier can re-rate a whole request.** On at least one other provider, passing 200,000 tokens re-prices the entire request rather than the overage, so context growth can double cost invisibly.

Batch processing is half price and returns results out of order keyed by a caller-supplied id (`documented`). It has no place in an interactive turn and is the right tool for background indexing and evaluation runs.

## 6. Suggested order

| Step | Contents | Why here |
|---|---|---|
| 1 | A1, A2, A3 | Free or nearly free, and each is a small, self-contained change |
| 2 | A5, A6 | Contract additions that every later feature needs to exist first |
| 3 | A4 | The largest single user-visible gap, and it needs A5's indexing discipline |
| 4 | B7, B10 | Surfaces, once the data behind them is recorded |
| 5 | B9, B11, B12 | Each is a subsystem, not a feature |

## 7. Evidence and limits

- Repository claims were verified by reading the files cited, at commit `4104c99`. Nothing was executed or benchmarked.
- Prices, beta identifiers and parameter names are from first-party documentation on the snapshot date and will move.
- Research was gathered by six parallel agents, and three of their outputs were challenged for unsourced statistics. Two agents withdrew claims entirely, including invented adoption rates, debugging-time savings and compression ratios. One agent invented a configuration-file schema outright. Those claims are not in this note, and the episode is the reason every number here carries a label. Unsupervised research fan-out produces confident fabrication at a material rate, and the only defence found to work was demanding provenance claim by claim.
- The single figure that survived challenge with a verified primary source is the merge-conflict rate for agent-authored pull requests: 27.67% across more than 142,000 pull requests in more than 59,000 repositories (`measured`, [AgenticFlict](https://arxiv.org/abs/2604.03551)). The same paper reports no comparable human baseline from the same repositories, so the rate is usable and the comparison is not.
- Sections 3 through 6 are proposals. No source endorses them, and the ordering reflects this repository's stated priorities rather than any published ranking.

## Primary sources

- [Prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching), [token counting](https://platform.claude.com/docs/en/build-with-claude/token-counting), [structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs), [batch processing](https://platform.claude.com/docs/en/build-with-claude/batch-processing), [memory tool](https://platform.claude.com/docs/en/agents-and-tools/tool-use/memory-tool), [advanced tool use](https://www.anthropic.com/engineering/advanced-tool-use), [embeddings guidance](https://platform.claude.com/docs/en/build-with-claude/embeddings)
- [Voyage pricing and models](https://docs.voyageai.com/docs/pricing)
- [TypeScript repository indexing for code agent retrieval](https://arxiv.org/html/2604.18413v1)
- [AgenticFlict: merge conflicts in agent-authored pull requests](https://arxiv.org/abs/2604.03551)
- [Automating low-risk code review at Meta](https://arxiv.org/pdf/2605.30208)
- [LLM critics help catch LLM bugs](https://arxiv.org/abs/2407.00215)
- [node-llama-cpp](https://github.com/withcatai/node-llama-cpp), [sqlite-vec in JavaScript](https://alexgarcia.xyz/sqlite-vec/js.html), [hybrid full-text and vector search in SQLite](https://simonwillison.net/2024/Oct/4/hybrid-full-text-search-and-vector-search-with-sqlite/)
- [Apple Foundation Models context window](https://developer.apple.com/documentation/technotes/tn3193-managing-the-on-device-foundation-model-s-context-window), [EmbeddingGemma model card](https://ai.google.dev/gemma/docs/embeddinggemma/model_card)
- [@electron/rebuild](https://github.com/electron/rebuild), [electron-builder notarization](https://www.electron.build/docs/features/code-signing/notarization/), [electron/universal](https://github.com/electron/universal)
