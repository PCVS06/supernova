import {describe, expect, it} from "vitest";
import {curatorScopeLine, curatorSummary, curatorSystemPrompt, sentenceCount} from "@supernova/agent-runtime/layers/curator/lib/curator-prompt";

describe("curator prompt", () => {
  it("states the harness, the budget and the scope, and nothing else", () => {
    const prompt = curatorSystemPrompt({harnessName: "Science Pi", budgetPercent: 83, scopeLine: "project Enzymes"});

    expect(prompt.startsWith("You are the Curator of the Science Pi harness.")).toBe(true);
    expect(prompt).toContain("Assembled instructions are at 83% of budget");
    expect(prompt.trimEnd().endsWith("Scope: project Enzymes")).toBe(true);
    // Eight rules and a four-step procedure, with no room for anything else.
    expect(prompt.match(/^\d\. /gm)).toHaveLength(12);
    expect(prompt).toContain("4. A role change needs the same failure in at least three runs; read_failures shows which groups qualify.");
    expect(prompt).toContain("1. read_instructions, then read_failures, read_receipts (failed and steered runs first), read_steers, read_requests, read_ledger.");
  });

  it("names the scope a review is allowed to touch", () => {
    expect(curatorScopeLine({scope: "full", harnessName: "Science Pi"})).toBe("harness Science Pi, all projects");
    expect(curatorScopeLine({scope: "full", harnessName: "Science Pi", projectName: "Enzymes"})).toBe("project Enzymes");
    expect(curatorScopeLine({scope: "memory", harnessName: "Science Pi", projectName: "Enzymes"})).toBe("memory ledger of project Enzymes only; do not propose text changes");
  });

  it("keeps a review summary to five lines and six hundred characters", () => {
    expect(curatorSummary("  One\n\nTwo\nThree\nFour\nFive\nSix\nSeven  ")).toBe("One\nTwo\nThree\nFour\nFive");
    expect(curatorSummary("x".repeat(900))).toHaveLength(600);
    expect(curatorSummary("")).toBe("");
  });

  it("counts the sentences of a rationale the way the two-sentence rule does", () => {
    expect(sentenceCount("Contradicts the rule above it.")).toBe(1);
    expect(sentenceCount("Three runs failed on it. The steer says the same.")).toBe(2);
    expect(sentenceCount("One. Two. Three.")).toBe(3);
    expect(sentenceCount("No full stop at all")).toBe(1);
  });
});
