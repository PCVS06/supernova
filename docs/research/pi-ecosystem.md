# Pi ecosystem feature catalogue

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

## Prompt, context, and lifecycle hooks

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

## Queues, steering, and interaction state

| Feature | Concrete behavior | Source URL | Source project | Status |
|---|---|---|---|---|
| Steering queue | Enter queues a message that is delivered after the current assistant turn finishes its tool batch, before the next model call. | [U1](https://pi.dev/docs/latest/usage) | Pi | documented |
| Follow-up queue | Alt+Enter queues a message that waits until the agent has finished all current work. | [U1](https://pi.dev/docs/latest/usage) | Pi | documented |
| Queue drain modes | `steeringMode` and `followUpMode` choose `one-at-a-time` or `all` delivery. | [U1](https://pi.dev/docs/latest/usage) | Pi | documented |
| Abort and recover queued work | Escape aborts the run and restores queued text to the editor; Alt+Up retrieves queued messages. | [U1](https://pi.dev/docs/latest/usage) | Pi | documented |
| Interrupt policy | OMP adds an `interruptMode` setting with `immediate` and `wait` choices. | [U7](https://github.com/can1357/oh-my-pi/blob/main/docs/settings.md) | Oh My Pi | documented |
| Queue event stream | Pi JSON mode emits `queue_update` with the full pending steering/follow-up queues whenever they change. | [U2](https://pi.dev/docs/latest/extensions) | Pi extensions / JSON integration | documented |
| Waiting and idle lifecycle | UI prompt start/end events expose “waiting for user”; graceful shutdown is deferred until queued work and the current run reach idle. | [U2](https://pi.dev/docs/latest/extensions) | Pi extensions | documented |

## Compaction, sessions, and branching

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

## Subagents and coordination

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

## LSP, editing, and execution harness

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

## Customization and packaging

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

## Oh My Pi breadth additions: debugger, browser, media, planning, providers, and tools

These records extend the core-hook catalogue with the wider surface advertised in OMP’s README and described in its official tool/docs pages.

### Debugger

| Feature | Concrete behavior | Source URL | Source project | Status |
|---|---|---|---|---|
| DAP debugger surface | OMP advertises 28 DAP operations; the official tool reference lists launch/attach, breakpoints, stepping, evaluation, stack/scopes/variables, memory, modules, loaded sources, custom requests, output, termination, and session listing. | [O1](https://github.com/can1357/oh-my-pi/blob/main/docs/tools/debug.md) | Oh My Pi | documented |
| Adapter discovery and selection | Built-in adapters cover common native, Python, JavaScript, .NET, Ruby, PHP, Dart/Flutter, and Elixir paths; launch/attach selection ranks available adapters by project and target metadata. | [O1](https://github.com/can1357/oh-my-pi/blob/main/docs/tools/debug.md) | Oh My Pi | documented |
| Custom DAP adapters | Project/user `dap.json`/YAML files can add or override adapters, including commands, args, language/file metadata, root markers, launch/attach defaults, and stdio/socket/TCP connection modes. | [O1](https://github.com/can1357/oh-my-pi/blob/main/docs/tools/debug.md) | Oh My Pi | documented |

### Browser, eval, web, document, and media tools

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

### Planning, task persistence, workflowz, and artifacts

| Feature | Concrete behavior | Source URL | Source project | Status |
|---|---|---|---|---|
| Phased todo state | The `todo` tool mutates one phase/task at a time and returns the full state; operations include initialize, start, complete, abandon, block, and unblock. | [O6](https://github.com/can1357/oh-my-pi/blob/main/docs/tools/todo.md) | Oh My Pi | documented |
| Todo persistence and resume behavior | Todo state is cached in the session, reflected in the visible UI, and cleaned of done/dropped tasks on session resume; `/todo` also persists custom entries and can inject reminders. | [O6](https://github.com/can1357/oh-my-pi/blob/main/docs/tools/todo.md) | Oh My Pi | documented |
| Async task jobs and lifecycle | The `task` tool can block or run in the background; the docs describe progress/result delivery, bounded concurrency, agent states (`running`, `idle`, `parked`, `aborted`), idle-TTL parking, and revival. | [O5](https://github.com/can1357/oh-my-pi/blob/main/docs/tools/task.md) | Oh My Pi | documented |
| Workflowz execution contract | The `workflowz` keyword requests a deterministic multi-agent workflow centered on persistent eval helpers such as `agent()`, `completion()`, handles, `wait()`, and `workpool()`; the source does not claim a separate visual graph editor. | [O7](https://github.com/can1357/oh-my-pi/blob/main/docs/magic-keywords.md) | Oh My Pi | documented |
| Checkpoint/rewind pair | Opt-in `checkpoint` marks a top-level investigation boundary and forces a later `rewind` report before yielding; it stores conversation/session metadata, not a Git or filesystem snapshot. | [O8](https://github.com/can1357/oh-my-pi/blob/main/docs/tools/checkpoint.md) | Oh My Pi | documented |

### Credentials, providers, and model customization

| Feature | Concrete behavior | Source URL | Source project | Status |
|---|---|---|---|---|
| Credential precedence | Provider credentials resolve through runtime overrides, custom `models.yml` keys, stored credentials, environment/`.env` values, and fallback resolvers; disabled providers remain unavailable even if credentials exist. | [O9](https://github.com/can1357/oh-my-pi/blob/main/docs/providers.md) | Oh My Pi | documented |
| Provider-scoped login/logout | `/login` and `/logout` operate per provider, support OAuth or API-key flows, and can use an auth broker for headless/remote setups. | [O9](https://github.com/can1357/oh-my-pi/blob/main/docs/providers.md) | Oh My Pi | documented |
| Multi-account OAuth rotation | Stored OAuth credentials can represent multiple accounts/workspaces; OMP documents ranking/rotation across available credentials. | [O9](https://github.com/can1357/oh-my-pi/blob/main/docs/providers.md) | Oh My Pi | documented |
| Custom OpenAI-compatible providers | `models.yml` can declare custom provider IDs, base URLs, APIs, auth behavior, model metadata, discovery, and keyless local endpoints. | [O9](https://github.com/can1357/oh-my-pi/blob/main/docs/providers.md) | Oh My Pi | documented |
| Extension-registered providers | Extensions can register providers and optional usage fetching so custom backends participate in model selection, credential storage, and usage displays. | [O10](https://github.com/can1357/oh-my-pi/blob/main/docs/extensions.md) | Oh My Pi | documented |

### Extension examples and host integration

| Feature | Concrete behavior | Source URL | Source project | Status |
|---|---|---|---|---|
| SDK example family | Official examples cover programmatic SDK sessions, model/prompt/tool/session customization, safety-gate hooks, and custom tools beyond subagents. | [O15](https://github.com/can1357/oh-my-pi/blob/main/packages/coding-agent/examples/README.md) | Oh My Pi | documented example |
| Extension composition | One OMP extension can combine event handlers, LLM tools, slash commands, keyboard shortcuts/flags, renderers, and session/message injection. | [O10](https://github.com/can1357/oh-my-pi/blob/main/docs/extensions.md) | Oh My Pi | documented |
| Restricted/runtime tool sets | SDK sessions can request named tools, enforce a restricted allowlist, opt into hidden tools, load inline/extra extensions, and update active tools at runtime. | [O11](https://github.com/can1357/oh-my-pi/blob/main/docs/sdk.md) | Oh My Pi | documented |
| Brokered file-write fallback | Extensions can supply a privileged write fallback when direct writes fail, allowing a host/sandbox broker to persist bytes while preserving normal file snapshots and later hashline edits. | [O10](https://github.com/can1357/oh-my-pi/blob/main/docs/extensions.md) | Oh My Pi | documented |

### Other README-advertised OMP tools

| Feature | Concrete behavior | Source URL | Source project | Status |
|---|---|---|---|---|
| Desktop computer control | The README lists a `computer` tool. | [U6](https://github.com/can1357/oh-my-pi) | Oh My Pi | documented |
| Persistent SSH tool | The README lists persistent SSH support. | [U6](https://github.com/can1357/oh-my-pi) | Oh My Pi | documented |
| GitHub as a filesystem | The README advertises GitHub as a filesystem-like surface. | [U6](https://github.com/can1357/oh-my-pi) | Oh My Pi | documented |
| Security scanning | The README lists a setting-gated `security_scan` tool. | [U6](https://github.com/can1357/oh-my-pi) | Oh My Pi | documented |

## Verification boundary

- The catalogue is not universal coverage; it deliberately prioritizes the requested hooks, queues, compaction, branching, subagents, LSP/editing, and customization surfaces.
- “Pi subagents” are not a built-in Pi core capability: the official subagent implementation is an extension example, while mjakl and harms-haus are community extensions. Treat them as installable patterns, not baseline guarantees.
- OMP README performance claims and feature demos were not independently benchmarked here. The entries record the repository’s documented behavior; availability, defaults, provider support, and platform behavior should be rechecked before product commitments.
- Rows based primarily on the OMP README (for example image generation, computer control, SSH, GitHub, and security scanning) are intentionally included as advertised capabilities; this report did not execute them or verify account/provider availability.
- No feature is marked `proposed` because this report only records behavior directly supported by the cited sources. Any Supernova-specific synthesis or missing capability should be treated as a separate design proposal, not as an ecosystem fact.
