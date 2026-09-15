/** Recognizes the client-owned command, without capturing similar names or quoted text. */
export function goalCommandObjective(text: string): string | null {
  const match = /^\s*\/goal(?:\s+([\s\S]*))?$/i.exec(text);
  return match ? (match[1] ?? "").trim() : null;
}
