# pi+ Harness Workspace

pi+ groups projects and their conversations by the harness that defines how agents work.

## Language

**Harness**: A reusable configuration of shared instructions, specialist agents, context policy, an agent workflow, and execution limits. One harness contains multiple projects.
_Avoid_: Provider, project

**Head orchestrator**: The agent coordinating the entire harness from its root workspace. In Science Pi this is Science Space, above all labs; its coordination prompt is distinct from rules shared by every agent.

**Lab orchestrator**: The agent coordinating one lab and its specialists. It inherits harness-wide rules and the lab's project instructions, not the head orchestrator's cross-lab role.

**Science Space instructions**: The shared operating manual for Science Pi: scientific rules, available skills and tools, and where research resources live. Every Science lab and specialist inherits it; other harnesses do not.
_Avoid_: Global prompt, head role

**Role prompt**: Instructions defining one orchestrator or specialist's job, layered over the global and project instructions.

**Skill**: A named, reusable procedure available to agents in a harness, optionally narrowed for a project or specialist. Available does not mean it has been invoked.

**Project**: A working directory assigned to one harness, with optional project-specific instructions and agent overrides.
_Avoid_: Harness

**Chat**: A conversation within a project. A newly created chat retains the harness configuration selected at its creation.
_Avoid_: Agent

**Agent run**: One actual delegation of a task to a lab orchestrator or specialist, owned by a chat and optionally delegated by another run. Its task, state, instructions, activity and result can be inspected; a configured role alone is not a run.
_Avoid_: Team member, chat

**Project instructions**: The specific research question, goals, constraints and working conventions for one lab. They extend the Science Space instructions without redefining the specialist's role.

**Lab view**: The user's organization of labs and their chats. An orchestrator may organize labels, colors and ordering within its authority without changing the research instructions or deleting work.

**Agent**: A named specialist with its own system prompt and permitted tools. A configured agent is a role definition, not an already-running process.
_Avoid_: Chat, project

**Agent workflow**: An ordered graph of specialist handoffs that can be invoked explicitly.

**Context policy**: The harness's instructions for context, project instruction loading, additional context files, and conversation compaction.

**Execution limits**: Enforced turn and time limits for an agent invocation. Configuring limits does not authorize or start autonomous experiments.

**Project override**: A project-specific instruction or specialist definition layered over its harness defaults without changing other projects.
