# Claude Code, OpenCode and oh-my-opencode: Pi+ harness feature catalogue

Research date: 2026-09-11. Live first-party documentation and repositories were checked; no repositories were cloned and no packages were installed. This is a source catalogue, not a claim of universal completeness. It focuses on granular behavior that could inform a customizable Pi+ harness.

No OpenAI products were researched. `oh-my-opencode` is currently being renamed to `oh-my-openagent`; the published package/binary name remains in transition. The report uses “OMO” for the current project and calls out where a feature belongs to the OpenCode plugin layer rather than OpenCode itself.

Status means:

- `documented`: described in the current first-party docs/repository.
- `experimental`: the source explicitly labels the capability experimental, preview, or beta. Configuration facts such as opt-in, disabled by default, or config-gated remain separate notes and do not change this status by themselves.
- `proposed`: a Pi+ translation candidate derived from the catalogue, not a shipped feature.

## Claude Code

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

## OpenCode

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

## oh-my-opencode / oh-my-openagent (OMO)

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

## Pi+ translation candidates

These are deliberately marked `proposed`; they are not claims that any project ships them as a unified feature.

| ID | Proposed feature | Evidence it combines | Status |
|---|---|---|---|
| P01 | Provider-neutral agent profile | Claude subagent configuration + OpenCode per-agent model/prompt/permissions + OMO category routing. | proposed |
| P02 | Policy envelope per run | Claude pre-tool hooks + OpenCode allow/ask/deny + OMO guard hooks and fallback settings. | proposed |
| P03 | One extension manifest | Claude plugin component directories + OpenCode plugin loading + OMO skill/MCP layering. | proposed |
| P04 | Explicit context budget inspector | Claude’s documented loading costs + OpenCode instruction layering + OMO memory compilation warnings. | proposed |
| P05 | Adapter-backed team execution | Claude Agent Teams + OpenCode child sessions + OMO Team Mode, with Pi-specific isolation chosen explicitly. | proposed |
| P06 | Reviewable autonomous loop | Claude stop hooks + OMO goals/tasks/fallbacks + a Pi acceptance/stop policy. | proposed |

## Primary sources

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

The Luna subagents independently researched Claude Code, OpenCode and OMO in projectless sandboxes and returned corroborating evidence. Their work was used as a cross-check; no subagent edited this repository.

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
