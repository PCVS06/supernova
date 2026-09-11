# Pi+ catalogue: loops, evaluation and harness composition

Research date: 2026-09-11. These are documented capabilities/patterns, not personally tested implementations. This file supplements the six Luna research reports. Product ideas are explicitly marked separately.

## Lightweight autonomous loops

Source: [iannuttall/Ralph](https://github.com/iannuttall/ralph). Archived on August 13, 2026; retained here as a historical implementation, not an active-project recommendation.

| ID | Feature | Behavior |
|---|---|---|
| RL01 | Fresh-context iterations | Start each iteration with a new agent context. |
| RL02 | File-backed continuity | Carry progress through files and Git. |
| RL03 | Structured requirements | Store stories, status and acceptance gates in JSON. |
| RL04 | Story-scoped iteration | Work on one story per iteration. |
| RL05 | Story locking | Mark a selected story in progress. |
| RL06 | Stale-work recovery | Reopen abandoned work after a configured timeout. |
| RL07 | Editable loop prompts | Override bundled prompts per project. |
| RL08 | Swappable runner | Select Claude, Codex, Droid or OpenCode. |
| RL09 | Persistent lessons | Maintain a guardrails file across iterations. |
| RL10 | Run evidence | Keep activity, error, progress and raw-run records. |
| RL11 | No-commit mode | Exercise a run without creating commits. |

## Research experiment loops

Source: [Karpathy autoresearch](https://github.com/karpathy/autoresearch). Documented research workflow; its training setup requires suitable compute.

| ID | Feature | Behavior |
|---|---|---|
| AR01 | Editable research program | Define agent instructions in program.md. |
| AR02 | Bounded edit surface | Constrain experiments to a designated training file. |
| AR03 | Fixed experiment budget | Give each training run the same wall-clock budget. |
| AR04 | Metric-based acceptance | Compare validation bits per byte between experiments. |
| AR05 | Keep/discard cycle | Retain improving changes and discard regressions. |
| AR06 | Repeated experimentation | Continue the experiment/evaluation cycle autonomously. |
| AR07 | Fixed evaluation machinery | Separate editable training code from preparation/evaluation utilities. |
| AR08 | Experiment log | Review the sequence and results after the run. |

## Workflow and context patterns

Sources: [Anthropic patterns](https://github.com/anthropics/claude-cookbooks/tree/main/patterns/agents), [context engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents). These are design patterns, not a packaged visual editor.

| ID | Feature/pattern | Behavior |
|---|---|---|
| WP01 | Prompt chaining | Pass outputs through a defined series of calls. |
| WP02 | Routing | Select a specialized execution path. |
| WP03 | Parallel sections | Process independent parts concurrently. |
| WP04 | Multiple candidate judgments | Combine independent assessments. |
| WP05 | Orchestrator/workers | Delegate dynamically and synthesize results. |
| WP06 | Evaluator/optimizer | Revise an output using evaluation feedback. |
| CX01 | Just-in-time retrieval | Fetch needed material when it becomes relevant. |
| CX02 | Context compaction | Condense older conversation while preserving useful state. |
| CX03 | Structured external notes | Store durable task information outside the current context. |
| CX04 | Specialized agent contexts | Give subtasks their own context windows. |

## Composable harness infrastructure

Source: [Deep Agents](https://github.com/langchain-ai/deepagents), [architecture](https://github.com/langchain-ai/deepagents/blob/main/libs/ARCHITECTURE.md). Documented harness library; not a drop-in Pi extension.

| ID | Feature | Behavior |
|---|---|---|
| DA01 | Isolated subagents | Delegate into separate context windows. |
| DA02 | Pluggable filesystems | Choose local, sandbox or remote storage. |
| DA03 | Tool-output offloading | Store large results outside the prompt. |
| DA04 | Long-thread summaries | Manage context growth through summarization. |
| DA05 | Persistent stores | Keep memory across sessions. |
| DA06 | Tool-call intervention | Approve, edit or reject pending actions. |
| DA07 | On-demand skills | Load reusable behavior when needed. |
| DA08 | Custom/MCP tools | Extend available functions. |
| DA09 | Replaceable middleware | Customize harness behavior without forking the whole stack. |
| DA10 | Model-specific tool exclusions | Hide tools through harness profiles. |
| DA11 | Path-based permissions | Restrict built-in filesystem operations. |

## Observability and prompt evaluation

Source: [Langfuse overview](https://langfuse.com/docs). Documented adjacent platform capabilities; deployment/edition details require separate checking.

| ID | Feature | Behavior |
|---|---|---|
| OB01 | Nested execution traces | Record model calls and surrounding operations. |
| OB02 | Session grouping | Inspect a multi-turn run together. |
| OB03 | Agent graph display | Visualize execution relationships. |
| OB04 | Cost and latency views | Compare resource use and response times. |
| OB05 | Prompt versioning | Track revisions to instructions. |
| OB06 | Prompt deployment labels | Select prompt versions by environment. |
| OB07 | Prompt playground | Test changes interactively. |
| OB08 | Dataset experiments | Compare candidate configurations on shared examples. |
| OB09 | Prompt-linked traces | Attribute outcomes to prompt revisions. |
| OB10 | Model-based judges | Score outputs or individual steps. |
| OB11 | Human annotation queues | Collect structured manual assessments. |
| OB12 | User feedback | Associate user ratings with runs. |
| OB13 | Custom scores | Record numeric, Boolean or categorical results. |
| OB14 | Metric alerts | Notify when configured thresholds are crossed. |
| OB15 | OpenTelemetry integration | Export standardized execution telemetry. |

Sources: [Promptfoo test cases](https://www.promptfoo.dev/docs/configuration/test-cases/), [red-team configuration](https://www.promptfoo.dev/docs/red-team/configuration/).

| ID | Feature | Behavior |
|---|---|---|
| EV01 | Parameterized test cases | Run prompts against variable inputs. |
| EV02 | Deterministic assertions | Check specific output properties. |
| EV03 | Test metadata | Organize and filter test scenarios. |
| EV04 | Dataset imports | Load reusable examples from external datasets. |
| EV05 | Adversarial generation | Generate inputs that challenge the application. |
| EV06 | Attack strategies | Vary how adversarial inputs are presented. |
| EV07 | Purpose-aware testing | Tailor tests to the application description. |
| EV08 | Evaluation reports | Inspect the outcomes of test runs. |

## Pi+ synthesis ideas — proposed, not attributed as shipped

- Versioned Research and Coding profiles bundling prompts, models, tools, context policy, memory and loop rules.
- A per-call context inspector showing exactly what was sent, where each segment came from and its token cost.
- Separate views for the workflow graph, knowledge graph, conversation branch tree and execution trace.
- Run the same saved task with two harness profiles; compare quality, cost, latency and interventions.
- A profile-level stop policy: acceptance criteria, step limit, time limit and spending limit.
- Reviewable harness evolution: propose a prompt/tool/loop change, evaluate it on held-out tasks, then accept or reject it.

These combinations are product proposals. Their value and feasibility for Pi+ are not established merely because individual ingredients exist elsewhere.
