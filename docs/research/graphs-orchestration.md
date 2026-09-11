# Feature catalogue: graphs and orchestration for a customizable Pi+ harness

Research snapshot: 2026-09-11. This is a targeted catalogue of concrete, granular capabilities found in first-party documentation or repositories. It is not a universal feature-completeness claim, benchmark, or recommendation to adopt any framework wholesale.

## Scope and interpretation

- **Framework/library/runtime:** LangGraph, AutoGen, CrewAI, Microsoft Agent Framework (MAF), and Mastra provide execution primitives that a host application still has to embed. They are not, by themselves, complete Pi-style coding harnesses with Supernova-like UI, permissions, workspace policy, session UX, or product operations.
- **Companion platform:** LangSmith Studio and CrewAI AMP add developer or deployment surfaces around their runtimes; their capabilities are labelled separately where relevant.
- **Adjacent automation platform:** n8n is a broader workflow-automation product with an AI-agent layer. Its workflow, execution, approval, and debugging features are relevant references, but it should not be mistaken for a focused coding-agent harness.
- **Status:** `documented` means described as available in the cited first-party material; `experimental` means the cited material explicitly labels the capability experimental or preview; `proposed` means a Pi+ design implication, not an existing feature of the cited project.

## Feature catalogue

### Canonical primary-source set

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

### LangGraph — low-level graph orchestration library

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

### Microsoft Agent Framework — typed workflow and agent framework

| # | Feature | Behavior | Project / layer | Source | Status |
|---:|---|---|---|---|---|
| 12 | Typed workflow graph | Build workflows from executors and edges with validation for message compatibility, reachability, bindings, duplicate edges, and invalid connections. | MAF workflow runtime | [Workflow builder](https://learn.microsoft.com/en-us/agent-framework/workflows/workflows) | documented |
| 13 | Superstep barriers | Triggered executors run concurrently and synchronize at a barrier before the next workflow step. | MAF workflow runtime | [Workflow builder](https://learn.microsoft.com/en-us/agent-framework/workflows/workflows) | documented |
| 14 | Built-in orchestration patterns | Provide sequential, concurrent, handoff, group-chat, and manager-coordinated “Magentic” patterns. | MAF orchestration layer | [Orchestrations](https://learn.microsoft.com/en-us/agent-framework/workflows/orchestrations/) | documented |
| 15 | Request/response human checkpoint | Executors can send a request to an external operator and wait for a response; approval-required tools use the same mechanism. | MAF workflow runtime | [Human-in-the-loop](https://learn.microsoft.com/en-us/agent-framework/workflows/human-in-the-loop) | documented |
| 16 | Checkpointed resume with pending requests | Persist executor state, pending messages, shared state, and pending requests; restoration re-emits requests or accepts responses during resume. | MAF workflow runtime | [Checkpoints](https://learn.microsoft.com/en-us/agent-framework/workflows/checkpoints) | documented |
| 17 | Lifecycle and error events | Expose workflow, executor, superstep, request, output, intermediate, error, and warning events for host UIs and monitors. | MAF workflow runtime | [Workflow builder](https://learn.microsoft.com/en-us/agent-framework/workflows/workflows) | documented |
| 18 | Middleware pipelines | Insert request/response processing, exception handling, and custom pipeline logic around agent operations. | MAF agent framework | [MAF repository](https://github.com/microsoft/agent-framework) | documented |

### AutoGen — AgentChat/Core framework; GraphFlow is explicitly experimental

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

### CrewAI — Crews plus event-driven Flows

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

### Mastra — TypeScript agent/workflow framework and runtime

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

### n8n — adjacent workflow automation platform with an AI-agent layer

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

### Proposed Pi+ adaptations, informed by the adjacent frameworks

| # | Feature | Behavior | Project / layer | Source basis | Status |
|---:|---|---|---|---|---|
| 59 | Framework-neutral run contract | Give every orchestration backend a common run/thread ID, step ID, checkpoint cursor, interrupt payload, resume command, and typed event envelope. | Pi+ harness proposal | [LangGraph persistence](https://docs.langchain.com/oss/python/langgraph/persistence); [MAF checkpoints](https://learn.microsoft.com/en-us/agent-framework/workflows/checkpoints) | proposed |
| 60 | Approval-aware durable ledger | Persist pending approvals, idempotency keys, side-effect status, and resume policy before a mutating tool is allowed to run. | Pi+ harness proposal | [LangGraph interrupts](https://docs.langchain.com/oss/python/langgraph/interrupts); [Mastra snapshots](https://mastra.ai/en/reference/workflows/snapshots) | proposed |

## Ten notable findings

1. **Durability is a state model, not just a retry button.** LangGraph, MAF, CrewAI Flows, and Mastra all document persistence that records progress between steps; the relevant Pi+ design question is what is persisted and how it is resumed, not merely whether a loop retries. [LangGraph persistence](https://docs.langchain.com/oss/python/langgraph/persistence), [MAF checkpoints](https://learn.microsoft.com/en-us/agent-framework/workflows/checkpoints), [CrewAI Flows](https://github.com/crewAIInc/crewAI/blob/main/docs/edge/en/concepts/flows.mdx), [Mastra snapshots](https://mastra.ai/en/reference/workflows/snapshots)
2. **Human checkpoints are first-class in the strongest graph runtimes.** Dynamic interrupts, request/response ports, and persisted pending requests are more expressive than a UI confirmation dialog bolted onto the end of a run. [LangGraph interrupts](https://docs.langchain.com/oss/python/langgraph/interrupts), [MAF HITL](https://learn.microsoft.com/en-us/agent-framework/workflows/human-in-the-loop)
3. **Parallelism needs join semantics.** Fan-out/fan-in appears in LangGraph, MAF supersteps, AutoGen GraphFlow, CrewAI async tasks, Mastra `.parallel()`, and n8n sub-workflows, but each system exposes different failure, ordering, reducer, or completion rules. [LangGraph Graph API](https://docs.langchain.com/oss/python/langgraph/graph-api), [AutoGen GraphFlow](https://microsoft.github.io/autogen/stable/user-guide/agentchat-user-guide/graph-flow.html), [Mastra control flow](https://mastra.ai/docs/workflows/control-flow)
4. **Delegation has multiple meanings.** A subgraph, handoff message, manager-assigned task, nested workflow, and published sub-agent are not interchangeable; Pi+ should keep delegation type explicit in its run model. [LangGraph subgraphs](https://docs.langchain.com/oss/python/langgraph/use-subgraphs), [AutoGen Swarm](https://microsoft.github.io/autogen/stable/user-guide/agentchat-user-guide/swarm.html), [CrewAI Processes](https://github.com/crewAIInc/crewAI/blob/main/docs/edge/en/concepts/processes.mdx), [n8n agents](https://github.com/n8n-io/n8n-docs/blob/main/docs/build/build-and-manage-agents.md)
5. **AutoGen GraphFlow is useful design evidence but explicitly experimental.** Its directed graph, activation groups, loops, and parallel branches should not be treated as stable API commitments without version-pinned acceptance tests. [GraphFlow](https://microsoft.github.io/autogen/stable/user-guide/agentchat-user-guide/graph-flow.html)
6. **Debugging benefits from replayable state, not only logs.** LangGraph time travel, Mastra step replay, n8n execution retry, and MAF event streams point toward a UI that can inspect a run and restart from a selected boundary. [LangGraph time travel](https://docs.langchain.com/oss/python/langgraph/use-time-travel), [Mastra workflows](https://mastra.ai/docs/workflows/overview), [n8n executions](https://docs.n8n.io/workflows/executions/all-executions/)
7. **Memory is layered and scoped.** Thread state, cross-thread stores, RAG memory, working memory, semantic recall, and observational memory solve different problems; “memory enabled” is too coarse as a harness capability label. [LangGraph persistence](https://docs.langchain.com/oss/python/langgraph/persistence), [AutoGen memory](https://microsoft.github.io/autogen/stable/user-guide/agentchat-user-guide/memory.html), [Mastra memory](https://mastra.ai/articles/agent-memory)
8. **Workflow composition is a practical seam for Pi+.** CrewAI’s Flow-plus-Crew split, Mastra nested workflows, n8n sub-workflows, and LangGraph subgraphs all support a host that keeps deterministic orchestration outside autonomous agent steps. [CrewAI overview](https://docs.crewai.com/core-concepts/Agents), [Mastra workflows](https://mastra.ai/docs/workflows/overview), [n8n sub-workflows](https://github.com/n8n-io/n8n-docs/blob/main/docs/integrations/builtin/core-nodes/n8n-nodes-base.executeworkflow.md)
9. **Observability is a separate product surface in several stacks.** LangSmith Studio and CrewAI AMP are companion surfaces, while MAF, AutoGen, and Mastra expose runtime events or traces for a host to render. A Pi+ harness should not assume a library’s tracing API equals a usable operator UI. [LangSmith Studio](https://docs.langchain.com/langsmith/studio), [CrewAI AMP](https://docs.crewai.com/enterprise/introduction), [AutoGen tracing](https://microsoft.github.io/autogen/stable/user-guide/agentchat-user-guide/tracing.html), [Mastra observability](https://mastra.ai/docs/observability/overview)
10. **n8n is valuable mainly as an adjacent automation reference.** Its wait states, execution history, sub-workflow composition, and channel-based approvals are relevant control-plane patterns, while its preview AI-agent layer and broad integration platform introduce different scope and product assumptions than a Pi-based coding harness. [Flow logic](https://github.com/n8n-io/n8n-docs/blob/main/docs/build/flow-logic/README.md), [Execute Sub-workflow](https://github.com/n8n-io/n8n-docs/blob/main/docs/integrations/builtin/core-nodes/n8n-nodes-base.executeworkflow.md), [Human-in-the-loop tools](https://github.com/n8n-io/n8n-docs/blob/main/docs/build/integrate-ai/ai-examples/human-in-the-loop-for-tools.md)

## Evidence and limits

- Primary sources used: official project documentation, official documentation repositories, and official project repositories. The canonical source set is intentionally limited to ten source families for readability; individual rows link to the exact page used. The report uses short paraphrases only; it contains no long verbatim quotations, and repeated findings intentionally restate source material minimally.
- Framework and platform documentation describes capabilities, not an assurance that every combination is production-safe. Parallel side effects, cancellation, idempotency, access control, retry policy, and failure recovery still require Pi+ acceptance tests.
- API stability and feature availability can differ by language, release channel, hosted product tier, or preview status. Pin versions before implementation work.
- No implementation is included here. The two Pi+ rows are design proposals only; they do not assert that a universal adapter or durable ledger already exists.
