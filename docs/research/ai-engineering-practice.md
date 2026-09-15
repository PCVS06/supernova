# Engineering practice: context, loops, prompts, tools

Research snapshot: 2026-09-11. What the measured evidence says about using models well, and what that implies for the dials this harness already exposes. Third of three companion notes, after [graph-workflow-engineering.md](./graph-workflow-engineering.md) and [ai-capability-map.md](./ai-capability-map.md).

| Label | Meaning |
|---|---|
| `repo` | Verified by reading this repository at commit `4104c99`. Path given. |
| `documented` | Stated in first-party documentation, linked inline. |
| `measured` | A named study. The population and metric are stated, and the weakness too. |
| `proposed` | A design proposal. No source endorses it. |

A warning that shapes the whole note. Most widely circulated numbers in this field could not be traced to a study. Section 8 lists the ones to stop repeating, including several that sound authoritative and are not. Where no measurement exists, this note says so rather than estimating, because "no evidence found" is a usable answer and a plausible number is not.

## 1. The dials that already exist

All `repo`, from [harness-config.ts](../../packages/agent-runtime/src/layers/harnesses/lib/harness-config.ts).

| Dial | Default | Range | Enforcement |
|---|---|---|---|
| `loop.maxTurns` | 40 | 1 to 100 | `ctx.abort()` at `turn_start` |
| `loop.timeoutSeconds` | 900 | 10 to 3600 | `ctx.abort()` on a timer from `agent_start` |
| `context.reserveTokens` | 16384 | 1024 to 100000 | Passed to Pi's compaction settings |
| `context.keepRecentTokens` | 20000 | 1024 to 100000 | Same |
| `context.autoCompaction` | true | — | Same |
| `context.files` | none | at most 20, each at most 128000 bytes | Read and prefixed at load |
| `execution.effort` | unset | off to max | Checked against model support at runtime |

The dials are good. The defaults and the enforcement are where the evidence disagrees with the current choices.

## 2. Context: what is actually measured

**Length alone degrades quality, with retrieval held perfect.** The strongest result available. Across five models on mathematics, question answering and coding, degradation ranged from 13.9% to 85% when irrelevant tokens were masked so retrieval could not be the cause, and entirely within each model's advertised limit (`measured`, [arXiv 2510.05381](https://arxiv.org/abs/2510.05381)). Tokens are not free even when they are correct.

**Needle-in-a-haystack scores are the wrong signal.** Remove the lexical overlap between question and needle and near-perfect scores collapse: eleven of thirteen models fell below half their short-context baseline at 32,000 tokens, and one went from 99.3% to 69.7% (`measured`, [NoLiMa](https://arxiv.org/abs/2502.05167)). A separate suite found only half of models claiming 32,000 tokens sustain quality there (`measured`, [RULER](https://arxiv.org/abs/2404.06654)).

**Conversation shape costs more than length.** Across more than 200,000 simulated conversations on six task types, multi-turn performance fell 39% against single-turn. The decomposition matters more than the headline: a small loss of aptitude and a large rise in *unreliability* (`measured`, [arXiv 2505.06120](https://arxiv.org/abs/2505.06120)). For a product whose unit of work is a long chat, this is the central finding.

**Two results that contradict the intuition.** Shuffled haystacks outperformed logically structured ones across all eighteen models tested (`measured`, [Context Rot](https://www.trychroma.com/research/context-rot)). And in runs exceeding twenty million tokens, performance variance was *not* correlated with context-window capacity, with unrecoverable tangential cycles as the dominant failure (`measured`, [Vending-Bench](https://arxiv.org/abs/2502.15840)). Neither supports the common model of degradation as a smooth function of length.

**Tool output is the prunable part.** Task-aware pruning cut 23% to 54% of tokens on SWE-bench Verified while not hurting and sometimes improving success (`measured`, [SWE-Pruner](https://arxiv.org/abs/2601.16746)). Replacing tool-call round-trips with code execution took one workflow from about 150,000 tokens to about 2,000 (`documented`, first-party, one illustrative case). Clearing stale tool results is described as the lightest-touch compaction available (`documented`).

**What compaction destroys.** Server-side compaction drops every block before its marker, and on some models does not carry prior thinking forward, which makes the written summary the only surviving trace of earlier reasoning (`documented`). No published study measures degradation across *repeated* compactions; the nearest proxy is the multi-turn result above.

The rules that follow: budget tokens as if they cost quality, because they do. Prefer references resolved on demand over pre-loaded content. Prune tool results aggressively and conversation history carefully. Treat the advertised window as a ceiling and measure your own effective length rather than applying a percentage from a blog.

## 3. The instruction budget problem here

Eight places can hold a rule (`repo`). [harness-prompts.ts](../../packages/agent-runtime/src/layers/harnesses/lib/harness-prompts.ts) composes four user-owned layers in order, shared, project, role and context. Pi adds its own engine prompt. Three `AGENTS.md` files load at user, repository and project level.

Nothing checks them against each other, and the evidence says that silence is the problem. Recall of applicable rules drops as the rule count grows, and models rarely acknowledge that instructions conflict at all, so contradictions accumulate quietly instead of failing loudly (`measured`, [Control Illusion](https://arxiv.org/abs/2502.15851), [PRIME](https://arxiv.org/html/2606.22470)).

**Every piece is bounded and the sum is not.** The harness prompt and each agent prompt cap at 200,000 characters. Twenty context files cap at 128,000 bytes each. `context.instructions` has no length validation at all. A configuration that passes `validateHarness` can therefore carry roughly 2.9 megabytes of instruction, on the order of 740,000 tokens, before a single conversation turn (`repo`). Haiku's window is 200,000.

Two proposals (`proposed`). Add an aggregate token budget to `validateHarness`, computed across all layers plus context files, and refuse a configuration that cannot fit the smallest model the harness permits. Add a conflict check that flags the same subject addressed in two layers, surfaced in the harness editor where the author can see it, not at runtime where nobody reads it.

## 4. Loops

**A model critiquing its own work without an external signal makes reasoning worse.** Intrinsic self-correction was tested with the same model as generator, critic and reviser, no oracle and no tool. Accuracy fell on every benchmark and every model (`measured`, [Huang et al., ICLR 2024](https://arxiv.org/pdf/2310.01798)).

| Model | Task | Initial | After two rounds |
|---|---|---|---|
| GPT-3.5 | GSM8K | 75.9% | 74.7% |
| GPT-3.5 | CommonSenseQA | 75.8% | 41.8% |
| GPT-4 | GSM8K | 95.5% | 89.0% |
| GPT-4 | HotpotQA | 49.0% | 43.0% |

A survey then examined the papers claiming the opposite and found them confounded: one weakened its own baseline prompt relative to its refinement prompt, another conditioned correction on ground-truth access, a third used exact match against the answer as its "self" feedback (`measured`, [Kamoi et al., TACL 2024](https://arxiv.org/abs/2406.01297)). The mechanism is narrower than the headline: models are poor at *locating* their own errors and correct them competently once the location is supplied (`measured`, [Tyen et al.](https://arxiv.org/abs/2311.08516)). One study measured a 64.5% blind-spot rate, where a model fails to fix its own error but fixes the identical error attributed to someone else (`measured`, [Self-Correction Bench](https://arxiv.org/pdf/2507.02778)).

**With an external verifier the same loop works.** The well-known jump from 80% to 91% on HumanEval is driven by executing unit tests, not by self-judgment (`measured`, [Reflexion](https://arxiv.org/abs/2303.11366)). Adding generated unit tests to a debugging loop gained 15.07 points (`measured`, [arXiv 2502.01619](https://arxiv.org/abs/2502.01619)).

**Two rounds is most of the benefit.** Execution-grounded repair captured 76% to 95% of its achievable gain within two rounds and fell below 0.6 points per round by rounds three and four (`measured`, [arXiv 2604.10508](https://arxiv.org/html/2604.10508v1)).

**Sampling many candidates needs a real picker.** Coverage scales log-linearly with samples, and with test-execution verification one weaker model went from 15.9% at one sample to 56% at 250, beating a 43% single-shot state of the art (`measured`, [Large Language Monkeys](https://arxiv.org/abs/2407.21787)). Verifier quality decides whether any of that converts: a process-based verifier reached 78.2% against 72.4% for an outcome-based one, and the gap widened as the sample count grew (`measured`, [Lightman et al.](https://arxiv.org/abs/2305.20050)). Worse, optimizing against a proxy raises true quality and then reverses it, so beyond a threshold more samples actively hurt (`measured`, [Gao et al.](https://arxiv.org/abs/2210.10760)). A model-judged best-of-N over code is exactly this failure mode.

**Cap by cost, not by turns.** One widely used harness caps per-task spend rather than step count, explicitly because step counts vary wildly between models (`documented`). A fixed forty turns means something different on every model this product supports.

**The hard abort is the wrong failure.** Both limits here call `ctx.abort()` (`repo`), and silent truncation at a cap is the documented failure mode: the loop stops, partial state is returned, nothing is raised. Proposal (`proposed`): spend the penultimate turn telling the agent its budget is nearly gone and to write down what it has. The work is already lost today; a wind-down turn converts an abort into a handoff.

**One free diagnostic.** Failed trajectories ran 12.6% to 82.5% longer than successful ones, depending on the agent (`measured`, [arXiv 2511.00197](https://arxiv.org/abs/2511.00197)). The run store already records what is needed to compute this live.

## 5. Prompts

**Stop doing these.** Each has a named study behind the negative result.

| Practice | Finding |
|---|---|
| "Think step by step" on a reasoning model | Marginal or no gain for 20% to 80% more time and tokens (`measured`, [arXiv 2506.07142](https://arxiv.org/abs/2506.07142)). First-party guides from three providers now advise against it. |
| Expert personas for accuracy | No significant effect across six models on two hard benchmarks (`measured`, [arXiv 2512.05858](https://arxiv.org/abs/2512.05858)) |
| Politeness | No reliable effect, and the direction is not stable between studies (`measured`, [arXiv 2503.04818](https://arxiv.org/abs/2503.04818)) |
| Tips and threats | No significant effect when tested directly (`measured`, [arXiv 2508.00614](https://arxiv.org/abs/2508.00614)) |
| Emotional appeals | The original gains were measured on 2023-era models and a later replication raised reproducibility concerns |
| Self-consistency on a reasoning model | Redundant with the model's own search. On smaller models majority voting reduced per-problem accuracy on most problems for two families |
| `CRITICAL: You MUST` phrasing | Causes overtriggering on current models, per first-party guidance (`documented`) |

**Keep doing these.** Put long documents first and the instruction last, which first-party testing measured at up to 30% better on complex multi-document input (`documented`), consistent with the position effects in [Lost in the Middle](https://arxiv.org/abs/2307.03172). Say what to do rather than what not to do; compliance drops sharply when an instruction fights the model's default pattern, and negation is the usual way to start that fight (`measured`, [arXiv 2604.07192](https://arxiv.org/abs/2604.07192)). Use a few examples to fix output format, not to teach reasoning. Use the effort dial that already exists instead of writing a reasoning procedure by hand.

**A correction to the companion note.** [graph-workflow-engineering.md](./graph-workflow-engineering.md) recommends an enforced output schema per node. That recommendation stands for contract safety, but it is not free, and the note did not say so. Constraining output to a JSON schema taxes reasoning: a frontier model lost 5.3 points on a mathematics benchmark, smaller models lost 28 to 36 points, and an older small model collapsed from 86.51% to 23.44% (`measured`, [arXiv 2606.09410](https://arxiv.org/abs/2606.09410), [arXiv 2408.02442](https://arxiv.org/abs/2408.02442)). The mitigation recovers 80% to 87% of the loss: let the node reason in free text, then convert to the schema in a second, cheap pass. So a reasoning node should emit prose and a following node should structure it, rather than one node doing both.

**Prompt optimization is now cheaper than hand-tuning.** A reflective optimizer beat reinforcement learning by up to 20% using up to 35 times fewer rollouts, and beat the previous best prompt optimizer by more than 10% (`measured`, [GEPA](https://arxiv.org/abs/2507.19457)). One vendor report found more training examples made things worse, with 20 to 100 beating 500 because the prompts grew 75% longer. Treat that last point as a single unreplicated result, but note it agrees with section 3.

## 6. Tools

The tool surface here is five custom tools on top of Pi's built-ins: web fetch, subagent, workflow, lab agent and the lab view manager (`repo`). That is small, and the measured evidence for tool-count thresholds turned out not to exist, so there is no reason to change the count.

Two things are worth changing. The subagent and workflow tools overlap semantically: the workflow tool is the subagent tool's chain mode over the configured steps with one shared task (`repo`). Distinct names for the same operation invite wrong selection. And filtered tool retrieval is genuinely measured, at 43.13% selection accuracy against 13.62% with everything loaded, alongside a prompt-token saving above 50% (`measured`, [RAG-MCP](https://arxiv.org/abs/2505.03275)), which matters once users attach their own servers.

Three rules that need no number. Write tool errors for the model, carrying the error type, the context, the next action and an explicit prohibition. Enforce permissions at the execution boundary rather than in the prompt, because a model asked not to use something routes around it. Prefer code execution to a chain of tool calls when the work is iterative.

Honest gap: no study was found measuring whether consolidating a frequent multi-call sequence into one composite tool improves task success, as distinct from reducing tokens and approval prompts.

## 7. Measurement, without which none of this is real

**Most of what you will observe is noise.** On a hard agentic benchmark with 64 trials per prompt, about 70% of score variance was randomness rather than a real difference between prompts, and reliability estimates stabilized only after 8 to 16 trials for structured tasks and more than 32 for complex reasoning (`measured`, [arXiv 2512.06710](https://arxiv.org/pdf/2512.06710)). Run-to-run variance exceeds 1.5 points even at temperature zero, and a leading system beats its nearest competitor on only 77% to 88% of individual runs, so single runs flip rankings.

**The benchmark you would reach for has quality problems.** An audit of SWE-bench Verified found 32.67% of successful patches involved solution leakage and 31.08% passed on inadequate tests, and one provider reported 59.4% of a model's failures traced to test flaws rather than the model. Use it, but not as an arbiter of small deltas.

**Validate a judge before trusting it.** Agreement against human labels first, non-parametric paired tests, bootstrap confidence intervals, and a correction when comparing many metrics at once. Never have a model judge its own family's output.

**The hook already exists here.** A `PI_OFFLINE` flag is threaded through the Turbo and Playwright configuration (`repo`). Recorded model responses replayed behind that flag would give a deterministic regression gate at no per-run cost, which is the only version of this that survives in a CI job that also runs prettier, lint, typecheck, test and build.

## 8. Numbers to stop repeating

Each of these is widely quoted and none could be traced to a study. Three separate research passes in this project produced some of them and withdrew them when asked for provenance.

- "Effective context is 50 to 65 percent of the advertised window." No primary source. It appears to be an over-generalization of the narrower 32,000-token finding above.
- "A 200,000-token model becomes unreliable around 130,000." Untraceable.
- "The system prompt should be 10 to 15 percent of the budget." A blog heuristic. First-party guidance is deliberately qualitative and declines to give proportions.
- "Keep tools under 10 to 15" and "quality collapses near 120 tools." Vendor and aggregator posts only.
- "Three servers consume 72 percent of a 200,000-token window" and "one server costs 55,000 tokens." No date and no versions, and schema sizes change constantly.
- "Primacy holds 73 percent of the time" and "mid-prompt rules lose 30 to 50 percent compliance." An aggregator document, not a paper.
- Degradation as linear in context length. Contradicted by the inverted curve in retrieval-chunk studies and by the null correlation with window size in long runs.

No measurement was found for: degradation across repeated compactions, instruction-position compliance as distinct from retrieval position, a controlled comparison of restarting with file-based state against accumulating history, convergence detection with false-positive rates, composite-tool effects on success, per-step reliability of a production coding agent, or whether a self-review pass catches what deterministic checks do not.

## 9. What to change here, in order

| Step | Change | Evidence behind it |
|---|---|---|
| 1 | Aggregate token budget in `validateHarness`, across all instruction layers and context files | A passing config can exceed every model's window (`repo`) |
| 2 | Wind-down turn before `maxTurns` and the timeout instead of a bare abort | Silent truncation is the documented cap failure |
| 3 | Verification by tests and typecheck, never by asking the model if its work looks right | Intrinsic self-correction degrades accuracy |
| 4 | Cap repair loops at two rounds | 76% to 95% of gain arrives by round two |
| 5 | Add a cost cap beside the turn cap | Step counts are not comparable across models |
| 6 | Separate reasoning nodes from structuring nodes | The schema tax, and its two-pass mitigation |
| 7 | Conflict check across the instruction layers | Rule recall falls as rules accumulate, silently |
| 8 | Trajectory-length distress signal | Failed runs are 12.6% to 82.5% longer |
| 9 | Recorded-fixture evals behind `PI_OFFLINE`, with trial counts that respect the variance | 70% of observed variance is noise |

## Evidence and limits

- Repository claims were verified by reading the files cited at commit `4104c99`. Nothing was executed or benchmarked.
- Benchmark figures are reported as published. Several rest on a single paper, and the vendor-reported ones are marked where they appear.
- Research was gathered by five parallel agents with a provenance requirement stated in advance. Three earlier agents in this project, briefed without that requirement, produced fabricated statistics. The three agents covering context, loops and prompts returned traceable citations and explicit "no measurement found" answers. The requirement appears to be what made the difference, which is the practical lesson for any research fan-out.
- Sections 3, 4 and 9 contain proposals. No source endorses them.

## Primary sources

- Context: [arXiv 2510.05381](https://arxiv.org/abs/2510.05381), [NoLiMa](https://arxiv.org/abs/2502.05167), [RULER](https://arxiv.org/abs/2404.06654), [Lost in the Middle](https://arxiv.org/abs/2307.03172), [LongBench v2](https://arxiv.org/abs/2412.15204), [multi-turn](https://arxiv.org/abs/2505.06120), [Context Rot](https://www.trychroma.com/research/context-rot), [Vending-Bench](https://arxiv.org/abs/2502.15840), [SWE-Pruner](https://arxiv.org/abs/2601.16746), [OP-RAG](https://arxiv.org/abs/2409.01666), [RAG-MCP](https://arxiv.org/abs/2505.03275)
- Loops: [Huang et al.](https://arxiv.org/pdf/2310.01798), [Kamoi et al.](https://arxiv.org/abs/2406.01297), [Tyen et al.](https://arxiv.org/abs/2311.08516), [Self-Correction Bench](https://arxiv.org/pdf/2507.02778), [Reflexion](https://arxiv.org/abs/2303.11366), [ReAct](https://arxiv.org/abs/2210.03629), [Large Language Monkeys](https://arxiv.org/abs/2407.21787), [Snell et al.](https://arxiv.org/abs/2408.03314), [Lightman et al.](https://arxiv.org/abs/2305.20050), [Gao et al.](https://arxiv.org/abs/2210.10760), [trajectory length](https://arxiv.org/abs/2511.00197), [METR time horizons](https://metr.org/blog/2025-03-19-measuring-ai-ability-to-complete-long-tasks/)
- Prompts: [Wharton reports 1 to 4](https://arxiv.org/abs/2506.07142), [personas](https://arxiv.org/abs/2512.05858), [tips and threats](https://arxiv.org/abs/2508.00614), [schema tax](https://arxiv.org/abs/2606.09410), [format restrictions](https://arxiv.org/abs/2408.02442), [constraint phrasing](https://arxiv.org/abs/2604.07192), [GEPA](https://arxiv.org/abs/2507.19457), [Control Illusion](https://arxiv.org/abs/2502.15851), [PRIME](https://arxiv.org/html/2606.22470)
- Measurement: [agentic stochasticity](https://arxiv.org/pdf/2512.06710), [BetterBench](https://arxiv.org/html/2411.12990v1), [judge reliability](https://arxiv.org/pdf/2606.19544)
- First-party: [effective context engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents), [writing tools for agents](https://www.anthropic.com/engineering/writing-tools-for-agents), [code execution with MCP](https://www.anthropic.com/engineering/code-execution-with-mcp), [prompting best practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices), [prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)
