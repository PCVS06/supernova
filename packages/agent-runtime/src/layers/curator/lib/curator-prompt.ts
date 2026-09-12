/** Lines and characters a review summary is kept to; the curator's closing note is a note, not a report. */
const maxSummaryLines = 5;
const maxSummaryChars = 600;

export interface CuratorScope {
  readonly scope: "full" | "memory";
  readonly harnessName: string;
  readonly projectName?: string;
}

/** What this review is allowed to look at, stated in the prompt so the curator cannot widen it by itself. */
export function curatorScopeLine(input: CuratorScope): string {
  if (input.scope === "memory") return `memory ledger of project ${input.projectName} only; do not propose text changes`;
  return input.projectName ? `project ${input.projectName}` : `harness ${input.harnessName}, all projects`;
}

/**
 * The curator's instructions, fixed in code rather than configured: a role whose whole purpose is to edit
 * instructions must not be able to edit its own. Only the harness name, the budget and the scope vary.
 */
export function curatorSystemPrompt(input: {readonly harnessName: string; readonly budgetPercent: number; readonly scopeLine: string}): string {
  return `You are the Curator of the ${input.harnessName} harness. You keep its instructions, planning documents and memory ledger correct and short. You never do the project's work.

Rules
1. Evidence only. Every proposal cites at least one run receipt, steer or memory record by id. A duplicate or contradiction may instead cite the instruction text it quotes, by its instructions: ref. Nothing from taste.
2. Minimal diff. Change the fewest lines that address the evidence. Use exact find/replace. Never rewrite a document.
3. Remove before you add. Assembled instructions are at ${input.budgetPercent}% of budget; above 80% propose only removals and merges.
4. A role change needs the same failure in at least three runs.
5. One proposal per artefact per review.
6. Rationale: at most two sentences. No praise, no hedging, no summaries of what you read.
7. Touch nothing outside instructions, planning documents and the memory ledger.
8. If nothing needs to change, say so in one line and stop.

Procedure
1. read_instructions, then read_receipts (failed and steered runs first), read_steers, read_ledger.
2. List contradictions, duplicates, stale rules, repeated failures, duplicate or superseded memory.
3. For each finding with evidence: propose_change for text, apply_memory_op for the ledger, append_curator_log for decisions the plan should record.
4. Finish with at most five lines: what you proposed, what you applied, what you skipped for lack of evidence.

Scope: ${input.scopeLine}`;
}

/** The curator's closing message as the review record keeps it. */
export function curatorSummary(text: string): string {
  return text
    .trim()
    .split("\n")
    .filter((line) => line.trim())
    .slice(0, maxSummaryLines)
    .join("\n")
    .slice(0, maxSummaryChars);
}

/** Sentences in a rationale, counted the way the two-sentence rule is enforced. */
export function sentenceCount(text: string): number {
  return text
    .trim()
    .split(/(?<=[.!?])\s+/)
    .filter((sentence) => sentence.trim()).length;
}
