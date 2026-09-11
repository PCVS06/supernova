# Experimental context and self-improvement patterns

Snapshot: 2026-09-11. Research ideas and published implementation patterns, not built-in Pi+ capabilities. No benchmark was reproduced. These complement the harness catalogue; they are not endorsements of unattended self-modification.

## ACE: evolving playbooks

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

## Recursive Language Models

Source: [RLM authors' implementation](https://github.com/alexzhang13/rlm). Status: research implementation. Large external inputs do not make the underlying model's context unlimited. The default local code environment is not a strong security sandbox.

| ID | Feature | Behavior |
|---|---|---|
| RC01 | Context as an external variable | Keep large inputs in a code environment instead of stuffing every token into a prompt. |
| RC02 | Programmatic context inspection | Search, slice, and decompose input through code. |
| RC03 | Recursive model calls | Invoke subordinate model calls over selected subproblems. |
| RC04 | Code-controlled decomposition | Let the model express its decomposition and aggregation program. |
| RC05 | Selectable execution environments | Choose local execution or supported isolated environments. |
| RC06 | Recursive trajectory inspection | Log and visualize execution trajectories. |

## Reflexion

Source: [Reflexion authors' implementation](https://github.com/noahshinn/reflexion). Status: research implementation, not model-weight training.

| ID | Feature | Behavior |
|---|---|---|
| RF01 | Reflection between attempts | Feed a critique of the failed attempt into another attempt. |
| RF02 | Reflection context policy | Choose previous attempt, reflection, both, or neither. |
| RF03 | Persistent reflection memory | Carry lessons between trials. |
| RF04 | Resumable trial series | Continue experiments from saved logs. |

## Code execution with MCP

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

## Pi+ design implications — proposals, not source features

- Put learned context changes in a review queue with a diff, provenance, and rollback.
- Evaluate proposed prompt/memory changes against held-out tasks before activation.
- Bound recursive calls by depth, concurrency, spend, wall time, and allowed side effects.
- Keep raw external material separate from trusted instructions; tool output must not silently become policy.
- Expose a visible context manifest: included items, excluded items, transformation history, and token estimates.
