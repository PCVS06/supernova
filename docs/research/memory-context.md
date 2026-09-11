# Memory and context feature catalogue for a customizable Pi+ harness

Research snapshot: 2026-09-11. This is a source-backed catalogue, not a claim of universal completeness. It covers the assigned scope only: Letta/MemGPT, Mem0, Zep/Graphiti, LlamaIndex, and DSPy. ACE, RLM, Reflexion, and code-execution-with-MCP are intentionally omitted because they are covered in `docs/research/experimental-context.md`.

## How to read this catalogue

- **Documented**: the cited official documentation or repository describes the capability as available.
- **Experimental**: the official source describes the capability as experimental or actively under exploration; it should not be treated as a stable default.
- **Frozen/deprecated**: the official source says the capability is feature-frozen, deprecated, or recommends a successor; this is distinct from an experimental capability.
- **Proposed**: a Pi+ integration idea derived from the documented building block; no source below proves that Pi+ already implements it.
- **Library/framework** means an embeddable component. **Full harness** means the project documents a broader agent runtime or product surface. A capability is not promoted from library to harness feature merely because an integration example exists.

## Feature catalogue

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
## Ten notable findings

1. **Letta is the clearest full-harness reference.** Its official material combines a stateful runtime, persistent memory, skills, scheduling, channels, and delegation. The other projects are primarily components or application frameworks.
2. **MemGPT is best treated as the research model behind a memory architecture.** The practical Letta surface is the runtime; the paper explains virtual context management and tier movement, not a ready-made Pi+ integration.
3. **Memory write policy is as important as retrieval.** Mem0 documents extraction, deduplication, scope, explicit correction, and deletion; a harness should not silently treat every model-generated memory as authoritative.
4. **Mem0 graph memory does not automatically replace vector ranking.** Its documented graph relations enrich results, while vector hits retain their own ordering unless the host configures a reranker or another policy.
5. **Graphiti and Zep must be separated.** Graphiti is the open-source temporal graph library; Zep is the managed context product built on that lineage, with additional governance and scale positioning.
6. **Temporal truth is a first-class retrieval dimension.** Graphiti/Zep preserve fact validity and invalidity intervals, allowing current and historical state to be distinguished instead of overwriting old facts.
7. **Graph schemas are configurable but not free.** Custom entities, edges, filters, namespaces, and schema evolution are documented; extraction quality still depends on the ontology and prompts chosen by the application.
8. **LlamaIndex is a composition toolkit, not a memory policy.** It supplies filters, auto-retrieval, routing, recursive retrieval, postprocessing, workflows, and many connectors, but the Pi+ harness would still own authority, scope, persistence, and lifecycle decisions.
9. **LlamaIndex QueryPipeline should not be treated as the default future seam.** Its own documentation marks the abstraction as feature-frozen/deprecation-phase and points new orchestration work toward workflows; this is a frozen/deprecated status, not an experimental one.
10. **DSPy optimizes programs against metrics; it is not a coding-agent harness.** Typed signatures, modules, optimizers, and evaluation loops are strong candidates for a prompt/context optimization layer, but they do not supply Pi workspace lifecycle, permissions, memory governance, or UI.

## Gaps and boundaries

- This catalogue does not claim exhaustive coverage of adapters, vector stores, graph providers, model providers, or every LlamaIndex pack.
- “Documented” means documented by the cited source, not independently validated end-to-end inside Supernova.
- No cited project documents a native, complete Letta–Mem0–Graphiti–LlamaIndex–DSPy–Pi integration. The backlog below is therefore explicitly hypothetical, not existing Supernova functionality.
- The catalogue intentionally avoids ACE, RLM, Reflexion, and code-execution-with-MCP; consult `docs/research/experimental-context.md` for those.

## Backlog: unverified Pi+ integration avenues

These are useful follow-up hypotheses, but are deliberately not counted as source-backed catalogue rows:

- **Proposed:** pluggable memory-scope adapter for user/project/session/run isolation.
- **Proposed:** context assembly contract for ordered blocks, memories, graph facts, documents, and tool results.
- **Proposed:** provenance-preserving context view with inspectable memory/episode/node/edge identifiers.
- **Proposed:** per-run retrieval policy controls for backend, top-k, filters, reranking, graph toggles, and time windows.
- **Proposed:** memory-write review queue with explicit accept/update/delete actions.
- **Proposed:** context/retrieval replay containing queries, selected context, filters, prompt version, outputs, and scores.

None of these backlog items is claimed to exist in Supernova or to be natively supplied by any one cited project.

## Primary source set

The rows rely on official project documentation, official repositories, or the original MemGPT paper only: [Letta docs](https://docs.letta.com/), [Letta block guide/API](https://docs.letta.com/tutorials/attaching-detaching-blocks/), [MemGPT paper](https://arxiv.org/abs/2310.08560), [Mem0 docs/repository](https://docs.mem0.ai/open-source/features/graph-memory), [Graphiti/Zep docs](https://help.getzep.com/graphiti/getting-started/overview), [Zep facts/context docs](https://help.getzep.com/facts), [LlamaIndex docs](https://docs.llamaindex.ai/en/stable/), and [DSPy docs/repository](https://dspy.ai/).
