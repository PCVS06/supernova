import {describe, expect, it} from "vitest";
import {resolveMarkdownReference} from "@/features/workspace/lib/markdown-reference";

describe("project Markdown references", () => {
  it.each([
    ["details.md", "docs/details.md", ""],
    ["../README.md#overview", "README.md", "overview"],
    ["/images/chart.svg", "images/chart.svg", ""],
    ["notes%20%C3%BC.md#r%C3%A9sum%C3%A9", "docs/notes ü.md", "résumé"],
    ["chart.svg?raw=1", "docs/chart.svg", ""],
    ["#results", "docs/plan.md", "results"],
    ["./nested/../details.md", "docs/details.md", ""],
  ])("resolves %s relative to the document", (reference, path, anchor) => {
    expect(resolveMarkdownReference("docs/plan.md", reference)).toEqual({kind: "file", path, anchor});
  });

  it.each(["../../secrets.md", "%2e%2e/%2e%2e/secrets", "..%5csecrets", "bad%00path", "invalid%", "file:///etc/passwd", "javascript:alert(1)", ""])(
    "refuses an escaping or unsupported reference: %s",
    (reference) => {
      expect(resolveMarkdownReference("docs/plan.md", reference)).toEqual({kind: "invalid"});
    }
  );

  it.each(["https://example.com/docs", "http://localhost:3000", "mailto:help@example.com", "//example.com/chart.svg"])("preserves external reference %s", (url) => {
    expect(resolveMarkdownReference("docs/plan.md", url)).toEqual({kind: "external", url});
  });
});
