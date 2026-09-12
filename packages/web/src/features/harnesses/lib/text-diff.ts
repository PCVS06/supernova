export type DiffLineKind = "added" | "removed" | "same";

export interface DiffLine {
  kind: DiffLineKind;
  text: string;
}

export interface TextDiff {
  find: readonly DiffLine[];
  replace: readonly DiffLine[];
}

/** Line marks for a find/replace pair: a line missing from the other side changed, everything else is context. */
export function diffLines(find: string, replace: string): TextDiff {
  const findLines = find.split("\n");
  const replaceLines = replace.split("\n");
  const inFind = new Set(findLines);
  const inReplace = new Set(replaceLines);

  return {
    find: findLines.map((text) => ({kind: inReplace.has(text) ? "same" : "removed", text})),
    replace: replaceLines.map((text) => ({kind: inFind.has(text) ? "same" : "added", text})),
  };
}

/** How many lines the pair actually changes, for a one-line summary above the diff. */
export function countDiffLines(diff: TextDiff): {added: number; removed: number} {
  return {
    added: diff.replace.filter((line) => line.kind === "added").length,
    removed: diff.find.filter((line) => line.kind === "removed").length,
  };
}
