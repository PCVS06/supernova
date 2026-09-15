/** Normalizes common TeX delimiters while preserving code, escapes and currency amounts. */
export function normalizeMathMarkdown(text: string): string {
  let result = "";
  let index = 0;

  while (index < text.length) {
    const rest = text.slice(index);
    // Fenced examples remain literal, including longer fences containing shorter ones.
    const fence = index === 0 || text[index - 1] === "\n" ? rest.match(/^[ \t]{0,3}(`{3,}|~{3,})[^\n]*(?:\n|$)/) : null;
    if (fence) {
      const marker = fence[1]!;
      const closing = new RegExp(`^[ \\t]{0,3}${marker[0]}{${marker.length},}[ \\t]*$`, "m").exec(rest.slice(fence[0].length));
      const end = closing ? fence[0].length + closing.index + closing[0].length : rest.length;
      result += rest.slice(0, end);
      index += end;
      continue;
    }
    if (text[index] === "`") {
      const marker = rest.match(/^`+/)![0];
      const closing = new RegExp(`(?<!\x60)\x60{${marker.length}}(?!\x60)`).exec(rest.slice(marker.length));
      const end = closing ? marker.length + closing.index + marker.length : marker.length;
      result += rest.slice(0, end);
      index += end;
      continue;
    }
    if (rest.startsWith("\\[") || rest.startsWith("\\(")) {
      const display = rest[1] === "[";
      const closing = text.indexOf(display ? "\\]" : "\\)", index + 2);
      if (closing !== -1) {
        const formula = text.slice(index + 2, closing).trim();
        result += display ? `\n$$\n${formula}\n$$\n` : `$${formula}$`;
        index = closing + 2;
        continue;
      }
    }
    if (text[index] === "\\") {
      result += text.slice(index, index + 2);
      index += 2;
      continue;
    }
    if (rest.startsWith("$$")) {
      const closing = text.indexOf("$$", index + 2);
      const end = closing === -1 ? text.length : closing + 2;
      result += text.slice(index, end);
      index = end;
      continue;
    }
    if (text[index] === "$") {
      const closing = /(?<!\\)\$/.exec(rest.slice(1));
      const end = closing ? index + 1 + closing.index : -1;
      const formula = end === -1 ? "" : text.slice(index + 1, end);
      // A closing dollar followed by a digit belongs to another price, not this formula.
      if (formula && !formula.includes("\n") && formula.trim() === formula && !/\d/.test(text[end + 1] ?? "")) {
        result += text.slice(index, end + 1);
        index = end + 1;
        continue;
      }
      result += "\\$";
      index += 1;
      continue;
    }
    result += text[index];
    index += 1;
  }
  return result;
}
