/** Last segment of a project-relative path, used for tree rows and composer references. */
export function pathFileName(path: string): string {
  const segments = path.split("/").filter((segment) => segment.length > 0);
  return segments.at(-1) ?? path;
}

/** Ancestor directories of a project-relative path, outermost first, so a tree can reveal it. */
export function ancestorDirectories(path: string): readonly string[] {
  const segments = path.split("/").filter((segment) => segment.length > 0);

  return segments.slice(0, -1).map((_segment, index) => segments.slice(0, index + 1).join("/"));
}
