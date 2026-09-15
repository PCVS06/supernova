import {describe, expect, it} from "vitest";
import {countDiffLines, diffLines} from "@/features/harnesses/lib/text-diff";

describe("instruction text diff", () => {
  it("marks only the lines one side has, keeping the rest as context", () => {
    const diff = diffLines("Cite every claim.\nKeep answers short.", "Cite every claim.\nKeep answers short and dated.");

    expect(diff.find).toEqual([
      {kind: "same", text: "Cite every claim."},
      {kind: "removed", text: "Keep answers short."},
    ]);
    expect(diff.replace).toEqual([
      {kind: "same", text: "Cite every claim."},
      {kind: "added", text: "Keep answers short and dated."},
    ]);
    expect(countDiffLines(diff)).toEqual({added: 1, removed: 1});
  });

  it("reads a pure removal and a pure addition as such", () => {
    expect(countDiffLines(diffLines("Stale rule.\nKept rule.", "Kept rule."))).toEqual({added: 0, removed: 1});
    expect(countDiffLines(diffLines("Kept rule.", "Kept rule.\nNew rule."))).toEqual({added: 1, removed: 0});
  });

  it("reports no change when both sides are the same text", () => {
    const diff = diffLines("One rule.\nAnother rule.", "One rule.\nAnother rule.");

    expect(diff.find.every((line) => line.kind === "same")).toBe(true);
    expect(countDiffLines(diff)).toEqual({added: 0, removed: 0});
  });

  it("treats a moved line as unchanged, because the mark is per line and not per position", () => {
    const diff = diffLines("A\nB", "B\nA");

    expect(countDiffLines(diff)).toEqual({added: 0, removed: 0});
  });
});
