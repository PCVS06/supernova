# Pi+ — harness feature catalogue, v0.1

Research snapshot: **11 September 2026**.

This is a broad starting catalogue for your own customizable Pi+ app: Research, Coding, and other harness setups inside one interface. Six Luna research leads covered separate areas, with additional main-agent research on loops, evaluation, and experimental context techniques. The research skill kept this source-backed; bounded batches were used for independent work.

**This is not every feature ever invented.** It is a documented discovery baseline, not a finished market census. Similar features are deliberately retained across projects when their implementation or control boundary differs. The count below is therefore **source-specific feature records, not unique capabilities**. No catalogue feature was installed or implemented in Pi+ during this research.

## How to read the evidence

- **Documented:** described by an official project page or repository, not personally tested here.
- **Advertised:** a README claims it; deeper implementation and account/platform availability still need checking.
- **Example / community extension:** available outside the core runtime; do not assume it is installed by default.
- **Experimental / preview:** explicitly marked as such by the source. Opt-in alone does not imply experimental.
- **Research implementation / published pattern:** useful design evidence, not a production-readiness claim.
- **Proposed:** our possible Pi+ adaptation, not a shipped capability attributed to another project.

The source projects are not equivalent: coding harnesses, orchestration libraries, memory services, automation platforms, and evaluation tools are labelled separately. Branch names such as main/dev and hosted documentation can move; version-pin and test any feature before adopting it. Some reports preserve source-advertised behavior with an explicit caveat.

## Curated feature map

These are navigation categories for the detailed records below, not promises that one product supplies every item.

| Area | Feature families to investigate |
|---|---|
| Harness profiles | Named setups, per-profile models/prompts/tools, project overrides, temporary run settings, importable capability bundles |
| Prompt engineering | System-prompt replacement/append, modular instruction files, templates, arguments, slash commands, role definitions, dynamic instructions, output contracts |
| Context engineering | Instruction precedence, context filtering, just-in-time loading, selective file ranges, repository maps, tool-result offloading, token budgets, compaction, branch summaries |
| Retrieval | Semantic/keyword/hybrid search, metadata filters, reranking, entity retrieval, knowledge-graph traversal, documentation indexing |
| Memory | Working versus long-term memory, agent/project scopes, editable blocks, recall, extraction, consolidation, temporal facts, provenance, forgetting |
| Workflow graphs | Typed state, nodes/edges, conditions, routing, fan-out/fan-in, map-reduce, joins, nested workflows, deterministic code steps |
| Agent loops | Tool-action loops, plan/act, evaluator/optimizer, self-reflection, fresh-context iterations, objective continuation, experiment/score/retain loops |
| Multi-agent work | Specialist profiles, manager/workers, advisor agents, parallel jobs, sequential chains, teams, messages, handoffs, worktrees, recursion guards |
| Live control | Steering, follow-up queues, pause, cancellation, approval, inspect child runs, resume, revive, external input |
| Coding intelligence | LSP, diagnostics, symbol navigation, repository graphs, architect/editor separation, hashline edits, AST edits, DAP debugging |
| Tools and integrations | Custom functions, MCP, lazy tool discovery, browser/desktop control, web search, documents, images, persistent shell/eval, SSH |
| Execution environments | Local/runtime separation, containers, worktrees, remote execution, filesystem adapters, persistent sessions, per-tool boundaries |
| Reliability | Checkpoints, replay, retries, fallback models, concurrency limits, watchdogs, stale-work recovery, output validation, durable pending approvals |
| Permissions | Read-only modes, per-tool allow/ask/deny, path restrictions, command policies, pre/post-tool gates, trusted project configuration |
| Observability | Event timelines, parent/child traces, graph views, token/cost/latency accounting, prompt provenance, run logs, error inspection |
| Evaluation | Datasets, assertions, judges, human review, prompt-version comparisons, red-team cases, regression checks, acceptance metrics |
| Extensibility | Hooks, middleware, provider adapters, custom tools, skills, packages, themes, commands, hot reload, API/RPC embedding |
| Harness evolution | Reviewable memory patches, learned playbooks, prompt optimization, reflection memory, recursive context processing, reusable generated helpers |

## “Graph” means several different things

| Graph type | What it represents | Example source |
|---|---|---|
| Workflow graph | What should execute next, under which conditions | [LangGraph](https://docs.langchain.com/oss/python/langgraph/graph-api) |
| Knowledge graph | Entities, relationships, and facts used for retrieval | [Graphiti](https://help.getzep.com/graphiti/getting-started/welcome) |
| Code graph | Symbols and dependencies used to select relevant code | [Aider repository map](https://aider.chat/docs/repomap.html) |
| Conversation tree | Alternative conversational histories and branch points | [Pi sessions](https://pi.dev/docs/latest/sessions) |
| Execution trace | What actually ran, including model/tool/agent calls | [Langfuse](https://langfuse.com/docs) |

A workflow graph is not automatically a visual editor. A conversation checkpoint is not necessarily a filesystem snapshot. Replaying a run does not automatically undo or safely repeat external side effects.

## What this suggests for your app — design proposal

Keep the app a **harness workbench**, with capabilities enabled per setup rather than forcing everything into every conversation.

A saved setup could own: model roles, prompts, context-loading policy, memory scope, tools, permissions, subagent definitions, loop/workflow, stopping rules, and evaluation cases. Switching from Research to Coding should switch those choices deliberately; it should not silently share private memories, permissions, or experimental rules between profiles.

A minimal blank profile, an editable Research profile, and an editable Coding profile would fit your stated direction. This is our product synthesis, not a claim that Pi+ already does it or an instruction to install the entire catalogue.

## Coverage and remaining gaps

This pass emphasizes your requested Pi/Oh My Pi ecosystem, customizable coding agents, context/memory systems, graphs, and loops. It does **not** claim to exhaust every package, GitHub issue, forum suggestion, or paper.

Further discovery candidates—not yet feature-audited in this catalogue—include Cursor, Windsurf, GitHub Copilot, Amp, Droid, Kiro, Devin, Augment, GSD, Superpowers, BMAD, Spec Kit/OpenSpec, PydanticAI, smolagents, Haystack, AG2, MetaGPT, Dify, Flowise, Langflow, and broader Pi package registries. Multimodal/live voice, deployment/enterprise controls, and non-English communities deserve separate passes.

## Catalogue contents

**454 source-specific feature/pattern records**, plus 10 explicitly proposed table entries and additional unnumbered Pi+ ideas. Overlaps are retained; this is not a count of unique features.

| Section | Scope | Source feature records |
|---|---|---:|
| [Pi ecosystem](#pi-ecosystem) | Pi, Oh My Pi, official examples and community subagents | 95 |
| [Claude Code and OpenCode](#claude-code-and-opencode) | Claude Code, OpenCode, oh-my-opencode / oh-my-openagent | 53 |
| [Other coding harnesses](#other-coding-harnesses) | Aider, Cline, Roo Code, Goose, OpenHands, SWE-agent, Continue | 58 |
| [Codex and Gemini ecosystems](#codex-and-gemini-ecosystems) | Codex, OpenAI Agents SDK, Gemini CLI, Google ADK | 39 |
| [Graph orchestration](#graph-orchestration) | LangGraph, Microsoft Agent Framework, AutoGen, CrewAI, Mastra, n8n | 58 |
| [Memory and retrieval](#memory-and-retrieval) | Letta/MemGPT, Mem0, Zep/Graphiti, LlamaIndex, DSPy | 60 |
| [Loops and evaluation](#loops-and-evaluation) | Ralph, autoresearch, Deep Agents, Langfuse, Promptfoo, Anthropic patterns | 63 |
| [Experimental context patterns](#experimental-context-patterns) | ACE, RLM, Reflexion, code execution with MCP | 28 |

## Detailed source catalogue

The sections below preserve each research area's concrete features, source links, and caveats. Search within this document for a project or feature; the source reports remain separately editable alongside it.


## Pi ecosystem

Source report: [pi-ecosystem.md](./pi-ecosystem.md).

Research snapshot: 2026-09-11. This is a focused catalogue for a customizable Pi-based harness, not an exhaustive survey of every Pi package or fork. Sources were read live; no repositories were cloned and no feature was executed locally.

Status means: `documented` = directly described or implemented by the cited source; `documented example` = behavior shown by an official example without an experimental label; `experimental` = explicitly labelled experimental by the source. Opt-in or setting-gated does not by itself mean experimental. The catalogue records source claims, not independent end-to-end validation.

Canonical sources used:

- [U1 — Pi usage](https://pi.dev/docs/latest/usage)
- [U2 — Pi extensions](https://pi.dev/docs/latest/extensions)
- [U3 — Pi compaction](https://pi.dev/docs/latest/compaction)
- [U4 — Pi sessions](https://pi.dev/docs/latest/sessions)
- [U5 — Official Pi subagent extension example](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/examples/extensions/subagent/index.ts)
- [U6 — Oh My Pi repository](https://github.com/can1357/oh-my-pi)
- [U7 — Oh My Pi settings](https://github.com/can1357/oh-my-pi/blob/main/docs/settings.md)
- [U8 — Oh My Pi extension authoring](https://github.com/can1357/oh-my-pi/blob/main/docs/skills/authoring-extensions.md)
- [U9 — mjakl/pi-subagent](https://github.com/mjakl/pi-subagent)
- [U10 — harms-haus/pi-subagents](https://github.com/harms-haus/pi-subagents)

Additional official OMP deep references:

- [O1 — DAP debugger](https://github.com/can1357/oh-my-pi/blob/main/docs/tools/debug.md)
- [O2 — Browser tool](https://github.com/can1357/oh-my-pi/blob/main/docs/tools/browser.md)
- [O3 — Eval tool](https://github.com/can1357/oh-my-pi/blob/main/docs/tools/eval.md)
- [O4 — Web search](https://github.com/can1357/oh-my-pi/blob/main/docs/tools/web_search.md)
- [O5 — Task tool](https://github.com/can1357/oh-my-pi/blob/main/docs/tools/task.md)
- [O6 — Todo tool](https://github.com/can1357/oh-my-pi/blob/main/docs/tools/todo.md)
- [O7 — Magic keywords](https://github.com/can1357/oh-my-pi/blob/main/docs/magic-keywords.md)
- [O8 — Checkpoint tool](https://github.com/can1357/oh-my-pi/blob/main/docs/tools/checkpoint.md)
- [O9 — Providers and credentials](https://github.com/can1357/oh-my-pi/blob/main/docs/providers.md)
- [O10 — Extensions](https://github.com/can1357/oh-my-pi/blob/main/docs/extensions.md)
- [O11 — SDK](https://github.com/can1357/oh-my-pi/blob/main/docs/sdk.md)
- [O12 — Agent Hub](https://github.com/can1357/oh-my-pi/blob/main/docs/agent-hub.md)
- [O13 — Compaction strategies](https://github.com/can1357/oh-my-pi/blob/main/docs/compaction.md)
- [O14 — Artifact/blob storage](https://github.com/can1357/oh-my-pi/blob/main/docs/blob-artifact-architecture.md)
- [O15 — Official OMP examples](https://github.com/can1357/oh-my-pi/blob/main/packages/coding-agent/examples/README.md)

### Prompt, context, and lifecycle hooks

| Feature | Concrete behavior | Source URL | Source project | Status |
|---|---|---|---|---|
| Layered context discovery | Loads global and ancestor/current `AGENTS.md` or `CLAUDE.md` files into the session context. | [U1](https://pi.dev/docs/latest/usage) | Pi | documented |
| Directory override | `AGENTS.override.md` replaces the ordinary context file for that directory while other directory layers still apply. | [U1](https://pi.dev/docs/latest/usage) | Pi | documented |
| Project/global system prompt replacement | `.pi/SYSTEM.md` or `~/.pi/agent/SYSTEM.md` replaces the default system prompt. | [U1](https://pi.dev/docs/latest/usage) | Pi | documented |
| System prompt append | `APPEND_SYSTEM.md` adds instructions without replacing the default prompt; CLI append flags are also supported. | [U1](https://pi.dev/docs/latest/usage) | Pi | documented |
| Prompt templates | Reusable prompt files expand through slash commands such as `/templatename`; discovery can be disabled. | [U1](https://pi.dev/docs/latest/usage) | Pi | documented |
| On-demand skills | Skills are discovered as reusable capabilities and can be invoked with `/skill:name`; they can also be disabled or explicitly loaded. | [U1](https://pi.dev/docs/latest/usage) | Pi | documented |
| Raw-input interception | The `input` hook sees user text before skill/template expansion and can pass it through, transform it, or handle it entirely. | [U2](https://pi.dev/docs/latest/extensions) | Pi extensions | documented |
| Per-turn context injection | `before_agent_start` can append a persistent custom message that is stored in the session and sent to the model. | [U2](https://pi.dev/docs/latest/extensions) | Pi extensions | documented |
| Per-turn system-prompt mutation | `before_agent_start` can replace the effective system prompt for the turn; multiple handlers chain their changes. | [U2](https://pi.dev/docs/latest/extensions) | Pi extensions | documented |
| Pre-call message filtering | The `context` hook receives a safe-to-modify message copy before each LLM call, enabling non-destructive pruning or rewriting. | [U2](https://pi.dev/docs/latest/extensions) | Pi extensions | documented |
| Provider request hooks | Extensions can add/remove headers and inspect or replace the provider-specific serialized request payload before sending. | [U2](https://pi.dev/docs/latest/extensions) | Pi extensions | documented |
| Tool-call gate and patch | `tool_call` can mutate arguments before execution or block/terminate a call, enabling permission and safety policies. | [U2](https://pi.dev/docs/latest/extensions) | Pi extensions | documented |

### Queues, steering, and interaction state

| Feature | Concrete behavior | Source URL | Source project | Status |
|---|---|---|---|---|
| Steering queue | Enter queues a message that is delivered after the current assistant turn finishes its tool batch, before the next model call. | [U1](https://pi.dev/docs/latest/usage) | Pi | documented |
| Follow-up queue | Alt+Enter queues a message that waits until the agent has finished all current work. | [U1](https://pi.dev/docs/latest/usage) | Pi | documented |
| Queue drain modes | `steeringMode` and `followUpMode` choose `one-at-a-time` or `all` delivery. | [U1](https://pi.dev/docs/latest/usage) | Pi | documented |
| Abort and recover queued work | Escape aborts the run and restores queued text to the editor; Alt+Up retrieves queued messages. | [U1](https://pi.dev/docs/latest/usage) | Pi | documented |
| Interrupt policy | OMP adds an `interruptMode` setting with `immediate` and `wait` choices. | [U7](https://github.com/can1357/oh-my-pi/blob/main/docs/settings.md) | Oh My Pi | documented |
| Queue event stream | Pi JSON mode emits `queue_update` with the full pending steering/follow-up queues whenever they change. | [U2](https://pi.dev/docs/latest/extensions) | Pi extensions / JSON integration | documented |
| Waiting and idle lifecycle | UI prompt start/end events expose “waiting for user”; graceful shutdown is deferred until queued work and the current run reach idle. | [U2](https://pi.dev/docs/latest/extensions) | Pi extensions | documented |

### Compaction, sessions, and branching

| Feature | Concrete behavior | Source URL | Source project | Status |
|---|---|---|---|---|
| Automatic threshold compaction | Pi compacts when context tokens exceed the context window minus a configurable reserve, checking at safe turn boundaries. | [U3](https://pi.dev/docs/latest/compaction) | Pi | documented |
| Manual compaction | `/compact` accepts optional instructions to focus the generated summary. | [U3](https://pi.dev/docs/latest/compaction) | Pi | documented |
| Retention controls | `reserveTokens` leaves response headroom; `keepRecentTokens` controls how much recent history is retained before summarization. | [U3](https://pi.dev/docs/latest/compaction) | Pi | documented |
| Iterative structured summaries | Compaction generates a structured summary, appends a compaction entry, and rebuilds context from the summary plus retained messages; previous summaries can feed later passes. | [U3](https://pi.dev/docs/latest/compaction) | Pi | documented |
| Custom compaction hook | `session_before_compact` can cancel compaction or return a custom summary and kept-entry boundary. | [U2](https://pi.dev/docs/latest/extensions) | Pi extensions | documented |
| Compaction outcome hooks | `session_compact` and `session_compact_failed` expose success, failure/abort, reason, and whether an overflow retry will occur. | [U2](https://pi.dev/docs/latest/extensions) | Pi extensions | documented |
| Branch summarization | Navigating with `/tree` can summarize the abandoned branch so its context survives when continuing elsewhere. | [U3](https://pi.dev/docs/latest/compaction) | Pi | documented |
| In-file session tree | Sessions are JSONL trees with parent IDs and an active leaf; `/tree` moves the active position without creating a new file. | [U4](https://pi.dev/docs/latest/sessions) | Pi | documented |
| Edit-and-resubmit branching | Selecting a user/custom message places it in the editor; editing and resubmitting creates a new branch from that point. | [U4](https://pi.dev/docs/latest/sessions) | Pi | documented |
| Fork and clone | `/fork` creates a new session from an earlier user message; `/clone` duplicates the current active branch. | [U4](https://pi.dev/docs/latest/sessions) | Pi | documented |

### Subagents and coordination

| Feature | Concrete behavior | Source URL | Source project | Status |
|---|---|---|---|---|
| Single delegated subagent | The official extension accepts an agent name plus task and starts a separate Pi process. | [U5](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/examples/extensions/subagent/index.ts) | Pi official extension example | documented example |
| Parallel delegation | The official example accepts an array of `{agent, task}` items and runs them concurrently with a bounded worker pool. | [U5](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/examples/extensions/subagent/index.ts) | Pi official extension example | documented example |
| Sequential chains | Chain steps run in order and may interpolate the previous step’s final output with `{previous}`. | [U5](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/examples/extensions/subagent/index.ts) | Pi official extension example | documented example |
| Isolated child context | Each official-example invocation gets a separate Pi process and isolated context window rather than sharing the parent transcript by default. | [U5](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/examples/extensions/subagent/index.ts) | Pi official extension example | documented example |
| Structured child results | The example uses JSON mode to capture messages, exit status, stop reason, usage, model, and error text. | [U5](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/examples/extensions/subagent/index.ts) | Pi official extension example | documented example |
| Concurrency/output bounds | The example caps parallel task count, limits concurrency, and truncates displayed per-task output while retaining details. | [U5](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/examples/extensions/subagent/index.ts) | Pi official extension example | documented example |
| User and project agent discovery | Agent definitions can be discovered from the user agent directory and project-local `.pi/agents`; project agents require trust/approval. | [U5](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/examples/extensions/subagent/index.ts) | Pi official extension example | documented example |
| Project-agent safety confirmation | The official example prompts before running repo-controlled project agents when the project is not trusted. | [U5](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/examples/extensions/subagent/index.ts) | Pi official extension example | documented example |
| Per-agent configuration | Markdown agent definitions can set a model, tool allowlist, no-tools mode, and an appended system prompt. | [U9](https://github.com/mjakl/pi-subagent) | mjakl/pi-subagent | documented |
| Fresh context or parent snapshot | mjakl/pi-subagent starts fresh by default but supports explicit parent snapshot cloning for exceptional cases. | [U9](https://github.com/mjakl/pi-subagent) | mjakl/pi-subagent | documented |
| Inactivity watchdog | mjakl/pi-subagent can stop silent child runs while allowing active RPC streams to continue. | [U9](https://github.com/mjakl/pi-subagent) | mjakl/pi-subagent | documented |
| Depth and cycle guards | mjakl/pi-subagent prevents runaway recursive delegation through depth/cycle protection. | [U9](https://github.com/mjakl/pi-subagent) | mjakl/pi-subagent | documented |
| Streaming TUI supervision | mjakl/pi-subagent renders streaming progress, expandable tool/output details, usage, and session metadata. | [U9](https://github.com/mjakl/pi-subagent) | mjakl/pi-subagent | documented |
| Session preference hints | Agent definitions can advise the parent to use ephemeral or persistent sessions and supply a free-form continuation hint. | [U9](https://github.com/mjakl/pi-subagent) | mjakl/pi-subagent | documented |
| Resume completed child sessions | mjakl/pi-subagent can resume completed or errored sessions, prepending the prior transcript to the new task; running sessions cannot be resumed. | [U9](https://github.com/mjakl/pi-subagent) | mjakl/pi-subagent | documented |
| Batch delegation with profiles | harms-haus/pi-subagents delegates parallel tasks with named profiles, per-task model/settings, timeout, and optional resume. | [U10](https://github.com/harms-haus/pi-subagents) | harms-haus/pi-subagents | documented |
| File-scoped child context | harms-haus/pi-subagents can prepend whole files, head/tail slices, or line ranges to an individual subagent prompt. | [U10](https://github.com/harms-haus/pi-subagents) | harms-haus/pi-subagents | documented |
| Typed isolated worktree fan-out | OMP’s `task` tool can fan out work in isolated worktrees and return typed results. | [O5](https://github.com/can1357/oh-my-pi/blob/main/docs/tools/task.md) | Oh My Pi | documented |
| Agent Hub supervision | Agent Hub exposes subagent activity and transcript controls, including steering, revival, and termination. | [O12](https://github.com/can1357/oh-my-pi/blob/main/docs/agent-hub.md) | Oh My Pi | documented |
| Advisor model | The README advertises an independent advisor model that reviews main-agent turns. | [U6](https://github.com/can1357/oh-my-pi) | Oh My Pi | documented |

### LSP, editing, and execution harness

| Feature | Concrete behavior | Source URL | Source project | Status |
|---|---|---|---|---|
| LSP operation surface | The README lists an `lsp` tool for language-server operations. | [U6](https://github.com/can1357/oh-my-pi) | Oh My Pi | documented |
| Lazy/shared language servers | OMP can start LSP servers on demand and share one server per project through a daemon broker, falling back to private servers. | [U7](https://github.com/can1357/oh-my-pi/blob/main/docs/settings.md) | Oh My Pi | documented |
| Diagnostic/format policies | OMP independently configures diagnostics after writes or edits, format-on-write, and duplicate-diagnostic collapsing. | [U7](https://github.com/can1357/oh-my-pi/blob/main/docs/settings.md) | Oh My Pi | documented |
| Hashline editing | The README describes hashline editing that rejects stale anchors. | [U6](https://github.com/can1357/oh-my-pi) | Oh My Pi | documented |
| Fuzzy edit matching | OMP can allow fuzzy anchor matching with a configurable similarity threshold. | [U7](https://github.com/can1357/oh-my-pi/blob/main/docs/settings.md) | Oh My Pi | documented |
| Generated-file protection | OMP can refuse edits to generated or lockfile-like files. | [U7](https://github.com/can1357/oh-my-pi/blob/main/docs/settings.md) | Oh My Pi | documented |
| Preview-then-accept AST edits | The README lists preview/resolve AST edits. | [U6](https://github.com/can1357/oh-my-pi) | Oh My Pi | documented |
| Persistent shell/eval state | The README lists persistent Bash and evaluation sessions. | [U6](https://github.com/can1357/oh-my-pi) | Oh My Pi | documented |

### Customization and packaging

| Feature | Concrete behavior | Source URL | Source project | Status |
|---|---|---|---|---|
| Extension discovery and hot reload | Pi loads global/project extensions or explicit CLI extensions, and `/reload` refreshes extensions plus other resources. | [U1](https://pi.dev/docs/latest/usage) | Pi | documented |
| Custom tools, commands, and UI | Extensions can register LLM-callable tools, slash commands, user prompts, and custom TUI components. | [U2](https://pi.dev/docs/latest/extensions) | Pi extensions | documented |
| Package/resource bundling | Pi packages bundle extensions, skills, prompt templates, and themes for installation/sharing. | [U1](https://pi.dev/docs/latest/usage) | Pi | documented |
| OMP plugin capability directories | An OMP plugin manifest can expose extensions and sibling `skills`, hooks, tools, commands, rules, prompts, and MCP configuration. | [U8](https://github.com/can1357/oh-my-pi/blob/main/docs/skills/authoring-extensions.md) | Oh My Pi | documented |
| Project config overlays | OMP merges global and project config, supports temporary `--config` layers, and warns that project arrays replace rather than extend global arrays. | [U7](https://github.com/can1357/oh-my-pi/blob/main/docs/settings.md) | Oh My Pi | documented |
| Model roles and fallbacks | OMP maps roles such as `default`, `smol`, `slow`, `task`, and `advisor` to models and can fall back through ordered chains after provider failures. | [U7](https://github.com/can1357/oh-my-pi/blob/main/docs/settings.md) | Oh My Pi | documented |
| Memory backends and autolearn | OMP offers selectable memory backends; `autolearn` is explicitly experimental and can capture lessons/create managed skills after a run. | [U7](https://github.com/can1357/oh-my-pi/blob/main/docs/settings.md) | Oh My Pi | experimental |
| Prompt-triggered operating modes | Standalone keywords such as `orchestrate` and `workflowz` request special operating modes. | [O7](https://github.com/can1357/oh-my-pi/blob/main/docs/magic-keywords.md) | Oh My Pi | documented |

### Oh My Pi breadth additions: debugger, browser, media, planning, providers, and tools

These records extend the core-hook catalogue with the wider surface advertised in OMP’s README and described in its official tool/docs pages.

#### Debugger

| Feature | Concrete behavior | Source URL | Source project | Status |
|---|---|---|---|---|
| DAP debugger surface | OMP advertises 28 DAP operations; the official tool reference lists launch/attach, breakpoints, stepping, evaluation, stack/scopes/variables, memory, modules, loaded sources, custom requests, output, termination, and session listing. | [O1](https://github.com/can1357/oh-my-pi/blob/main/docs/tools/debug.md) | Oh My Pi | documented |
| Adapter discovery and selection | Built-in adapters cover common native, Python, JavaScript, .NET, Ruby, PHP, Dart/Flutter, and Elixir paths; launch/attach selection ranks available adapters by project and target metadata. | [O1](https://github.com/can1357/oh-my-pi/blob/main/docs/tools/debug.md) | Oh My Pi | documented |
| Custom DAP adapters | Project/user `dap.json`/YAML files can add or override adapters, including commands, args, language/file metadata, root markers, launch/attach defaults, and stdio/socket/TCP connection modes. | [O1](https://github.com/can1357/oh-my-pi/blob/main/docs/tools/debug.md) | Oh My Pi | documented |

#### Browser, eval, web, document, and media tools

| Feature | Concrete behavior | Source URL | Source project | Status |
|---|---|---|---|---|
| Named browser tabs and launch modes | The `browser` facade opens/reuses/closes named tabs across project-shared headless Chromium, spawned browsers/Electron, CDP attachments, Chrome relay, or cmux surfaces. | [O2](https://github.com/can1357/oh-my-pi/blob/main/docs/tools/browser.md) | Oh My Pi | documented |
| Browser inspection and interaction | Browser handles expose navigation, accessibility snapshots, screenshots, text/Markdown extraction, CSS/ARIA/text/XPath selectors, clicks, typing, filling, scrolling, dragging, file upload, waits, and page JavaScript. | [O2](https://github.com/can1357/oh-my-pi/blob/main/docs/tools/browser.md) | Oh My Pi | documented |
| Authenticated browser relay | Relay/CDP modes can adopt real logged-in browser tabs; the docs explicitly warn that actions are attributed to the user and consequential actions need direct authorization. | [O2](https://github.com/can1357/oh-my-pi/blob/main/docs/tools/browser.md) | Oh My Pi | documented |
| Persistent Python/JavaScript eval | `eval` runs one Python or JavaScript cell per call with language-specific state retained across later calls; each language can be reset independently. | [O3](https://github.com/can1357/oh-my-pi/blob/main/docs/tools/eval.md) | Oh My Pi | documented |
| Eval bridges and structured output | Eval can stream updates, capture structured `display()` values/images, call tool/subagent bridges when enabled, cancel cells, and spill large output into artifacts. | [O3](https://github.com/can1357/oh-my-pi/blob/main/docs/tools/eval.md) | Oh My Pi | documented |
| Multi-provider web search | `web_search` tries an ordered provider chain, tolerates provider failures, supports recency/result limits, and returns answers plus normalized sources, citations, related questions, and query metadata. | [O4](https://github.com/can1357/oh-my-pi/blob/main/docs/tools/web_search.md) | Oh My Pi | documented |
| Public web aggregation | The credential-free public provider can fan out across search engines, deduplicate URLs, rank by cross-engine consensus, and return within soft/hard deadlines. | [O4](https://github.com/can1357/oh-my-pi/blob/main/docs/tools/web_search.md) | Oh My Pi | documented |
| Document/source-oriented web handling | The README advertises structured Markdown reading for specialized source types. | [U6](https://github.com/can1357/oh-my-pi) | Oh My Pi | documented |
| Image generation | The README lists a setting-gated `generate_image` tool. | [U6](https://github.com/can1357/oh-my-pi) | Oh My Pi | documented |

#### Planning, task persistence, workflowz, and artifacts

| Feature | Concrete behavior | Source URL | Source project | Status |
|---|---|---|---|---|
| Phased todo state | The `todo` tool mutates one phase/task at a time and returns the full state; operations include initialize, start, complete, abandon, block, and unblock. | [O6](https://github.com/can1357/oh-my-pi/blob/main/docs/tools/todo.md) | Oh My Pi | documented |
| Todo persistence and resume behavior | Todo state is cached in the session, reflected in the visible UI, and cleaned of done/dropped tasks on session resume; `/todo` also persists custom entries and can inject reminders. | [O6](https://github.com/can1357/oh-my-pi/blob/main/docs/tools/todo.md) | Oh My Pi | documented |
| Async task jobs and lifecycle | The `task` tool can block or run in the background; the docs describe progress/result delivery, bounded concurrency, agent states (`running`, `idle`, `parked`, `aborted`), idle-TTL parking, and revival. | [O5](https://github.com/can1357/oh-my-pi/blob/main/docs/tools/task.md) | Oh My Pi | documented |
| Workflowz execution contract | The `workflowz` keyword requests a deterministic multi-agent workflow centered on persistent eval helpers such as `agent()`, `completion()`, handles, `wait()`, and `workpool()`; the source does not claim a separate visual graph editor. | [O7](https://github.com/can1357/oh-my-pi/blob/main/docs/magic-keywords.md) | Oh My Pi | documented |
| Checkpoint/rewind pair | Opt-in `checkpoint` marks a top-level investigation boundary and forces a later `rewind` report before yielding; it stores conversation/session metadata, not a Git or filesystem snapshot. | [O8](https://github.com/can1357/oh-my-pi/blob/main/docs/tools/checkpoint.md) | Oh My Pi | documented |

#### Credentials, providers, and model customization

| Feature | Concrete behavior | Source URL | Source project | Status |
|---|---|---|---|---|
| Credential precedence | Provider credentials resolve through runtime overrides, custom `models.yml` keys, stored credentials, environment/`.env` values, and fallback resolvers; disabled providers remain unavailable even if credentials exist. | [O9](https://github.com/can1357/oh-my-pi/blob/main/docs/providers.md) | Oh My Pi | documented |
| Provider-scoped login/logout | `/login` and `/logout` operate per provider, support OAuth or API-key flows, and can use an auth broker for headless/remote setups. | [O9](https://github.com/can1357/oh-my-pi/blob/main/docs/providers.md) | Oh My Pi | documented |
| Multi-account OAuth rotation | Stored OAuth credentials can represent multiple accounts/workspaces; OMP documents ranking/rotation across available credentials. | [O9](https://github.com/can1357/oh-my-pi/blob/main/docs/providers.md) | Oh My Pi | documented |
| Custom OpenAI-compatible providers | `models.yml` can declare custom provider IDs, base URLs, APIs, auth behavior, model metadata, discovery, and keyless local endpoints. | [O9](https://github.com/can1357/oh-my-pi/blob/main/docs/providers.md) | Oh My Pi | documented |
| Extension-registered providers | Extensions can register providers and optional usage fetching so custom backends participate in model selection, credential storage, and usage displays. | [O10](https://github.com/can1357/oh-my-pi/blob/main/docs/extensions.md) | Oh My Pi | documented |

#### Extension examples and host integration

| Feature | Concrete behavior | Source URL | Source project | Status |
|---|---|---|---|---|
| SDK example family | Official examples cover programmatic SDK sessions, model/prompt/tool/session customization, safety-gate hooks, and custom tools beyond subagents. | [O15](https://github.com/can1357/oh-my-pi/blob/main/packages/coding-agent/examples/README.md) | Oh My Pi | documented example |
| Extension composition | One OMP extension can combine event handlers, LLM tools, slash commands, keyboard shortcuts/flags, renderers, and session/message injection. | [O10](https://github.com/can1357/oh-my-pi/blob/main/docs/extensions.md) | Oh My Pi | documented |
| Restricted/runtime tool sets | SDK sessions can request named tools, enforce a restricted allowlist, opt into hidden tools, load inline/extra extensions, and update active tools at runtime. | [O11](https://github.com/can1357/oh-my-pi/blob/main/docs/sdk.md) | Oh My Pi | documented |
| Brokered file-write fallback | Extensions can supply a privileged write fallback when direct writes fail, allowing a host/sandbox broker to persist bytes while preserving normal file snapshots and later hashline edits. | [O10](https://github.com/can1357/oh-my-pi/blob/main/docs/extensions.md) | Oh My Pi | documented |

#### Other README-advertised OMP tools

| Feature | Concrete behavior | Source URL | Source project | Status |
|---|---|---|---|---|
| Desktop computer control | The README lists a `computer` tool. | [U6](https://github.com/can1357/oh-my-pi) | Oh My Pi | documented |
| Persistent SSH tool | The README lists persistent SSH support. | [U6](https://github.com/can1357/oh-my-pi) | Oh My Pi | documented |
| GitHub as a filesystem | The README advertises GitHub as a filesystem-like surface. | [U6](https://github.com/can1357/oh-my-pi) | Oh My Pi | documented |
| Security scanning | The README lists a setting-gated `security_scan` tool. | [U6](https://github.com/can1357/oh-my-pi) | Oh My Pi | documented |

### Verification boundary

- The catalogue is not universal coverage; it deliberately prioritizes the requested hooks, queues, compaction, branching, subagents, LSP/editing, and customization surfaces.
- “Pi subagents” are not a built-in Pi core capability: the official subagent implementation is an extension example, while mjakl and harms-haus are community extensions. Treat them as installable patterns, not baseline guarantees.
- OMP README performance claims and feature demos were not independently benchmarked here. The entries record the repository’s documented behavior; availability, defaults, provider support, and platform behavior should be rechecked before product commitments.
- Rows based primarily on the OMP README (for example image generation, computer control, SSH, GitHub, and security scanning) are intentionally included as advertised capabilities; this report did not execute them or verify account/provider availability.
- No feature is marked `proposed` because this report only records behavior directly supported by the cited sources. Any Supernova-specific synthesis or missing capability should be treated as a separate design proposal, not as an ecosystem fact.

## Claude Code and OpenCode

Source report: [claude-opencode.md](./claude-opencode.md).

Research date: 2026-09-11. Live first-party documentation and repositories were checked; no repositories were cloned and no packages were installed. This is a source catalogue, not a claim of universal completeness. It focuses on granular behavior that could inform a customizable Pi+ harness.

No OpenAI products were researched. `oh-my-opencode` is currently being renamed to `oh-my-openagent`; the published package/binary name remains in transition. The report uses “OMO” for the current project and calls out where a feature belongs to the OpenCode plugin layer rather than OpenCode itself.

Status means:

- `documented`: described in the current first-party docs/repository.
- `experimental`: the source explicitly labels the capability experimental, preview, or beta. Configuration facts such as opt-in, disabled by default, or config-gated remain separate notes and do not change this status by themselves.
- `proposed`: a Pi+ translation candidate derived from the catalogue, not a shipped feature.

### Claude Code

Claude Code is a complete terminal coding-agent harness. Its official plugin repository contains reusable implementations built on top of the core runtime; those implementations are not automatically core behavior.

| ID | Granular feature | Product/layer | Behavior | Status | Source |
|---|---|---|---|---|---|
| CC01 | Hierarchical project context | Claude Code memory/context | Loads `CLAUDE.md` from user, project, managed and directory scopes; supports imports such as `@AGENTS.md`. | documented | [S5] |
| CC02 | Automatic project memory | Claude Code built-in memory | Claude can write durable notes from corrections and preferences; the project memory is shared across worktrees and loaded with the session. | documented | [S5] |
| CC03 | Path-scoped rules | Claude Code rules | `.claude/rules/` files can match file paths. | documented | [S5] |
| CC04 | Invocation policy for skills | Claude Code skills | Skills can be model-invoked, user-only or hidden. | documented | [S1] |
| CC05 | Deferred skill loading | Claude Code skills/context | Descriptions load at start; bodies load on use. | documented | [S1] |
| CC06 | Forked skill execution | Claude Code skills/subagents | Skills can fork isolated contexts and attach allowed tools. | documented | [S1] |
| CC07 | Isolated subagent workers | Claude Code subagents | Subagents isolate context, return summaries, and set prompts and permissions. | documented | [S1] |
| CC08 | Subagent worktree isolation | Claude Code subagents/worktrees | A worker can receive a temporary Git worktree for parallel edits. | documented | [S1] |
| CC09 | Agent Teams | Claude Code Agent Teams | A lead coordinates independent teammates through shared tasks and direct messaging. The current page labels this experimental and disabled by default. | experimental | [S4] |
| CC10 | Agent view | Claude Code sessions | Dispatches and opens background sessions. | documented | [S1] |
| CC11 | Dynamic workflows | Claude Code workflows | Launch subagents and cross-check results. | documented | [S1] |
| CC12 | Cross-session messaging | Claude Code session management | One running session can pass a message or finding to another session without merging their full histories. | documented | [S1] |
| CC13 | Lifecycle hook matching | Claude Code hooks | Hooks run on session, prompt, tool, subagent and config events; matchers narrow triggers. | documented | [S2] |
| CC14 | Multiple hook handler types | Claude Code hooks | Handlers may call commands, HTTP, MCP, prompts or agent verifiers. | documented | [S12] |
| CC15 | Pre-tool decision gate | Claude Code hooks | `PreToolUse` can allow, deny, ask, defer or modify a call. | documented | [S2] |
| CC16 | Context injection at subagent start | Claude Code hooks/subagents | `SubagentStart` can inject context and match agent type. | documented | [S2] |
| CC17 | Runtime config-change interception | Claude Code hooks/settings | `ConfigChange` can observe or control live settings changes. | documented | [S2] |
| CC18 | Hook output as control protocol | Claude Code hooks | Structured output adds context or decisions; command exit 2 blocks. | documented | [S12] |
| CC19 | Layered hook registration | Claude Code hooks/settings | User, project, local, plugin and session hooks merge; `disableAllHooks` has managed-policy precedence. | documented | [S2] |
| CC20 | Plugin packaging and namespacing | Claude Code plugins | A plugin manifest plus root-level `skills/`, `commands/`, `agents/`, `hooks/` and `.mcp.json` can ship a reusable feature bundle; plugin skills are namespaced to avoid collisions. | documented | [S3] |

The official Claude Code repository also demonstrates reusable plugins such as feature development, code review, security guidance, hook generation and loop-style completion. Those are valuable reference implementations, but they should be treated as plugin-layer behavior rather than promises made by the core harness.

CC09 is current documentation, not a legacy summary: the exact page describes the behavior as of v2.1.178 and says the older `TeamCreate`/`TeamDelete` setup was removed. Treat older examples using those tools as historical.

### OpenCode

OpenCode is a full open-source coding-agent harness. The plugin helper/API is an extensibility library, not the complete runtime. The current stable documentation and the V2 documentation are not interchangeable: V2 documents a changing beta runtime with different schemas and APIs. A Pi+ implementation should choose a target OpenCode generation before copying config or plugin contracts.

| ID | Granular feature | Product/layer | Behavior | Status | Source |
|---|---|---|---|---|---|
| OC01 | Built-in primary agents | OpenCode core | Built-in build, plan and general agents; Tab switches primary agents. | documented | [S6] |
| OC02 | Agent modes | OpenCode core | Modes are `primary`, `subagent` and `all`. | documented | [S6] |
| OC03 | File- or config-defined agents | OpenCode core | Define agents in JSON or Markdown, globally or per project. | documented | [S6] |
| OC04 | Per-agent execution profile | OpenCode core | Set model, prompt, description and permissions per agent. | documented | [S6] |
| OC05 | Hidden internal subagents | OpenCode core | Hidden subagents disappear from autocomplete but remain programmatically callable. | documented | [S6] |
| OC06 | Fine-grained permissions | OpenCode core | `allow`/`ask`/`deny` applies per tool, including external-directory access. | documented | [S6] |
| OC07 | Wildcard permission matching | OpenCode core | Wildcards target custom/MCP tools; later matches override earlier ones. | documented | [S6] |
| OC08 | Agent-level permission overrides | OpenCode core | Named agents can override global permissions. | documented | [S6] |
| OC09 | Project-first config resolution | OpenCode core | Remote organizational defaults, global config, custom config paths and project config are layered; project config has highest standard precedence. | documented | [S7] |
| OC10 | Instruction file globs | OpenCode context/config | `instructions` accepts paths and glob patterns such as contribution guides, docs and editor rules, allowing project conventions to be composed without embedding them in JSON. | documented | [S7] |
| OC11 | Local and npm plugin loading | OpenCode plugin layer | Plugins can be discovered from project/global plugin directories or loaded from npm through config; loading, caching and ordering are handled by the host. | documented | [S8] |
| OC12 | Event-driven plugin hooks | OpenCode plugin layer | Plugins can react to runtime/TUI events; examples include notification on session idle and a pre-tool guard that blocks reads of `.env` files. | documented | [S8] |
| OC13 | Custom tool registration | OpenCode plugin layer | A plugin can register a tool with a description, validated schema and execution function; a same-named plugin tool takes precedence over the built-in tool. | documented | [S8] |
| OC14 | Compaction hooks | OpenCode plugin layer | A plugin can customize what context is retained or added when a session is compacted. | documented | [S8] |
| OC15 | Configurable MCP connection point | OpenCode core/config | OpenCode exposes an `mcp` configuration surface alongside agents, plugins, instructions and permissions, making external tool/data connections a first-class harness concern. | documented | [S7] |

OpenCode’s documented plugin API and SDK are framework/library seams around the runtime. They are useful for a Pi+ adapter, but “custom tool registration” or “plugin hooks” should not be misreported as a complete agent harness by themselves.

### oh-my-opencode / oh-my-openagent (OMO)

The official repository now redirects from `code-yeongyu/oh-my-opencode` to `code-yeongyu/oh-my-openagent`; the package and binary names remain in transition. OMO is a third-party orchestration/plugin layer built primarily for OpenCode. Its README describes an Ultimate OpenCode edition, a Light Codex edition and a standalone beta edition; current repository material also describes a multi-harness refactor and only partial/exploratory Pi support. Do not attribute these capabilities to OpenCode core.

| ID | Granular feature | Product/layer | Behavior | Status | Source |
|---|---|---|---|---|---|
| OMO01 | Curated specialist roster | OMO Ultimate / OpenCode plugin | Main orchestration plus named specialist roles; README advertises 11 agents. | documented | [S11] |
| OMO02 | Category-based routing | OMO delegation | Categories select models, tools and fallbacks. | documented | [S10] |
| OMO03 | Background task controls | OMO task layer | Delegation supports synchronous and background execution with result retrieval. | documented | [S11] |
| OMO04 | Team Mode | OMO Ultimate / OpenCode | Lead, members, shared tasks, claims, mailboxes and optional worktrees/tmux. | experimental | [S11] |
| OMO05 | Persistent goal loop | OMO goal subsystem | `/goal` persists an objective and continues on idle; default is disabled. | documented | [S11] |
| OMO06 | Dependency-aware task graph | OMO task-management layer | File-backed tasks use `blockedBy`/`blocks`; unblocked tasks can run in parallel. | documented | [S11] |
| OMO07 | Hook pipeline with guardrails | OMO hook layer | Composes lifecycle slots for tool guards, transforms and continuation. | documented | [S11] |
| OMO08 | Safety and quality guard hooks | OMO hook layer | Guards cover stale writes, shell reads, web redirects, tool pairs and comments. | documented | [S11] |
| OMO09 | Multi-source skill catalog | OMO skills | Skills support local/remote sources, enable/disable lists and allowed tools. | documented | [S10] |
| OMO10 | Runtime-injected MCP bundle | OMO integration layer | Ultimate advertises web search, docs lookup, GitHub search and LSP MCPs. | documented | [S9] |
| OMO11 | Per-agent persistent memory | OMO memory | Git-backed memory supports overrides, reflection, nudges and search. | documented | [S10] |
| OMO12 | Memory consolidation and people records | OMO memory | Idle/shutdown “dream” consolidates memory and people records. | documented | [S10] |
| OMO13 | Memory synchronization | OMO memory | Sync and search are independently configurable. | documented | [S10] |
| OMO14 | Browser and tmux adapters | OMO integrations | Browser providers and tmux layouts host background agents. | documented | [S10] |
| OMO15 | Runtime model fallback | OMO stability | Retries, cooldowns, timeouts and fallback settings are configurable. | documented | [S10] |
| OMO16 | Hashline editing | OMO edit | Opt-in hashed anchors reject stale edits. | documented | [S10] |
| OMO17 | Model capability snapshot | OMO model | A refreshable local capability cache is configurable. | documented | [S10] |
| OMO18 | Unified multi-harness configuration | OMO configuration layer | The repository is extracting shared Core/MCP/Skills layers toward adapters; Pi support remains exploratory. | documented; moving roadmap | [S9] |

The OMO README and roadmap are especially important for scope control: mature behavior is concentrated in the OpenCode edition, while the multi-harness/Pi adapter direction is a moving development target. A Pi+ harness should treat OMO as a source of portable orchestration ideas and adapter boundaries, not as evidence that Pi parity already exists.

### Pi+ translation candidates

These are deliberately marked `proposed`; they are not claims that any project ships them as a unified feature.

| ID | Proposed feature | Evidence it combines | Status |
|---|---|---|---|
| P01 | Provider-neutral agent profile | Claude subagent configuration + OpenCode per-agent model/prompt/permissions + OMO category routing. | proposed |
| P02 | Policy envelope per run | Claude pre-tool hooks + OpenCode allow/ask/deny + OMO guard hooks and fallback settings. | proposed |
| P03 | One extension manifest | Claude plugin component directories + OpenCode plugin loading + OMO skill/MCP layering. | proposed |
| P04 | Explicit context budget inspector | Claude’s documented loading costs + OpenCode instruction layering + OMO memory compilation warnings. | proposed |
| P05 | Adapter-backed team execution | Claude Agent Teams + OpenCode child sessions + OMO Team Mode, with Pi-specific isolation chosen explicitly. | proposed |
| P06 | Reviewable autonomous loop | Claude stop hooks + OMO goals/tasks/fallbacks + a Pi acceptance/stop policy. | proposed |

### Primary sources

Twelve primary source pages/repositories were used for the catalogue:

1. [S1 — Claude Code: Extend Claude Code](https://code.claude.com/docs/en/features-overview)
2. [S2 — Claude Code: Hooks reference](https://code.claude.com/docs/en/hooks)
3. [S3 — Claude Code: Create plugins](https://code.claude.com/docs/en/plugins)
4. [S4 — Claude Code: Agent Teams](https://code.claude.com/docs/en/agent-teams)
5. [S5 — Claude Code: How Claude remembers your project](https://code.claude.com/docs/en/memory)
6. [S6 — OpenCode: Agents](https://opencode.ai/docs/agents/)
7. [S7 — OpenCode: Config](https://dev.opencode.ai/docs/config)
8. [S8 — OpenCode: Plugins](https://opencode.ai/docs/plugins/)
9. [S9 — code-yeongyu/oh-my-openagent repository](https://github.com/code-yeongyu/oh-my-openagent/)
10. [S10 — OMO configuration reference](https://github.com/code-yeongyu/oh-my-openagent/blob/dev/docs/reference/configuration.md)
11. [S11 — OMO feature reference](https://github.com/code-yeongyu/oh-my-openagent/blob/dev/docs/reference/features.md)
12. [S12 — Claude Code hooks guide](https://code.claude.com/docs/en/hooks-guide)


Reference definitions for row citations:

[S1]: https://code.claude.com/docs/en/features-overview
[S2]: https://code.claude.com/docs/en/hooks
[S3]: https://code.claude.com/docs/en/plugins
[S4]: https://code.claude.com/docs/en/agent-teams
[S5]: https://code.claude.com/docs/en/memory
[S6]: https://opencode.ai/docs/agents/
[S7]: https://dev.opencode.ai/docs/config
[S8]: https://opencode.ai/docs/plugins/
[S9]: https://github.com/code-yeongyu/oh-my-openagent/
[S10]: https://github.com/code-yeongyu/oh-my-openagent/blob/dev/docs/reference/configuration.md
[S11]: https://github.com/code-yeongyu/oh-my-openagent/blob/dev/docs/reference/features.md
[S12]: https://code.claude.com/docs/en/hooks-guide

## Other coding harnesses

Source report: [coding-harnesses.md](./coding-harnesses.md).

_Research date: 2026-09-11. Scope: Aider, Cline, Roo Code, Goose, OpenHands, SWE-agent, and Continue._

This is a source-backed feature catalogue, not a completeness claim or a recommendation ranking. It is grounded in the cited first-party documentation and repositories, with research assistance used for source discovery. No claim here should be read as a personally executed cross-agent workflow test. Each row is a concrete behavior that a Pi+ harness could study. `Documented` means the first-party source describes the behavior; `Experimental` means the source labels it experimental; `Proposed (Pi+)` is a clearly marked synthesis, not an existing feature of the named project.

The projects are not equivalent products. Aider, Cline, Roo Code, Goose, OpenHands, and SWE-agent are end-user agent/harness products or runtimes. Continue is primarily a configurable agent platform spanning IDE extensions, CLI, and CI. OpenHands and SWE-agent also expose framework/runtime surfaces. “Full harness” and “framework/library” below describe the relevant surface for that row, not the entire project.

### Catalogue

| # | Feature title and observed behavior | Project | Source URL | Status | Surface |
|---:|---|---|---|---|---|
| 1 | **Repository map context:** Repository map sends a compact whole-repository view with files, important symbols, types, and signatures to the model. | Aider | https://aider.chat/docs/repomap.html | Documented | Full harness |
| 2 | **Graph-ranked map selection:** Repository-map selection uses dependency-graph ranking and selects only the most relevant map portion for the active token budget. | Aider | https://aider.chat/docs/repomap.html | Documented | Full harness |
| 3 | **Map-token budget:** `--map-tokens` controls the normal repository-map budget, while Aider can expand it when little project context has yet been added. | Aider | https://aider.chat/docs/repomap.html | Documented | Full harness |
| 4 | **Read-only ask mode:** Ask mode discusses the code and answers questions without making changes. | Aider | https://aider.chat/docs/usage/modes.html | Documented | Full harness |
| 5 | **Architect/editor split:** Architect mode uses one model to propose a change and an editor model to translate that proposal into file edits. | Aider | https://aider.chat/docs/usage/modes.html | Documented | Full harness |
| 6 | **Sticky and per-message modes:** Modes can be selected for one message or made sticky for subsequent messages; Aider supports code, ask, architect, and help modes. | Aider | https://aider.chat/docs/usage/modes.html | Documented | Full harness |
| 7 | **Git auto-commits:** Each edit is committed with a descriptive Git commit; pre-existing dirty changes are committed separately before Aider edits. | Aider | https://aider.chat/docs/git.html | Documented | Full harness |
| 8 | **In-chat Git rollback:** `/diff`, `/undo`, `/commit`, and `/git` expose human-readable review, rollback, commit, and raw-Git control in the chat. | Aider | https://aider.chat/docs/git.html | Documented | Full harness |
| 9 | **Multi-file repair loop:** Cline coordinates multi-file edits and watches linter/compiler output, correcting issues such as imports, type errors, and syntax errors during the task. | Cline | https://github.com/cline/cline | Documented | Full harness |
| 10 | **Reviewable checkpoints:** File edits are presented as diffs that the user can review, modify, or revert; changes are tracked with checkpoints. | Cline | https://github.com/cline/cline | Documented | Full harness |
| 11 | **Background terminal loop:** Terminal commands run with live output; long-running processes can continue in the background while Cline reacts to new output and failures. | Cline | https://github.com/cline/cline | Documented | Full harness |
| 12 | **Plan mode:** Plan mode gathers context, asks clarifying questions, and produces a strategy without executing actions through a dedicated planning response tool. | Cline | https://github.com/cline/cline/blob/main/.clinerules/cline-overview.md | Documented | Full harness |
| 13 | **Act mode:** Act mode executes the plan with file and terminal tools and returns completion feedback. | Cline | https://github.com/cline/cline/blob/main/.clinerules/cline-overview.md | Documented | Full harness |
| 14 | **Tool approval boundary:** Every file edit and terminal command can require approval; an auto-approve option is available for autonomous operation. | Cline | https://github.com/cline/cline | Documented | Full harness |
| 15 | **Mode-specific prompting and state:** Plan and Act can have different model configurations and different system prompts; controller state persists task state and checkpoints across webview reloads. | Cline | https://github.com/cline/cline/blob/main/.clinerules/cline-overview.md | Documented | Full harness |
| 16 | **Built-in mode set:** Built-in modes specialize interaction into Code, Architect, Ask, Debug, and an Orchestrator mode, alongside custom modes. | Roo Code | https://github.com/RooCodeInc/Roo-Code | Documented | Full harness |
| 17 | **Mode tool and file restrictions:** A mode can define tool groups and file-access permissions, including read-only modes or restricted editable file types. | Roo Code | https://github.com/RooCodeInc/Roo-Code/blob/main/apps/docs/docs/features/custom-modes.mdx | Documented | Full harness |
| 18 | **Custom mode metadata:** Custom modes carry a slug, display name, description, role definition, optional “when to use” guidance, and custom instructions. | Roo Code | https://github.com/RooCodeInc/Roo-Code/blob/main/apps/docs/docs/features/custom-modes.mdx | Documented | Full harness |
| 19 | **Delegation guidance:** The optional `whenToUse` field guides automatic mode selection and Orchestrator delegation; it is separate from the user-facing description. | Roo Code | https://github.com/RooCodeInc/Roo-Code/blob/main/apps/docs/docs/features/custom-modes.mdx | Documented | Full harness |
| 20 | **Persistent mode switching:** Mode switching is available through the selector, slash commands, and a keyboard shortcut; the selected mode persists between sessions. | Roo Code | https://github.com/RooCodeInc/Roo-Code/blob/main/apps/docs/docs/basic-usage/using-modes.md | Documented | Full harness |
| 21 | **Sticky models:** Each mode remembers its last model (“sticky models”), allowing different preferred models for different workflows. | Roo Code | https://github.com/RooCodeInc/Roo-Code/blob/main/apps/docs/docs/features/custom-modes.mdx | Documented | Full harness |
| 22 | **Workspace rule hierarchy:** Workspace rules are loaded recursively from `.roo/rules/` in alphabetical order; an empty directory falls back to `.roorules`. | Roo Code | https://github.com/RooCodeInc/Roo-Code/blob/main/apps/docs/docs/features/custom-instructions.md | Documented | Full harness |
| 23 | **Mode-specific rule files:** Mode-specific rules use `.roo/rules-{modeSlug}/` or `.roorules-{modeSlug}` and are appended to that mode’s system prompt. | Roo Code | https://github.com/RooCodeInc/Roo-Code/blob/main/apps/docs/docs/features/custom-instructions.md | Documented | Full harness |
| 24 | **Tool feedback and auto-approval:** Tools can be approved or rejected one at a time, with optional user feedback; auto-approval settings can change that control boundary. | Roo Code | https://github.com/RooCodeInc/Roo-Code/blob/main/apps/docs/docs/faq.md | Documented | Full harness |
| 25 | **Developer extension tools:** Goose’s developer extension exposes shell, read, and write tools; the default autonomous mode can run commands with user privileges and edit accessible files. | Goose | https://github.com/aaif-goose/goose/blob/main/documentation/docs/mcp/developer-mcp.md | Documented | Full harness |
| 26 | **Permission modes:** Permission modes include autonomous, manual approval, smart approval, and chat-only; smart approval lets the system decide which actions need review. | Goose | https://github.com/aaif-goose/goose/blob/main/documentation/docs/mcp/developer-mcp.md | Documented | Full harness |
| 27 | **Per-tool permission rules:** Individual extension tools can be set to always allow, ask before, or never allow in manual and smart approval modes. | Goose | https://github.com/aaif-goose/goose/blob/main/documentation/docs/mcp/developer-mcp.md | Documented | Full harness |
| 28 | **Tool-output controls:** Tool output size can be capped for smaller-context models, while a debug setting can expose full tool parameters during investigation. | Goose | https://github.com/block/goose/blob/main/documentation/docs/guides/environment-variables.md | Documented | Full harness |
| 29 | **Context overflow strategy:** Context overflow behavior is configurable as summarize, truncate, clear, or prompt; interactive and headless defaults differ. | Goose | https://github.com/block/goose/blob/main/documentation/docs/guides/environment-variables.md | Documented | Full harness |
| 30 | **Turn and concurrency limits:** Maximum turns can be set globally, for gateways, and for subagents; concurrent background subagent count is configurable. | Goose | https://github.com/block/goose/blob/main/documentation/docs/guides/environment-variables.md | Documented | Full harness |
| 31 | **Recipe-scoped extensions:** Recipes can explicitly list extensions and available tools; when an extension block is present, only listed extensions are available, including for subagent delegation. | Goose | https://github.com/aaif-goose/goose/blob/main/documentation/docs/guides/recipes/recipe-reference.md | Documented | Full harness |
| 32 | **Recipe secret prompts:** Recipe extension secrets are requested when missing, stored in the system keyring, and reusable on later runs; optional variables can be skipped. | Goose | https://github.com/aaif-goose/goose/blob/main/documentation/docs/guides/recipes/recipe-reference.md | Documented | Full harness |
| 33 | **Session-isolated IDs:** A session ID is injected into extension and developer-shell environments so tools can create session-isolated handoff paths and correlate work. | Goose | https://github.com/block/goose/blob/main/documentation/docs/guides/environment-variables.md | Documented | Full harness |
| 34 | **Prompt and security controls:** Prompt composition can use an external editor, and security settings expose prompt-injection detection plus an optional ML classifier. | Goose | https://github.com/block/goose/blob/main/documentation/docs/guides/environment-variables.md | Documented | Full harness |
| 35 | **Docker sandbox:** OpenHands’ Docker runtime executes agent actions in an isolated container to improve security, resource control, consistency, and reproducibility. | OpenHands | https://github.com/OpenHands/docs/blob/main/openhands/usage/architecture/runtime.mdx | Documented | Full harness + runtime |
| 36 | **Custom runtime components:** The runtime can initialize a custom image with browser, Bash, plugins, and Jupyter components, while an action-execution server mediates observations. | OpenHands | https://github.com/OpenHands/docs/blob/main/openhands/usage/architecture/runtime.mdx | Documented | Full harness + runtime |
| 37 | **Backend/workspace separation:** The browser UI, backend, conversation, model, and workspace are separate concepts; workspace placement determines which files and tools the agent can access. | OpenHands | https://github.com/OpenHands/docs/blob/main/openhands/usage/agent-canvas/overview.mdx | Documented | Full harness + runtime |
| 38 | **Conversation branching:** A conversation has its own history, agent configuration, and backend-managed state; conversations can be branched to explore another path while preserving the original. | OpenHands | https://github.com/OpenHands/docs/blob/main/openhands/usage/agent-canvas/overview.mdx | Documented | Full harness + runtime |
| 39 | **ACP agent backend:** OpenHands can use its own agent or an ACP-compatible agent, separating the control surface from the selected agent/model backend. | OpenHands | https://github.com/OpenHands/docs/blob/main/openhands/usage/agent-canvas/overview.mdx | Documented | Full harness + runtime |
| 40 | **Triggered skill context:** Skills provide reusable specialized behavior and context through structured prompts; path- and keyword-triggered skills can load deterministically or on matching prompts. | OpenHands | https://docs.openhands.dev/sdk/guides/skill | Documented | Framework/SDK + full harness |
| 41 | **Goal-completion loop:** A goal strategy can continue a conversation toward a verifiable objective using completion checks and resumable goal state. | OpenHands | https://docs.openhands.dev/sdk/guides/convo-goal | Documented | Framework/SDK + full harness |
| 42 | **Conversation persistence:** A conversation can save state to disk and restore it later using the same conversation ID and persistence directory, including messages, configuration, execution state, tool outputs, and workspace context. | OpenHands | https://docs.openhands.dev/sdk/guides/convo-persistence | Documented | Framework/SDK + full harness |
| 43 | **Critic-driven refinement:** The experimental Critic scores agent actions and can automatically send follow-up prompts when the score is below a threshold, up to a configured iteration limit. | OpenHands | https://docs.openhands.dev/sdk/guides/critic | Experimental | Framework/SDK + full harness |
| 44 | **Problem/agent/environment config:** SWE-agent separates problem statement, agent/model configuration, and execution environment configuration at the command line and in YAML. | SWE-agent | https://github.com/SWE-agent/SWE-agent/blob/main/docs/usage/hello_world.md | Documented | Full harness + runtime |
| 45 | **Layered YAML config:** Configuration can be layered across multiple YAML files and command-line overrides using hierarchical merge behavior. | SWE-agent | https://github.com/SWE-agent/SWE-agent/blob/main/docs/usage/cl_tutorial.md | Documented | Full harness + runtime |
| 46 | **Deployment backends:** Deployment targets include Docker by default, Modal, AWS Fargate, and direct local execution (documented as not recommended); custom images and startup commands are supported. | SWE-agent | https://github.com/SWE-agent/SWE-agent/blob/main/docs/usage/hello_world.md | Documented | Full harness + runtime |
| 47 | **Configurable action loop:** System and instance prompts are fully configurable; the main loop lets the model suggest actions, executes them, and ends through a `submit` action that yields a patch. | SWE-agent | https://github.com/SWE-agent/SWE-agent/blob/main/docs/usage/hello_world.md | Documented | Full harness + runtime |
| 48 | **Patch/PR submission:** A successful patch can be applied to local files or used to open a pull request when running against a GitHub issue. | SWE-agent | https://github.com/SWE-agent/SWE-agent/blob/main/docs/usage/cl_tutorial.md | Documented | Full harness + runtime |
| 49 | **Trajectory inspection:** Every run stores a trajectory; CLI and web inspectors let humans navigate trajectories, steps, reduced/full views, logs, and benchmark results. | SWE-agent | https://github.com/SWE-agent/SWE-agent/blob/main/docs/usage/inspector.md | Documented | Full harness + runtime |
| 50 | **Single and batch runs:** `run` handles one problem while `run-batch` handles lists of problems for benchmarking or historical issue batches. | SWE-agent | https://github.com/SWE-agent/SWE-agent/blob/main/docs/usage/hello_world.md | Documented | Full harness + runtime |
| 51 | **Multi-interface custom agents:** Continue supports custom agents across VS Code and JetBrains extensions and positions the same configuration surface for terminal and CI use. | Continue | https://github.com/continuedev/continue/blob/main/docs/home.mdx | Documented | Framework/platform |
| 52 | **Capability-specific models:** Agent, Chat, Edit, and Autocomplete are separate capability roles, with models configurable for different capabilities. | Continue | https://github.com/continuedev/continue/blob/main/docs/home.mdx | Documented | Framework/platform |
| 53 | **Scoped reusable config:** Local configurations can define reusable models, rules, and tools; global and workspace scopes apply configurations automatically in different contexts. | Continue | https://docs.continue.dev/guides/configuring-models-rules-tools | Documented | Framework/platform |
| 54 | **Rule concatenation:** Rules are concatenated into the system message for Agent, Chat, and Edit requests. | Continue | https://github.com/continuedev/continue/blob/main/docs/reference.mdx | Documented | Framework/platform |
| 55 | **Slash-invokable prompts:** Prompts can be packaged as reusable files or registry references and invoked through slash commands. | Continue | https://github.com/continuedev/continue/blob/main/docs/reference.mdx | Documented | Framework/platform |
| 56 | **Context providers:** Context providers can supply files, code, diffs, HTTP resources, and terminal output with provider-specific parameters. | Continue | https://github.com/continuedev/continue/blob/main/docs/reference.mdx | Documented | Framework/platform |
| 57 | **Documentation indexing:** Documentation sites can be indexed from a start URL, with an option to use only a local crawler. | Continue | https://github.com/continuedev/continue/blob/main/docs/reference.mdx | Documented | Framework/platform |
| 58 | **MCP server configuration:** MCP servers are configured with command, arguments, environment, working directory, request options, and connection timeout. | Continue | https://github.com/continuedev/continue/blob/main/docs/reference.mdx | Documented | Framework/platform |
| 59 | **Composable context lanes (Pi+ proposal):** Combine repo-map/symbol context, project rules, path-triggered rules, and explicit user attachments as separately inspectable inputs rather than one opaque prompt. | Pi+ synthesis | Aider: https://aider.chat/docs/repomap.html; Continue: https://github.com/continuedev/continue/blob/main/docs/reference.mdx; OpenHands: https://docs.openhands.dev/sdk/guides/skill | Proposed (Pi+) | Harness design |
| 60 | **Approval-policy matrix (Pi+ proposal):** Make approval a per-tool and per-risk policy with explicit plan-only, ask-before, auto-approved, and never-allowed states, preserving an audit trail. | Pi+ synthesis | Cline: https://github.com/cline/cline; Goose: https://github.com/aaif-goose/goose/blob/main/documentation/docs/mcp/developer-mcp.md; Roo Code: https://github.com/RooCodeInc/Roo-Code/blob/main/apps/docs/docs/faq.md | Proposed (Pi+) | Harness design |
The two Pi+ rows are design hypotheses derived from documented patterns; they are not claims that Pi or any listed project already implements the combined behavior. The catalogue intentionally leaves out generic “can edit files” claims unless the source exposed a more specific loop, boundary, context mechanism, or human-control behavior.

### Primary-source set

The evidence comes from seven first-party source families (the row links point to the relevant page): Aider documentation, the Cline repository/docs, the Roo Code repository/docs, Goose documentation/repository, OpenHands documentation/repository, SWE-agent documentation/repository, and Continue documentation/repository. This is deliberately a bounded catalogue, not a universal survey of all agent harnesses or all features in these projects.

## Codex and Gemini ecosystems

Source report: [codex-gemini.md](./codex-gemini.md).

Research date: 2026-09-11  
Status: documented in live official documentation; not personally tested in this research pass.  
Scope: granular features relevant to customizable context/prompts, execution loops, subagents, tools, sessions, tracing, and graph/workflow orchestration.

The source set is intentionally first-party: OpenAI Codex and Agents SDK documentation, Gemini CLI documentation, and Google ADK documentation. Behaviors below are paraphrased; they are not claims that Pi+ already implements them.

### Catalogue

| # | Product | Documented feature | What the documentation says | Pi+ catalogue implication | Official source |
|---:|---|---|---|---|---|
| 1 | Codex | Layered `AGENTS.md` instruction discovery | Codex reads global guidance, then walks from the project root to the current directory; later files are appended later and therefore take precedence. It accepts `AGENTS.override.md` at each level. | Model instruction provenance as an ordered stack with visible scope and precedence, not as one opaque system prompt. | [Custom instructions with AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md) |
| 2 | Codex | Custom instruction filenames and size cap | `project_doc_fallback_filenames` can make names such as `TEAM_GUIDE.md` discoverable, while `project_doc_max_bytes` limits the combined instruction payload. | Add configurable context-file names plus a preflight warning when effective instructions are truncated. | [Custom instructions with AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md) |
| 3 | Codex | Named configuration profiles | A profile overlays the base `config.toml`; the CLI can select it per invocation. Profiles can change model, reasoning effort, approvals, and model catalogs. | Support named “modes” for review, implementation, research, or low-cost operation with explicit effective-config display. | [Advanced configuration](https://learn.chatgpt.com/docs/config-file/config-advanced) |
| 4 | Codex | Lifecycle hooks | Hooks can be defined in `hooks.json` or inline config tables at user and trusted project layers. | Expose lifecycle extension points for pre-turn, post-turn, tool, and session events, with trust boundaries shown in the UI. | [Advanced configuration](https://learn.chatgpt.com/docs/config-file/config-advanced) |
| 5 | Codex | MCP server integration | Codex supports local STDIO and Streamable HTTP MCP servers, server instructions, OAuth/bearer auth, project-scoped configuration, tool enable/disable lists, per-tool approval, and timeouts. | Treat external capabilities as named, inspectable tool providers with transport, auth, readiness, policy, and per-tool controls. | [Model Context Protocol](https://learn.chatgpt.com/docs/extend/mcp) |
| 6 | Codex | Subagent delegation and inspection | Codex can delegate independent work to subagents; the app exposes subagent activity and threads, while the CLI provides `/agent` to inspect or switch threads. | Make delegation a first-class runtime object with parent/child relationships, status, partial results, and inspectable context. | [Subagents](https://learn.chatgpt.com/docs/agent-configuration/subagents) |
| 7 | Codex | Prefix-based command policy rules | `.rules` files can allow, prompt, or forbid command prefixes. Rules support justifications and inline positive/negative match cases; the most restrictive matching decision wins. | Build command policy as reviewable data with test examples and conservative composition, rather than scattered ad-hoc prompts. | [Rules](https://learn.chatgpt.com/docs/agent-configuration/rules) |
| 8 | Codex | Record-and-replay workflow capture | On supported macOS setups, a user can demonstrate a workflow and have Codex turn it into a reusable skill with inputs, steps, and verification guidance. | Add a “teach by demonstration” path for repeatable UI/tool workflows, with generated skill review before activation. | [Record & Replay](https://learn.chatgpt.com/docs/extend/record-and-replay) |
| 9 | Codex | Programmatic SDK thread lifecycle | The Codex SDK can start, continue, and resume local threads by ID; the app-server supplies authentication, history, approvals, and streamed events. | Make session IDs durable and resumable across UI restarts, while keeping a server-side runtime owner separate from the renderer. | [Codex SDK](https://learn.chatgpt.com/docs/codex-sdk) |
| 10 | Codex | Machine-readable app-server and exec streams | The app-server uses bidirectional JSON-RPC; non-interactive `codex exec --json` emits JSONL lifecycle/item events, and `--output-schema` constrains final output to JSON Schema. | Define a typed event protocol for Pi+ with replayable lifecycle events and optional schema-constrained task results. | [Codex App Server](https://learn.chatgpt.com/docs/app-server), [Non-interactive mode](https://learn.chatgpt.com/docs/non-interactive-mode) |
| 11 | OpenAI Agents SDK | Agent instructions, prompt templates, runtime context, and structured output | An `Agent` can use static or dynamic instructions, prompt configuration, application context/dependencies, model settings, and a declared output type. | Separate user prompt, durable system policy, runtime context, and output contract in Pi+’s agent definition model. | [Agent definitions](https://openai.github.io/openai-agents-python/agents/) |
| 12 | OpenAI Agents SDK | Managed agent loop | `Runner` owns repeated turns, tool execution, handoffs, guardrails, and termination until the task completes; applications can instead own the loop through a lower-level API. | Offer both a safe managed loop and an advanced “bring your own loop” mode, with clear ownership of state and termination. | [OpenAI Agents SDK overview](https://openai.github.io/openai-agents-python/), [Running agents](https://openai.github.io/openai-agents-python/running_agents/) |
| 13 | OpenAI Agents SDK | Function tools with generated schemas | A Python function can become a tool with automatic argument-schema generation and Pydantic validation; docstrings and annotations describe the interface. | Generate tool contracts from typed definitions, display the schema to users, and validate before execution. | [Tools](https://openai.github.io/openai-agents-python/tools/) |
| 14 | OpenAI Agents SDK | Hosted and local tool families | The SDK documents hosted web/file/code/MCP/image tools, local shell/computer/apply-patch tools, function tools, and agents-as-tools as distinct execution categories. | Show execution location, capability class, approval behavior, and data boundary for every Pi+ tool. | [Tools](https://openai.github.io/openai-agents-python/tools/) |
| 15 | OpenAI Agents SDK | Deferred tool search and namespaces | Large tool surfaces can be deferred; the model searches and loads only a namespace or tool subset needed for the current turn. | Add lazy capability loading and tool namespaces to reduce prompt/tool-schema pressure without hiding availability. | [Tools](https://openai.github.io/openai-agents-python/tools/) |
| 16 | OpenAI Agents SDK | Programmatic tool calling | The model can generate JavaScript in a hosted V8 environment to coordinate eligible tools with loops, branches, parallel calls, and intermediate calculations without a model round trip for each call. | Consider a bounded “tool workflow” runtime for fan-out/fan-in tasks, with explicit allowed tools and resource limits. | [Tools](https://openai.github.io/openai-agents-python/tools/) |
| 17 | OpenAI Agents SDK | Agents as tools versus handoffs | One agent can call another as a contained tool, or transfer the conversation to a specialist through a handoff. Handoffs can carry typed metadata and input filters. | Represent delegation patterns explicitly: manager retains control for contained work; handoff transfers conversational ownership. | [Tools](https://openai.github.io/openai-agents-python/tools/), [Handoffs](https://openai.github.io/openai-agents-python/handoffs/) |
| 18 | OpenAI Agents SDK | Persistent sessions and pluggable storage | Sessions provide persistent working context across runs; the documentation lists in-memory, SQLite, SQLAlchemy, encrypted, Redis, MongoDB, Dapr, and other session implementations. | Make conversation/session storage an adapter boundary, with local-first persistence and optional shared backends. | [Sessions](https://openai.github.io/openai-agents-python/sessions/) |
| 19 | OpenAI Agents SDK | Human approval, interruptions, and resume | Tool calls can pause for approval; the run result exposes interruption state, and the application can approve/reject and resume using preserved run state. | Treat approval as a resumable state transition, not a blocking modal that loses the run if the UI reconnects. | [Human-in-the-loop](https://openai.github.io/openai-agents-python/human_in_the_loop/), [Running agents](https://openai.github.io/openai-agents-python/running_agents/) |
| 20 | OpenAI Agents SDK | Input, output, and tool guardrails | Guardrails can validate inputs and final outputs; tool guardrails can inspect or block calls before/after execution and raise tripwires that halt the run. | Use a composable policy pipeline around turns and tools, with structured rejection reasons and audit events. | [Guardrails](https://openai.github.io/openai-agents-python/guardrails/) |
| 21 | OpenAI Agents SDK | Built-in tracing with traces and spans | Tracing records LLM generations, tool calls, handoffs, guardrails, and custom events; traces can be disabled globally or per run and are visualized in a dashboard. | Give every Pi+ run a trace identity and span tree, with redaction/disable controls and a user-facing timeline. | [Tracing](https://openai.github.io/openai-agents-python/tracing/) |
| 22 | Gemini CLI | Hierarchical and just-in-time context files | Gemini CLI loads global, workspace/parent, and just-in-time ancestor `GEMINI.md` files; the active context-file count is shown in the footer. | Show exactly which context files are active for a turn and load directory-specific guidance only when that area is touched. | [Provide context with GEMINI.md files](https://geminicli.com/docs/cli/gemini-md/) |
| 23 | Gemini CLI | Context imports and configurable filename | `GEMINI.md` can import relative or absolute Markdown files with `@...`; settings can replace or extend the context filename list, including `AGENTS.md`. | Support modular prompt composition and project migration from other instruction conventions without copying files. | [Provide context with GEMINI.md files](https://geminicli.com/docs/cli/gemini-md/) |
| 24 | Gemini CLI | Project/global custom commands | TOML prompt commands can be global or project-local; project commands override same-named user commands, and paths create namespaced commands such as `/git:commit`. | Add reusable prompt macros with repository override, namespacing, reload, and argument interpolation. | [Custom commands](https://geminicli.com/docs/cli/custom-commands/) |
| 25 | Gemini CLI | Autosaved, searchable, resumable sessions | Sessions save prompts, responses, tool executions, token usage, and available reasoning summaries; users can resume by latest session, index, or ID and create named checkpoints. | Persist full run history and provide search, preview, resume, and named branch points as core session UX. | [Session management](https://geminicli.com/docs/cli/session-management/) |
| 26 | Gemini CLI | Parallel sessions with Git worktrees | The documentation recommends Git worktrees to give concurrent sessions separate copies of a repository and avoid collisions. | Add a “parallel task workspace” option that binds each child run to an isolated worktree or equivalent workspace. | [Session management](https://geminicli.com/docs/cli/session-management/) |
| 27 | Gemini CLI | MCP tools, resources, instructions, and session toggles | MCP servers expose discoverable tools and resources; servers can be enabled/disabled persistently or for only the current session, and server instructions are appended to system instructions. | Support capability discovery plus temporary per-run tool activation, while retaining provider instructions and readiness state. | [MCP servers with Gemini CLI](https://geminicli.com/docs/tools/mcp-server/) |
| 28 | Gemini CLI | Synchronous lifecycle hooks | Hooks can inject context, validate or rewrite tool arguments, filter tools, modify model input/output, log activity, retry, halt, or block. Matchers distinguish tool regexes from lifecycle event names. | Build deterministic interception points with explicit timing, matcher scope, timeout, and block/rewrite semantics. | [Gemini CLI hooks](https://geminicli.com/docs/hooks/), [Hooks reference](https://geminicli.com/docs/hooks/reference/) |
| 29 | Gemini CLI | Isolated subagents | Subagents have separate context loops, personas, tool lists, optional inline MCP servers, model/run limits, and recursion protection; users can invoke them automatically or with `@name`. | Let Pi+ define specialist agents as capability-isolated workers with bounded turns/time and deliberate parent result transfer. | [Subagents](https://geminicli.com/docs/core/subagents/) |
| 30 | Gemini CLI | Extension packaging | Extensions can bundle prompts, MCP servers, custom commands, themes, hooks, subagents, skills, and policy files for installable/shareable capability packs. | Define a Pi+ extension manifest that packages behavior, tools, UI customization, policies, and specialized workflows together. | [Gemini CLI extensions](https://geminicli.com/docs/extensions/), [Extension reference](https://geminicli.com/docs/extensions/reference/) |
| 31 | Google ADK | Agent instructions, tools, and multi-agent composition | ADK agents combine a model, task instructions, and optional tools; agents can interact with users, use external tools, and coordinate with other agents. | Keep a small agent primitive, then compose it through explicit tools, workers, and workflows rather than multiplying bespoke agent types. | [Agents](https://adk.dev/agents/) |
| 32 | Google ADK | Explicit graph workflow nodes and edges | ADK 2.0 graphs combine agents, tools, functions, and human-input nodes with explicit edges; code can run without an LLM invocation, improving predictability. | Add a visual and serializable workflow graph for deterministic Pi+ orchestration, alongside prompt-driven loops. | [Graph-based agent workflows](https://adk.dev/graphs/) |
| 33 | Google ADK | Conditional routing and multi-branch dispatch | Graph routes can dispatch to named branches, provide a default route, and route to multiple matching branches from one classifier result. | Make routing visible as a graph edge decision with typed route values, fallback behavior, and fan-out semantics. | [Graph routes](https://adk.dev/graphs/routes/) |
| 34 | Google ADK | Dynamic workflows for programmatic control flow | Dynamic workflows are intended for programmatic orchestration such as loops, conditionals, and recursion when a static graph is too rigid. | Support code-owned orchestration for iterative tasks while preserving event, cancellation, and trace visibility. | [Dynamic workflows](https://adk.dev/graphs/dynamic/) |
| 35 | Google ADK | Prebuilt sequential, parallel, and loop workflows | ADK supplies deterministic workflow agents for running sub-agents sequentially, in parallel, or repeatedly until a termination condition is met. | Ship reusable loop templates with explicit termination conditions, concurrency, and aggregation rather than asking the model to simulate them in prose. | [Template workflows](https://adk.dev/agents/workflow-agents/) |
| 36 | Google ADK | Function tools and MCP tools | ADK documents custom function tools plus MCP tools for connecting agents to external systems and standardized tool surfaces. | Use one Pi+ tool registry that supports local functions and MCP providers while preserving typed schemas and provider identity. | [Function tools](https://adk.dev/tools-custom/function-tools/), [MCP tools](https://adk.dev/tools-custom/mcp-tools/) |
| 37 | Google ADK | Callback interception points | Callbacks run at defined agent/model/tool lifecycle points and can implement checks, logging, context changes, or behavior modification. | Expose before/after hooks around agent, model, tool, and workflow nodes; make ordering and short-circuit behavior explicit. | [Types of callbacks](https://adk.dev/callbacks/types-of-callbacks/) |
| 38 | Google ADK | Sessions, state, memory, and context compaction/caching | ADK separates session history, session state, long-term memory, events, context compression, and model context caching as configurable context mechanisms. | Treat context as a managed data product: session transcript, mutable state, retrieved memory, artifacts, compaction, and cache should be inspectable separately. | [Sessions and conversational context](https://adk.dev/sessions/), [State](https://adk.dev/sessions/state/), [Memory](https://adk.dev/sessions/memory/), [Context compression](https://adk.dev/context/compaction/), [Model context caching](https://adk.dev/context/caching/) |
| 39 | Google ADK | Trace observability | ADK documents trace observability for inspecting agent execution and integrating run behavior with production monitoring. | Record node, model, tool, callback, and session spans so Pi+ can explain what happened and compare workflow runs. | [Traces](https://adk.dev/observability/traces/) |

### Source and evidence note

This is a documentation-derived feature catalogue captured from live official pages on 2026-09-11. No package was installed, no repository was cloned, and no feature was executed or personally tested as part of this pass. Availability, preview labels, version requirements, and product behavior can change; re-check the linked pages before treating a row as an implementation contract.

## Graph orchestration

Source report: [graphs-orchestration.md](./graphs-orchestration.md).

Research snapshot: 2026-09-11. This is a targeted catalogue of concrete, granular capabilities found in first-party documentation or repositories. It is not a universal feature-completeness claim, benchmark, or recommendation to adopt any framework wholesale.

### Scope and interpretation

- **Framework/library/runtime:** LangGraph, AutoGen, CrewAI, Microsoft Agent Framework (MAF), and Mastra provide execution primitives that a host application still has to embed. They are not, by themselves, complete Pi-style coding harnesses with Supernova-like UI, permissions, workspace policy, session UX, or product operations.
- **Companion platform:** LangSmith Studio and CrewAI AMP add developer or deployment surfaces around their runtimes; their capabilities are labelled separately where relevant.
- **Adjacent automation platform:** n8n is a broader workflow-automation product with an AI-agent layer. Its workflow, execution, approval, and debugging features are relevant references, but it should not be mistaken for a focused coding-agent harness.
- **Status:** `documented` means described as available in the cited first-party material; `experimental` means the cited material explicitly labels the capability experimental or preview; `proposed` means a Pi+ design implication, not an existing feature of the cited project.

### Feature catalogue

#### Canonical primary-source set

The comparison is anchored on these ten first-party source families. Row-level links point to the exact official page used where a project exposes a more granular document; repeated links are intentional and do not imply a broader completeness claim.

1. [LangGraph Graph API](https://docs.langchain.com/oss/python/langgraph/graph-api)
2. [LangGraph persistence](https://docs.langchain.com/oss/python/langgraph/persistence)
3. [LangGraph interrupts and human-in-the-loop](https://docs.langchain.com/oss/python/langgraph/interrupts)
4. [Microsoft Agent Framework workflows](https://learn.microsoft.com/en-us/agent-framework/workflows/workflows)
5. [AutoGen GraphFlow](https://microsoft.github.io/autogen/stable/user-guide/agentchat-user-guide/graph-flow.html)
6. [AutoGen repository](https://github.com/microsoft/autogen)
7. [CrewAI documentation](https://docs.crewai.com/)
8. [Mastra workflow overview](https://mastra.ai/docs/workflows/overview)
9. [Mastra workflow snapshots](https://mastra.ai/en/reference/workflows/snapshots)
10. [n8n Execute Sub-workflow](https://github.com/n8n-io/n8n-docs/blob/main/docs/integrations/builtin/core-nodes/n8n-nodes-base.executeworkflow.md)

#### LangGraph — low-level graph orchestration library

| # | Feature | Behavior | Project / layer | Source | Status |
|---:|---|---|---|---|---|
| 1 | Stateful graph construction | Define nodes, normal edges, conditional edges, and shared state for explicit execution paths. | LangGraph library | [Graph API](https://docs.langchain.com/oss/python/langgraph/graph-api) | documented |
| 2 | Command-based routing | A node can combine state updates with a dynamic next destination, including parent-graph navigation and resume control. | LangGraph library | [Graph API](https://docs.langchain.com/oss/python/langgraph/graph-api) | documented |
| 3 | Fan-out / fan-in execution | Branch to independent nodes and join their outputs through reducers at a downstream node. | LangGraph library | [Graph API](https://docs.langchain.com/oss/python/langgraph/graph-api) | documented |
| 4 | Send-based map-reduce | Create dynamic parallel work items at runtime rather than fixing every branch in the graph definition. | LangGraph library | [Graph API](https://docs.langchain.com/oss/python/langgraph/graph-api) | documented |
| 5 | Retry and concurrency controls | Apply retry policies to failing nodes and set a maximum concurrency for graph execution. | LangGraph library | [Graph API](https://docs.langchain.com/oss/python/langgraph/graph-api) | documented |
| 6 | Durable checkpoint execution | Save graph state per thread and resume after failure; pending writes let successful work in a failed super-step avoid redundant recomputation. | LangGraph library | [Persistence](https://docs.langchain.com/oss/python/langgraph/persistence) | documented |
| 7 | Dynamic human checkpoint | `interrupt()` pauses at application-defined points, persists the state, exposes a serializable payload, and resumes through `Command`. | LangGraph library | [Interrupts](https://docs.langchain.com/oss/python/langgraph/interrupts) | documented |
| 8 | Subgraph delegation boundary | Encapsulate a specialist workflow and choose stateless, per-invocation, or per-thread persistence depending on whether the delegate needs memory. | LangGraph library | [Subgraphs](https://docs.langchain.com/oss/python/langgraph/use-subgraphs) | documented |
| 9 | Two-level memory | Use thread-scoped checkpointer state for short-term continuity and a store for durable data shared across threads or graph boundaries. | LangGraph library | [Persistence](https://docs.langchain.com/oss/python/langgraph/persistence) | documented |
| 10 | Time-travel debugging | Inspect history, replay from a checkpoint, edit state into a new checkpoint, or fork an alternative trajectory. | LangGraph library | [Time travel](https://docs.langchain.com/oss/python/langgraph/use-time-travel) | documented |
| 11 | Typed event and trace projections | Stream values, messages, updates, custom events, checkpoints, tasks, subgraphs, interrupts, and debug events; LangSmith Studio adds graph/state inspection and trace-oriented development. | LangGraph library + LangSmith companion | [Event streaming](https://docs.langchain.com/oss/python/langgraph/event-streaming); [Studio](https://docs.langchain.com/langsmith/studio) | documented |

#### Microsoft Agent Framework — typed workflow and agent framework

| # | Feature | Behavior | Project / layer | Source | Status |
|---:|---|---|---|---|---|
| 12 | Typed workflow graph | Build workflows from executors and edges with validation for message compatibility, reachability, bindings, duplicate edges, and invalid connections. | MAF workflow runtime | [Workflow builder](https://learn.microsoft.com/en-us/agent-framework/workflows/workflows) | documented |
| 13 | Superstep barriers | Triggered executors run concurrently and synchronize at a barrier before the next workflow step. | MAF workflow runtime | [Workflow builder](https://learn.microsoft.com/en-us/agent-framework/workflows/workflows) | documented |
| 14 | Built-in orchestration patterns | Provide sequential, concurrent, handoff, group-chat, and manager-coordinated “Magentic” patterns. | MAF orchestration layer | [Orchestrations](https://learn.microsoft.com/en-us/agent-framework/workflows/orchestrations/) | documented |
| 15 | Request/response human checkpoint | Executors can send a request to an external operator and wait for a response; approval-required tools use the same mechanism. | MAF workflow runtime | [Human-in-the-loop](https://learn.microsoft.com/en-us/agent-framework/workflows/human-in-the-loop) | documented |
| 16 | Checkpointed resume with pending requests | Persist executor state, pending messages, shared state, and pending requests; restoration re-emits requests or accepts responses during resume. | MAF workflow runtime | [Checkpoints](https://learn.microsoft.com/en-us/agent-framework/workflows/checkpoints) | documented |
| 17 | Lifecycle and error events | Expose workflow, executor, superstep, request, output, intermediate, error, and warning events for host UIs and monitors. | MAF workflow runtime | [Workflow builder](https://learn.microsoft.com/en-us/agent-framework/workflows/workflows) | documented |
| 18 | Middleware pipelines | Insert request/response processing, exception handling, and custom pipeline logic around agent operations. | MAF agent framework | [MAF repository](https://github.com/microsoft/agent-framework) | documented |

#### AutoGen — AgentChat/Core framework; GraphFlow is explicitly experimental

| # | Feature | Behavior | Project / layer | Source | Status |
|---:|---|---|---|---|---|
| 19 | Directed agent graph | `DiGraphBuilder` creates sequential, conditional, and cyclic agent workflows whose edges control execution. | AutoGen AgentChat / GraphFlow | [GraphFlow](https://microsoft.github.io/autogen/stable/user-guide/agentchat-user-guide/graph-flow.html) | experimental |
| 20 | GraphFlow parallel fan-out/fan-in | Run independent graph branches in parallel and feed their results to a downstream node. | AutoGen GraphFlow | [GraphFlow](https://microsoft.github.io/autogen/stable/user-guide/agentchat-user-guide/graph-flow.html) | experimental |
| 21 | GraphFlow activation groups | Require all incoming edges or allow any edge in a group to activate a node, useful for joins and fast-path loops. | AutoGen GraphFlow | [GraphFlow reference](https://microsoft.github.io/autogen/stable/reference/python/autogen_agentchat.teams.html) | experimental |
| 22 | GraphFlow message filtering | Limit which upstream agents’ messages are presented to a receiving agent’s model context. | AutoGen GraphFlow | [GraphFlow](https://microsoft.github.io/autogen/stable/user-guide/agentchat-user-guide/graph-flow.html) | experimental |
| 23 | Dynamic speaker selection | Choose the next agent from conversation context, agent descriptions, a selector prompt, or a custom selector function. | AutoGen AgentChat | [Selector Group Chat](https://microsoft.github.io/autogen/stable/user-guide/agentchat-user-guide/selector-group-chat.html) | documented |
| 24 | Handoff delegation | Transfer work to a named specialist using a handoff message while retaining the team conversation context. | AutoGen AgentChat / Swarm | [Swarm](https://microsoft.github.io/autogen/stable/user-guide/agentchat-user-guide/swarm.html) | documented |
| 25 | UserProxy human checkpoint | Insert a user proxy that blocks the team run until a human supplies feedback, then return control to the team. | AutoGen AgentChat | [Human-in-the-loop](https://microsoft.github.io/autogen/stable/user-guide/agentchat-user-guide/tutorial/human-in-the-loop.html) | documented |
| 26 | Durable team state | Save and reload agent or team state from persistent storage so a run can continue after a process restart. | AutoGen AgentChat | [Managing state](https://microsoft.github.io/autogen/stable/user-guide/agentchat-user-guide/tutorial/state.html) | documented |
| 27 | Composable termination conditions | Bound a loop by messages, tokens, time, text/function events, handoff, or external control, with combinable conditions. | AutoGen AgentChat | [Termination](https://microsoft.github.io/autogen/stable/user-guide/agentchat-user-guide/tutorial/termination.html) | documented |
| 28 | Pluggable memory protocol | Add, query, update context, clear, and close a memory implementation; retrieved material can enrich an agent context before a step. | AutoGen AgentChat / Core | [Memory and RAG](https://microsoft.github.io/autogen/stable/user-guide/agentchat-user-guide/memory.html) | documented |
| 29 | OpenTelemetry tracing | Emit agent, tool, and runtime spans to compatible observability backends. | AutoGen Core / AgentChat | [Tracing](https://microsoft.github.io/autogen/stable/user-guide/agentchat-user-guide/tracing.html) | documented |

#### CrewAI — Crews plus event-driven Flows

| # | Feature | Behavior | Project / layer | Source | Status |
|---:|---|---|---|---|---|
| 30 | Event-driven Flow composition | Use `@start` and `@listen` methods with shared Flow state to create explicit event-driven execution paths. | CrewAI Flows | [Flows](https://github.com/crewAIInc/crewAI/blob/main/docs/edge/en/concepts/flows.mdx) | documented |
| 31 | Router and join conditions | Route on a method’s output and wait for any/all upstream methods using router, `and_`, and `or_` constructs. | CrewAI Flows | [Flows](https://github.com/crewAIInc/crewAI/blob/main/docs/edge/en/concepts/flows.mdx) | documented |
| 32 | Persistent Flow snapshots | Persist Flow state, resume a prior history, or fork a new run from an earlier snapshot using `@persist`. | CrewAI Flows | [Flows](https://github.com/crewAIInc/crewAI/blob/main/docs/edge/en/concepts/flows.mdx) | documented |
| 33 | Async task parallelism | Mark independent tasks for asynchronous execution and express downstream dependencies through explicit task context. | CrewAI Tasks | [Tasks](https://github.com/crewAIInc/crewAI/blob/main/docs/edge/en/concepts/tasks.mdx) | documented |
| 34 | Hierarchical manager delegation | A manager LLM or manager agent assigns work to workers, reviews results, and determines completion. | CrewAI Processes | [Processes](https://github.com/crewAIInc/crewAI/blob/main/docs/edge/en/concepts/processes.mdx) | documented |
| 35 | Sequential and hierarchical process modes | Select ordered task execution or manager-led delegation. Current task documentation does not define a literal `hybrid` Process enum; Flow + Crew is a separate composition pattern covered in row 39. | CrewAI Processes | [Tasks](https://github.com/crewAIInc/crewAI/blob/main/docs/edge/en/concepts/tasks.mdx) | documented |
| 36 | Guardrails with bounded retries | Validate task outputs with function or LLM-based guardrails and retry within a configured limit. | CrewAI Tasks | [Tasks](https://github.com/crewAIInc/crewAI/blob/main/docs/edge/en/concepts/tasks.mdx) | documented |
| 37 | Human-review gates | Tasks can request human review; Flows document routed human feedback in current releases. | CrewAI Tasks / Flows | [Tasks](https://github.com/crewAIInc/crewAI/blob/main/docs/edge/en/concepts/tasks.mdx); [Flows](https://github.com/crewAIInc/crewAI/blob/main/docs/edge/en/concepts/flows.mdx) | documented |
| 38 | Scoped, ranked memory | Store and recall memories with explicit or inferred scopes and composite semantic, recency, and importance ranking. | CrewAI Memory | [Memory](https://github.com/crewAIInc/crewAI/blob/main/docs/edge/en/concepts/memory.mdx) | documented |
| 39 | Crew-in-Flow composition | Use deterministic Flows for the outer process and insert autonomous Crews as bounded sub-operations. | CrewAI framework | [CrewAI overview](https://docs.crewai.com/core-concepts/Agents) | documented |

#### Mastra — TypeScript agent/workflow framework and runtime

| # | Feature | Behavior | Project / layer | Source | Status |
|---:|---|---|---|---|---|
| 40 | Typed workflow steps | Declare step input/output schemas and compose steps sequentially with `.then()`. | Mastra workflows | [Workflow overview](https://mastra.ai/docs/workflows/overview) | documented |
| 41 | Parallel fan-out/fan-in | `.parallel()` runs branches concurrently, returns keyed outputs, and synchronizes before the next step. | Mastra workflows | [Control flow](https://mastra.ai/docs/workflows/control-flow) | documented |
| 42 | Bounded item concurrency | `.foreach()` processes array items with configurable concurrency and aggregates the results. | Mastra workflows | [Control flow](https://mastra.ai/docs/workflows/control-flow) | documented |
| 43 | Branches and guarded loops | `.branch()` chooses a path and `.dountil()` repeats work with a stopping condition and iteration limit. | Mastra workflows | [Control flow](https://mastra.ai/docs/workflows/control-flow) | documented |
| 44 | Nested reusable workflows | Embed a complete workflow as a step or per-item pipeline and continue with the parent workflow. | Mastra workflows | [Workflow overview](https://mastra.ai/docs/workflows/overview) | documented |
| 45 | Shared workflow state | Read and update state across steps; state is carried through suspension and resumption. | Mastra workflows | [Workflow overview](https://mastra.ai/docs/workflows/overview) | documented |
| 46 | Durable suspension/resumption | Snapshots retain step state, completed outputs, execution path, retries, and suspension metadata for later continuation. | Mastra runtime | [Snapshots](https://mastra.ai/en/reference/workflows/snapshots) | documented |
| 47 | Step-level replay | The development surface can replay individual workflow steps after a run to inspect or retry them. | Mastra tooling | [Workflow overview](https://mastra.ai/docs/workflows/overview) | documented |
| 48 | Durable agent streams | Agent runs can be observed by run ID and continued across client disconnects or backend interruptions. | Mastra runtime | [Durable Agents](https://mastra.ai/blog/introducing-durable-agents) | documented |
| 49 | Layered agent memory | Combine message history, working memory, semantic recall, processors, and observational memory according to context needs. | Mastra memory | [Agent memory](https://mastra.ai/articles/agent-memory) | documented |
| 50 | Hierarchical observability | Trace agent, workflow, tool, and model calls with latency, token, cost, logs, and feedback metadata. | Mastra observability | [Observability](https://mastra.ai/docs/observability/overview) | documented |

#### n8n — adjacent workflow automation platform with an AI-agent layer

| # | Feature | Behavior | Project / layer | Source | Status |
|---:|---|---|---|---|---|
| 51 | Sub-workflow composition | Call another workflow with mapped inputs, choose run-per-item or run-once modes, and either wait for completion or continue asynchronously. | n8n workflow platform | [Execute Sub-workflow](https://github.com/n8n-io/n8n-docs/blob/main/docs/integrations/builtin/core-nodes/n8n-nodes-base.executeworkflow.md) | documented |
| 52 | Item batching loops | Iterate over incoming items or batches; configure batch size and stop after all incoming items have been processed. | n8n workflow platform | [Looping](https://github.com/n8n-io/n8n-docs/blob/main/docs/build/flow-logic/loop.md) | documented |
| 53 | Durable wait states | Pause a workflow for a time, date, webhook, or external response and resume later. | n8n workflow platform | [Wait node](https://github.com/n8n-io/n8n-docs/blob/main/docs/integrations/builtin/core-nodes/n8n-nodes-base.wait.md) | documented |
| 54 | Execution history and retry | Filter executions, inspect waiting/running/failed states, and retry with the saved or original workflow plus prior execution data. | n8n workflow platform | [All executions](https://docs.n8n.io/workflows/executions/all-executions/) | documented |
| 55 | Error workflow routing | Run a dedicated error workflow when a linked workflow fails; the Error Trigger receives failure details and can feed alerting or recovery steps. | n8n workflow platform | [Error Trigger](https://github.com/n8n-io/n8n-docs/blob/main/docs/integrations/builtin/core-nodes/n8n-nodes-base.errortrigger.md) | documented |
| 56 | AI-agent tool loop | Build an agent node that chooses among connected tools and model sub-nodes; current agent-builder material labels the newer agent layer preview. | n8n AI layer | [Build and manage agents](https://github.com/n8n-io/n8n-docs/blob/main/docs/build/build-and-manage-agents.md) | experimental |
| 57 | Tool-call human approval | Pause selected AI tool calls and request approval or denial through supported channels before executing the action. | n8n AI/workflow layer | [Human-in-the-loop tools](https://github.com/n8n-io/n8n-docs/blob/main/docs/build/integrate-ai/ai-examples/human-in-the-loop-for-tools.md) | documented |
| 58 | Agent delegation and skills | Publish specialist sub-agents or instruction/tool bundles that a higher-level agent can invoke; this is part of the preview agent layer. | n8n AI layer | [Build and manage agents](https://github.com/n8n-io/n8n-docs/blob/main/docs/build/build-and-manage-agents.md) | experimental |

#### Proposed Pi+ adaptations, informed by the adjacent frameworks

| # | Feature | Behavior | Project / layer | Source basis | Status |
|---:|---|---|---|---|---|
| 59 | Framework-neutral run contract | Give every orchestration backend a common run/thread ID, step ID, checkpoint cursor, interrupt payload, resume command, and typed event envelope. | Pi+ harness proposal | [LangGraph persistence](https://docs.langchain.com/oss/python/langgraph/persistence); [MAF checkpoints](https://learn.microsoft.com/en-us/agent-framework/workflows/checkpoints) | proposed |
| 60 | Approval-aware durable ledger | Persist pending approvals, idempotency keys, side-effect status, and resume policy before a mutating tool is allowed to run. | Pi+ harness proposal | [LangGraph interrupts](https://docs.langchain.com/oss/python/langgraph/interrupts); [Mastra snapshots](https://mastra.ai/en/reference/workflows/snapshots) | proposed |

### Evidence and limits

- Primary sources used: official project documentation, official documentation repositories, and official project repositories. The canonical source set is intentionally limited to ten source families for readability; individual rows link to the exact page used. The report uses short paraphrases only; it contains no long verbatim quotations, and repeated findings intentionally restate source material minimally.
- Framework and platform documentation describes capabilities, not an assurance that every combination is production-safe. Parallel side effects, cancellation, idempotency, access control, retry policy, and failure recovery still require Pi+ acceptance tests.
- API stability and feature availability can differ by language, release channel, hosted product tier, or preview status. Pin versions before implementation work.
- No implementation is included here. The two Pi+ rows are design proposals only; they do not assert that a universal adapter or durable ledger already exists.

## Memory and retrieval

Source report: [memory-context.md](./memory-context.md).

Research snapshot: 2026-09-11. This is a source-backed catalogue, not a claim of universal completeness. It covers the assigned scope only: Letta/MemGPT, Mem0, Zep/Graphiti, LlamaIndex, and DSPy. ACE, RLM, Reflexion, and code-execution-with-MCP are intentionally omitted because they are covered in `docs/research/experimental-context.md`.

### How to read this catalogue

- **Documented**: the cited official documentation or repository describes the capability as available.
- **Experimental**: the official source describes the capability as experimental or actively under exploration; it should not be treated as a stable default.
- **Frozen/deprecated**: the official source says the capability is feature-frozen, deprecated, or recommends a successor; this is distinct from an experimental capability.
- **Proposed**: a Pi+ integration idea derived from the documented building block; no source below proves that Pi+ already implements it.
- **Library/framework** means an embeddable component. **Full harness** means the project documents a broader agent runtime or product surface. A capability is not promoted from library to harness feature merely because an integration example exists.

### Feature catalogue

| # | Feature | Behavior | Project / boundary | Primary source | Status |
|---:|---|---|---|---|---|
| 1 | Stateful agent runtime | Keeps an agent identity, state, messages, tools, and memory across interactions. | Letta / full agent harness | [Letta docs](https://docs.letta.com/) | documented |
| 2 | Memory hierarchy | Separates always-available in-context memory from searchable out-of-context memory, following the MemGPT model. | Letta/MemGPT / harness + research basis | [Letta Python SDK](https://docs.letta.com/api/python) | documented |
| 3 | Editable memory blocks | Represents persistent in-context memory as named, editable blocks rather than one opaque prompt. | Letta / runtime | [Letta Python SDK](https://docs.letta.com/api/python) | documented |
| 4 | Block CRUD | Retrieves, updates, lists, attaches, and detaches blocks through an API. | Letta / runtime API | [Blocks API](https://docs.letta.com/api/typescript/resources/agents/subresources/blocks) | documented |
| 5 | Dynamic block attachment | Grants or revokes a block at runtime so the agent's visible context can change by task. | Letta / runtime | [Attach and detach blocks](https://docs.letta.com/tutorials/attaching-detaching-blocks/) | documented |
| 6 | Shared memory blocks | Reuses one standalone block across multiple agents, enabling shared policy or project context. | Letta / runtime | [Attach and detach blocks](https://docs.letta.com/tutorials/attaching-detaching-blocks/) | documented |
| 7 | Remove future block injection | Detaching a block stops that block from being injected into future agent context; it does not erase facts already copied into the transcript or another memory. | Letta / runtime | [Attach and detach blocks](https://docs.letta.com/tutorials/attaching-detaching-blocks/) | documented |
| 8 | Agentic memory management | Lets the agent use tools to edit, delete, or search memory instead of relying only on host-side truncation. | Letta/MemGPT / harness | [Letta Python SDK](https://docs.letta.com/api/python) | documented |
| 9 | Perpetual message history | Maintains an effectively unbounded history by moving information between memory tiers instead of keeping all messages in the active window. | Letta/MemGPT / harness + research basis | [MemGPT paper](https://arxiv.org/abs/2310.08560) | documented |
| 10 | Local memory filesystem projection | Projects memory blocks and recall/external memory into a local memory filesystem for inspection and standard file operations. | Letta Code / coding-agent harness | [Letta Code memory prompt](https://github.com/letta-ai/letta-code/blob/main/src/agent/prompts/letta_local_memfs.md) | documented |
| 11 | Harness-level skills | Adds reusable skills with project/computer/agent scoping, scripts, and references around the memory runtime. | Letta / full harness | [Letta skills](https://docs.letta.com/configuration/skills) | documented |
| 12 | Harness scheduling and delegation | Documents schedules, channels, subagents, permissions, and external tools as product-level runtime features. | Letta / full harness | [Letta docs](https://docs.letta.com/) | documented |
| 13 | Automatic fact extraction | Converts useful interaction content into reusable memories such as preferences, decisions, and plans. | Mem0 / memory layer, not a coding harness | [Mem0: how it works](https://github.com/mem0ai/mem0/blob/main/docs/core-concepts/how-it-works.mdx) | documented |
| 14 | Existing-memory lookup before write | Looks up related memories before storing a new one to reduce duplicate facts. | Mem0 / memory layer | [Mem0: how it works](https://github.com/mem0ai/mem0/blob/main/docs/core-concepts/how-it-works.mdx) | documented |
| 15 | Deduplication and embeddings | Removes redundant facts and embeds retained memories for later semantic search. | Mem0 / memory layer | [Mem0: how it works](https://github.com/mem0ai/mem0/blob/main/docs/core-concepts/how-it-works.mdx) | documented |
| 16 | Raw-write escape hatch | Allows `infer=False` when the application must preserve supplied content rather than infer normalized facts. | Mem0 / memory layer | [Mem0: how it works](https://github.com/mem0ai/mem0/blob/main/docs/core-concepts/how-it-works.mdx) | documented |
| 17 | Explicit memory correction | Supports explicit update and delete operations when a fact must be corrected or removed. | Mem0 / memory layer | [Mem0: how it works](https://github.com/mem0ai/mem0/blob/main/docs/core-concepts/how-it-works.mdx) | documented |
| 18 | Multi-scope memory identity | Separates or shares memories with `user_id`, `agent_id`, `app_id`, and `run_id`-style scopes. | Mem0 / memory layer | [Mem0 graph memory](https://docs.mem0.ai/open-source/features/graph-memory) | documented |
| 19 | Multi-signal retrieval | Combines semantic, keyword, entity, and temporal signals for search rather than relying on one vector score. | Mem0 / memory layer | [Mem0: how it works](https://github.com/mem0ai/mem0/blob/main/docs/core-concepts/how-it-works.mdx) | documented |
| 20 | Configurable reranking | Can rerank retrieved memory candidates using a configured reranker. | Mem0 / memory layer | [Mem0 graph memory](https://docs.mem0.ai/open-source/features/graph-memory) | documented |
| 21 | Graph-backed memory | Extracts entities and relationships on memory writes and stores graph edges alongside vector memories. | Mem0 / memory layer extension | [Mem0 graph memory](https://docs.mem0.ai/open-source/features/graph-memory) | documented |
| 22 | Graph backend selection | Supports graph backends including Neo4j, Memgraph, Neptune, Kuzu, and Apache AGE in the documented graph configuration. | Mem0 / memory layer extension | [Mem0 graph memory](https://docs.mem0.ai/open-source/features/graph-memory) | documented |
| 23 | Per-request graph toggle | Enables or disables graph reads/writes for individual add or search calls. | Mem0 / memory layer extension | [Mem0 graph memory](https://docs.mem0.ai/open-source/features/graph-memory) | documented |
| 24 | Extraction-prompt customization | Lets the application guide which entities and relationships should become graph nodes and edges. | Mem0 / memory layer extension | [Mem0 graph memory](https://docs.mem0.ai/open-source/features/graph-memory) | documented |
| 25 | Confidence threshold for graph writes | Raises the extraction threshold to keep lower-confidence edges out of the graph. | Mem0 / memory layer extension | [Mem0 graph memory](https://docs.mem0.ai/open-source/features/graph-memory) | documented |
| 26 | Relation enrichment without implicit vector reorder | Returns related graph entities alongside vector hits; graph relations do not automatically reorder the vector result list. | Mem0 / memory layer extension | [Mem0 graph memory](https://docs.mem0.ai/open-source/features/graph-memory) | documented |
| 27 | Incremental temporal graph | Adds new episodes to an evolving temporal graph without batch recomputation of the whole graph. | Graphiti / open-source graph library | [Graphiti welcome](https://help.getzep.com/graphiti/getting-started/welcome) | documented |
| 28 | Episode-based ingestion | Ingests text, conversational messages, and JSON as separately timestamped episodes. | Graphiti / graph library | [Adding episodes](https://help.getzep.com/graphiti/core-concepts/adding-episodes) | documented |
| 29 | Episode provenance | Keeps episode nodes and source relationships so retrieved facts can be traced to ingestion events. | Graphiti / graph library | [Adding episodes](https://help.getzep.com/graphiti/core-concepts/adding-episodes) | documented |
| 30 | Bulk episode ingestion | Provides a bulk ingestion path for large initial loads, with an explicit caveat that edge invalidation is not performed there. | Graphiti / graph library | [Adding episodes](https://help.getzep.com/graphiti/core-concepts/adding-episodes) | documented |
| 31 | Hybrid graph search | Combines semantic similarity, BM25/full-text, and graph-oriented retrieval, with reciprocal-rank fusion documented for hybrid search. | Graphiti / retrieval library | [Searching the graph](https://help.getzep.com/graphiti/working-with-data/searching) | documented |
| 32 | Focal-node reranking | Reweights graph search around a specified node to prioritize entity-local context. | Graphiti / retrieval library | [Searching the graph](https://help.getzep.com/graphiti/working-with-data/searching) | documented |
| 33 | Custom entity types | Defines domain-specific entity schemas and extracts validated attributes into them. | Graphiti / graph library | [Custom entity and edge types](https://help.getzep.com/graphiti/core-concepts/custom-entity-and-edge-types) | documented |
| 34 | Custom edge types | Defines domain-specific relationship schemas and maps allowable entity pairs to relationship types. | Graphiti / graph library | [Custom entity and edge types](https://help.getzep.com/graphiti/core-concepts/custom-entity-and-edge-types) | documented |
| 35 | Typed graph filters | Restricts search to selected node labels or edge types. | Graphiti / retrieval library | [Custom entity and edge types](https://help.getzep.com/graphiti/core-concepts/custom-entity-and-edge-types) | documented |
| 36 | Schema evolution | Adds attributes to existing custom types while preserving existing nodes for future updates. | Graphiti / graph library | [Custom entity and edge types](https://help.getzep.com/graphiti/core-concepts/custom-entity-and-edge-types) | documented |
| 37 | Fact validity intervals | Records when facts become valid and invalid so historical state can be queried rather than overwritten. | Zep/Graphiti / context-graph layer | [Zep facts](https://help.getzep.com/facts) | documented |
| 38 | Entity resolution and contradiction handling | Resolves mentions against existing entities, merges duplicates, and invalidates contradictory older facts. | Zep / managed context product | [How graph creation works](https://help.getzep.com/how-graph-creation-works) | documented |
| 39 | Graph namespacing | Uses `group_id`-style namespaces to isolate data, reduce leakage, and limit search scope. | Graphiti / graph library | [Graph namespacing](https://help.getzep.com/graphiti/core-concepts/graph-namespacing) | documented |
| 40 | Context-type selection | Exposes distinct context primitives such as facts, entities, episodes, thread summaries, observations, and user summaries. | Zep / managed context product | [Zep key concepts](https://help.getzep.com/) | documented |
| 41 | Metadata-filtered retrieval | Filters candidate nodes by structured metadata before or alongside similarity search. | LlamaIndex / application framework | [LlamaIndex metadata filtering example](https://docs.llamaindex.ai/en/stable/examples/vector_stores/MyScaleIndexDemo/) | documented |
| 42 | LLM-inferred retrieval filters | Infers metadata filters and a query string from natural-language requests for auto-retrieval. | LlamaIndex / application framework | [LlamaIndex auto-retrieval example](https://docs.llamaindex.ai/en/v0.10.17/optimizing/basic_strategies/basic_strategies.html) | documented |
| 43 | Hybrid vector/keyword retrieval | Combines embedding similarity with keyword/BM25 retrieval where vector-only search is insufficient. | LlamaIndex / application framework | [LlamaIndex retrieval strategies](https://docs.llamaindex.ai/en/v0.10.17/optimizing/basic_strategies/basic_strategies.html) | documented |
| 44 | Retriever routing | Selects one or more candidate retrievers using a selector informed by retriever metadata and the query. | LlamaIndex / application framework | [Router retriever](https://docs.llamaindex.ai/en/stable/api_reference/retrievers/router/) | documented |
| 45 | Recursive retrieval | Retrieves a high-level summary/index node and follows its link to a more specific downstream retriever or document. | LlamaIndex / application framework | [Structured hierarchical retrieval](https://docs.llamaindex.ai/en/v0.10.20/examples/query_engine/multi_doc_auto_retrieval/multi_doc_auto_retrieval.html) | documented |
| 46 | Query-pipeline DAG composition | Chains prompts, LLMs, retrievers, and other pipelines in a sequential or DAG-shaped query workflow. The documentation says Query Pipelines are feature-frozen/deprecation-phase and recommends Workflows for new orchestration. | LlamaIndex / application framework | [Query Pipeline](https://docs.llamaindex.ai/en/stable/module_guides/querying/pipeline/) | frozen/deprecated |
| 47 | Retrieval postprocessing | Applies postprocessors such as PII masking or reranking after retrieval and before synthesis. | LlamaIndex / application framework | [Presidio node postprocessor](https://docs.llamaindex.ai/en/stable/api_reference/postprocessor/presidio/) | documented |
| 48 | Typed event workflows | Models multi-step application/agent flows as typed events and workflow steps. | LlamaIndex / application framework | [LlamaIndex workflows](https://docs.llamaindex.ai/en/stable/understanding/workflows/) | documented |
| 49 | Typed signatures | Defines typed inputs and outputs as a task contract that can be compiled into LM calls. | DSPy / programming and optimization library | [DSPy](https://dspy.ai/) | documented |
| 50 | Swappable modules | Uses interchangeable modules such as `Predict`, chain-of-thought, ReAct, and custom modules behind compatible signatures. | DSPy / programming library | [DSPy](https://dspy.ai/) | documented |
| 51 | Metric-driven compilation | Compiles a DSPy program against a metric to improve prompts and/or demonstrations. | DSPy / optimization library | [DSPy optimizers](https://github.com/stanfordnlp/dspy/blob/main/docs/docs/learn/optimization/optimizers.md) | documented |
| 52 | Labeled few-shot selection | Builds prompts from a selected number of labeled examples. | DSPy / optimization library | [DSPy optimizers](https://github.com/stanfordnlp/dspy/blob/main/docs/docs/learn/optimization/optimizers.md) | documented |
| 53 | Bootstrap few-shot demonstrations | Uses a teacher program to generate demonstrations and keeps examples that pass the configured metric. | DSPy / optimization library | [DSPy optimizers](https://github.com/stanfordnlp/dspy/blob/main/docs/docs/learn/optimization/optimizers.md) | documented |
| 54 | Random-search program selection | Compiles multiple few-shot candidates with varied demonstrations and selects the best-scoring program. | DSPy / optimization library | [DSPy optimizers](https://github.com/stanfordnlp/dspy/blob/main/docs/docs/learn/optimization/optimizers.md) | documented |
| 55 | K-nearest-neighbor demonstrations | Selects nearby training examples as demonstrations before bootstrapping. | DSPy / optimization library | [DSPy optimizers](https://github.com/stanfordnlp/dspy/blob/main/docs/docs/learn/optimization/optimizers.md) | documented |
| 56 | Instruction optimization | Searches for improved natural-language instructions; MIPROv2 also searches demonstration sets. | DSPy / optimization library | [DSPy optimizers](https://github.com/stanfordnlp/dspy/blob/main/docs/docs/learn/optimization/optimizers.md) | documented |
| 57 | Reflective optimization | Uses trajectory feedback and textual metric feedback to propose prompt improvements with GEPA. | DSPy / optimization library | [GEPA in DSPy](https://github.com/stanfordnlp/dspy/blob/main/docs/docs/diving-deeper/gepa-in-depth.md) | documented |
| 58 | Program ensembles | Combines multiple compiled DSPy programs into an ensemble. | DSPy / optimization library | [DSPy optimizers](https://github.com/stanfordnlp/dspy/blob/main/docs/docs/learn/optimization/optimizers.md) | documented |
| 59 | Prompt/weight optimization composition | Combines prompt optimization and fine-tuning in configurable sequences through BetterTogether. | DSPy / optimization library | [DSPy optimizers](https://github.com/stanfordnlp/dspy/blob/main/docs/docs/learn/optimization/optimizers.md) | documented |
| 60 | Optimize-as-code workflow | Experimental support for optimizing programs expressed as code, rather than only prompt/demo parameters. | DSPy / optimization library | [DSPy releases](https://github.com/stanfordnlp/dspy/releases) | experimental |
### Gaps and boundaries

- This catalogue does not claim exhaustive coverage of adapters, vector stores, graph providers, model providers, or every LlamaIndex pack.
- “Documented” means documented by the cited source, not independently validated end-to-end inside Supernova.
- No cited project documents a native, complete Letta–Mem0–Graphiti–LlamaIndex–DSPy–Pi integration. The backlog below is therefore explicitly hypothetical, not existing Supernova functionality.
- The catalogue intentionally avoids ACE, RLM, Reflexion, and code-execution-with-MCP; consult `docs/research/experimental-context.md` for those.

### Backlog: unverified Pi+ integration avenues

These are useful follow-up hypotheses, but are deliberately not counted as source-backed catalogue rows:

- **Proposed:** pluggable memory-scope adapter for user/project/session/run isolation.
- **Proposed:** context assembly contract for ordered blocks, memories, graph facts, documents, and tool results.
- **Proposed:** provenance-preserving context view with inspectable memory/episode/node/edge identifiers.
- **Proposed:** per-run retrieval policy controls for backend, top-k, filters, reranking, graph toggles, and time windows.
- **Proposed:** memory-write review queue with explicit accept/update/delete actions.
- **Proposed:** context/retrieval replay containing queries, selected context, filters, prompt version, outputs, and scores.

None of these backlog items is claimed to exist in Supernova or to be natively supplied by any one cited project.

### Primary source set

The rows rely on official project documentation, official repositories, or the original MemGPT paper only: [Letta docs](https://docs.letta.com/), [Letta block guide/API](https://docs.letta.com/tutorials/attaching-detaching-blocks/), [MemGPT paper](https://arxiv.org/abs/2310.08560), [Mem0 docs/repository](https://docs.mem0.ai/open-source/features/graph-memory), [Graphiti/Zep docs](https://help.getzep.com/graphiti/getting-started/overview), [Zep facts/context docs](https://help.getzep.com/facts), [LlamaIndex docs](https://docs.llamaindex.ai/en/stable/), and [DSPy docs/repository](https://dspy.ai/).

## Loops and evaluation

Source report: [loops-evaluation.md](./loops-evaluation.md).

Research date: 2026-09-11. These are documented capabilities/patterns, not personally tested implementations. This file supplements the six Luna research reports. Product ideas are explicitly marked separately.

### Lightweight autonomous loops

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

### Research experiment loops

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

### Workflow and context patterns

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

### Composable harness infrastructure

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

### Observability and prompt evaluation

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

### Pi+ synthesis ideas — proposed, not attributed as shipped

- Versioned Research and Coding profiles bundling prompts, models, tools, context policy, memory and loop rules.
- A per-call context inspector showing exactly what was sent, where each segment came from and its token cost.
- Separate views for the workflow graph, knowledge graph, conversation branch tree and execution trace.
- Run the same saved task with two harness profiles; compare quality, cost, latency and interventions.
- A profile-level stop policy: acceptance criteria, step limit, time limit and spending limit.
- Reviewable harness evolution: propose a prompt/tool/loop change, evaluate it on held-out tasks, then accept or reject it.

These combinations are product proposals. Their value and feasibility for Pi+ are not established merely because individual ingredients exist elsewhere.

## Experimental context patterns

Source report: [experimental-context.md](./experimental-context.md).

Snapshot: 2026-09-11. Research ideas and published implementation patterns, not built-in Pi+ capabilities. No benchmark was reproduced. These complement the harness catalogue; they are not endorsements of unattended self-modification.

### ACE: evolving playbooks

Source: [ACE official research implementation](https://github.com/ace-agent/ace). Status: research implementation. The tool-calling extension tutorial is listed as coming soon, not delivered.

| ID | Feature | Behavior |
|---|---|---|
| AC01 | Structured context playbook | Store reusable strategies and mistakes as identified entries. |
| AC02 | Generator–reflector–curator separation | Separate task execution, lesson extraction, and memory changes. |
| AC03 | Incremental memory patches | Apply local deltas rather than rewriting the whole playbook. |
| AC04 | Lesson usefulness counters | Record helpful and harmful feedback per entry. |
| AC05 | Memory deduplication and pruning | Merge overlapping advice and remove unhelpful content. |
| AC06 | Offline context adaptation | Optimize against training/validation examples before deployment. |
| AC07 | Online context adaptation | Update context from successive execution feedback. |
| AC08 | Bounded playbook growth | Configure a token budget and update frequency. |
| AC09 | Auditable learning history | Preserve intermediate playbooks, operation diffs, and evaluation logs. |

### Recursive Language Models

Source: [RLM authors' implementation](https://github.com/alexzhang13/rlm). Status: research implementation. Large external inputs do not make the underlying model's context unlimited. The default local code environment is not a strong security sandbox.

| ID | Feature | Behavior |
|---|---|---|
| RC01 | Context as an external variable | Keep large inputs in a code environment instead of stuffing every token into a prompt. |
| RC02 | Programmatic context inspection | Search, slice, and decompose input through code. |
| RC03 | Recursive model calls | Invoke subordinate model calls over selected subproblems. |
| RC04 | Code-controlled decomposition | Let the model express its decomposition and aggregation program. |
| RC05 | Selectable execution environments | Choose local execution or supported isolated environments. |
| RC06 | Recursive trajectory inspection | Log and visualize execution trajectories. |

### Reflexion

Source: [Reflexion authors' implementation](https://github.com/noahshinn/reflexion). Status: research implementation, not model-weight training.

| ID | Feature | Behavior |
|---|---|---|
| RF01 | Reflection between attempts | Feed a critique of the failed attempt into another attempt. |
| RF02 | Reflection context policy | Choose previous attempt, reflection, both, or neither. |
| RF03 | Persistent reflection memory | Carry lessons between trials. |
| RF04 | Resumable trial series | Continue experiments from saved logs. |

### Code execution with MCP

Source: [Anthropic's implementation pattern](https://www.anthropic.com/engineering/code-execution-with-mcp). Status: published design pattern; not an automatic guarantee of all MCP clients. Data isolation, tokenization, and access control require implementation.

| ID | Feature | Behavior |
|---|---|---|
| MC01 | Tool APIs as code modules | Expose tools as callable code interfaces. |
| MC02 | Lazy tool-schema discovery | Load only relevant tool definitions. |
| MC03 | Tool search detail levels | Discover names first, then descriptions and full schemas. |
| MC04 | Pre-context result processing | Filter, join, or aggregate large results before showing them to the model. |
| MC05 | Code-level tool control flow | Run loops, conditions, and error handling without a model round-trip for each operation. |
| MC06 | Data stays outside model context | Pass intermediate data between tools without including it in messages. |
| MC07 | Sensitive-value tokenization | Replace sensitive values with handles and resolve them inside authorized tool calls. |
| MC08 | Persistent workflow intermediates | Save intermediate state for later continuation. |
| MC09 | Reusable generated helpers | Save successful tool-composition code for reuse. |

### Pi+ design implications — proposals, not source features

- Put learned context changes in a review queue with a diff, provenance, and rollback.
- Evaluate proposed prompt/memory changes against held-out tasks before activation.
- Bound recursive calls by depth, concurrency, spend, wall time, and allowed side effects.
- Keep raw external material separate from trusted instructions; tool output must not silently become policy.
- Expose a visible context manifest: included items, excluded items, transformation history, and token estimates.

