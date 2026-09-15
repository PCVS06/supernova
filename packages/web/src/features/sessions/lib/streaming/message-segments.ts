export interface StreamingMessageSegment {
  mode: "markdown" | "text";
  text: string;
}

/** Finds unfinished code/math blocks and the last completed display formula. */
function findBlockBoundaries(text: string): {openStart?: number; mathEnd: number} {
  const lines = text.split("\n");
  let offset = 0;
  let open: {char: string; size: number; start: number} | undefined;
  let mathEnd = 0;

  for (const line of lines) {
    // Markdown fences may be indented up to three spaces. Track the exact
    // marker so longer fences can contain shorter ones without closing early.
    const match = line.match(/^[\t ]{0,3}(`{3,}|~{3,}|\${2,})/);
    if (match?.[1]) {
      const mark = match[1];
      if (!open) {
        if (mark[0] === "$" && line.slice(match[0].length).includes(mark)) {
          mathEnd = Math.min(text.length, offset + line.length + 1);
        } else {
          open = {char: mark[0] ?? "`", size: mark.length, start: offset};
        }
      } else if (mark[0] === open.char && mark.length >= open.size && line.slice(match[0].length).trim() === "") {
        if (open.char === "$") mathEnd = Math.min(text.length, offset + line.length + 1);
        open = undefined;
      }
    }
    offset += line.length + 1;
  }

  return {openStart: open?.start, mathEnd};
}

/** Splits streaming text so stable Markdown can render while unstable trailing text stays plain. */
export function segmentStreamingMessage(text: string): StreamingMessageSegment[] {
  if (!text) return [];

  // An unfinished fenced block is the most unstable Markdown shape while
  // streaming: reparsing it on every token causes layout churn and repeated
  // highlighter work. Keep the open fence and everything after it as text.
  const blocks = findBlockBoundaries(text);
  if (blocks.openStart !== undefined) {
    const head = text.slice(0, blocks.openStart);
    const tail = text.slice(blocks.openStart);
    return [...(head.trim().length > 0 ? [{mode: "markdown" as const, text: head}] : []), {mode: "text", text: tail}];
  }

  // Outside code fences, only promote complete paragraphs to Markdown. The
  // trailing paragraph is still changing token-by-token, so render it as text
  // until a blank-line boundary makes it stable.
  const paragraphBoundary = text.lastIndexOf("\n\n");
  const boundary = Math.max(paragraphBoundary === -1 ? 0 : paragraphBoundary + 2, blocks.mathEnd);
  if (boundary === 0) return [{mode: "text", text}];

  const head = text.slice(0, boundary);
  const tail = text.slice(boundary);
  return [...(head.trim().length > 0 ? [{mode: "markdown" as const, text: head}] : []), ...(tail.length > 0 ? [{mode: "text" as const, text: tail}] : [])];
}
