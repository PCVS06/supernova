import {renderToStaticMarkup} from "react-dom/server";
import {describe, expect, it} from "vitest";
import AssistantMessageContent from "@/features/sessions/components/timeline/items/assistant/assistant-message-content";
import UserMessage from "@/features/sessions/components/timeline/items/user-message";

const aligned = String.raw`$$
\begin{aligned}
|\vec v_B| &= \sqrt{v_A^2+u^2+2v_Au\cos\theta} \\
&\approx 8.68\,\mathrm{m\,s^{-1}}.
\end{aligned}
$$`;

describe("automatic chat math", () => {
  it.each([
    {name: "aligned velocity example", text: aligned},
    {name: "boxed display", text: String.raw`$$\boxed{|\vec v_B|\approx 8.68\,\mathrm{m\,s^{-1}}}$$`},
    {name: "inline dollars", text: String.raw`Energy is $E=mc^2$.`},
    {name: "inline TeX delimiters", text: String.raw`Energy is \(E=mc^2\).`},
    {name: "display TeX delimiters", text: String.raw`\[\frac{a}{b}=c\]`},
    {name: "math fence", text: "```math\nE=mc^2\n```"},
  ])("renders $name without showing a syntax error", ({text}) => {
    const html = renderToStaticMarkup(<AssistantMessageContent>{text}</AssistantMessageContent>);
    expect(html).toContain('class="katex"');
    expect(html).toContain("<math");
    expect(html).not.toContain('class="katex-error"');
  });

  it.each([
    {name: "currency", text: "It costs $20 and $30 for two options."},
    {name: "inline code", text: "Use `$x^2$` or `\\(x\\)` in the source."},
    {name: "fenced source", text: "````text\n```math\nx^2\n```\n\\[x\\]\n````"},
  ])("keeps $name literal", ({text}) => {
    const html = renderToStaticMarkup(<AssistantMessageContent>{text}</AssistantMessageContent>);
    expect(html).not.toContain('class="katex"');
    if (text.startsWith("It costs")) expect(html).toContain("$20 and $30");
  });

  it("keeps unsupported math readable without crashing the surrounding reply", () => {
    const html = renderToStaticMarkup(<AssistantMessageContent>{String.raw`Before $\unknowncommand{x}$ after.`}</AssistantMessageContent>);
    expect(html).toContain("Before");
    expect(html).toContain("after.");
    expect(html).toContain("unknowncommand");
  });

  it("renders submitted user formulas while keeping their source available for copying", () => {
    const html = renderToStaticMarkup(
      <UserMessage turnId="math-turn" message={{id: "math-message", contentParts: [{type: "text", text: aligned}], timestamp: "2026-09-15T15:00:00.000Z"}} />
    );
    expect(html).toContain('class="katex"');
    expect(html).toContain("Copy message");
  });

  it("renders a completed display formula during streaming, including internal blank lines", () => {
    const html = renderToStaticMarkup(<AssistantMessageContent streaming>{"Introduction.\n\n$$\nx^2\n\n+y^2\n$$\nStill writing $20"}</AssistantMessageContent>);
    expect(html).toContain('class="katex"');
    expect(html.replace(/<[^>]+>/g, "")).toContain("Still writing $20");
    expect(html).not.toContain('class="katex-error"');
  });
});
