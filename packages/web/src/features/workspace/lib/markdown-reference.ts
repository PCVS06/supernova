export type MarkdownReference =
  | {readonly kind: "external"; readonly url: string}
  | {readonly kind: "file"; readonly path: string; readonly anchor: string}
  | {readonly kind: "invalid"};

/** Resolves document links inside the project; the server also checks real paths and symlinks. */
export function resolveMarkdownReference(documentPath: string, reference: string): MarkdownReference {
  const value = reference.trim();
  if (/^(https?:|mailto:)/i.test(value) || value.startsWith("//")) return {kind: "external", url: value};
  if (!value || /^[a-z][a-z0-9+.-]*:/i.test(value)) return {kind: "invalid"};

  try {
    const hash = value.indexOf("#");
    const anchor = hash < 0 ? "" : decodeURIComponent(value.slice(hash + 1));
    const path = decodeURIComponent((hash < 0 ? value : value.slice(0, hash)).split("?")[0]!);
    if (path.includes("\\") || path.includes("\0")) return {kind: "invalid"};
    if (!path) return {kind: "file", path: documentPath, anchor};
    const segments = path.startsWith("/") ? [] : documentPath.split("/").slice(0, -1);
    for (const part of path.split("/")) {
      if (!part || part === ".") continue;
      if (part === "..") {
        if (segments.length === 0) return {kind: "invalid"};
        segments.pop();
      } else segments.push(part);
    }
    return segments.length ? {kind: "file", path: segments.join("/"), anchor} : {kind: "invalid"};
  } catch {
    return {kind: "invalid"};
  }
}
