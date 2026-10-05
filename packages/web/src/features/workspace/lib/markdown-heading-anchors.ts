interface MarkdownNode {
  type: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: MarkdownNode[];
}

function headingText(node: MarkdownNode): string {
  if (node.type === "text") return node.value ?? "";
  return node.children?.map(headingText).join("") ?? "";
}

/** Adds stable, document-local heading targets, including repeated headings. */
export function markdownHeadingAnchors() {
  return (root: MarkdownNode): void => {
    const used = new Set<string>();
    const visit = (node: MarkdownNode): void => {
      if (node.type === "element" && /^h[1-6]$/.test(node.tagName ?? "")) {
        const base = headingText(node)
          .trim()
          .toLowerCase()
          .replace(/[^\p{L}\p{N}\p{M}\s_-]/gu, "")
          .replace(/\s/g, "-");
        let id = base;
        let suffix = 0;
        while (used.has(id)) id = `${base}-${++suffix}`;
        used.add(id);
        node.properties = {...node.properties, id};
      }
      node.children?.forEach(visit);
    };
    visit(root);
  };
}
