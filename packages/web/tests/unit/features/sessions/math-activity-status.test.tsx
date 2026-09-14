import {renderToStaticMarkup} from "react-dom/server";
import {describe, expect, it} from "vitest";
import MathActivityStatus from "@/features/sessions/components/timeline/math-activity-status";

describe("conversation identity after a reply", () => {
  it.each(["pi", "phi", "e", "tau", "i"] as const)("keeps %s visible and idle after opening a completed conversation", (constant) => {
    const html = renderToStaticMarkup(<MathActivityStatus constant={constant} busy={false} completedId="completed" />);
    expect(html).toContain(`data-constant="${constant}"`);
    expect(html).toContain('data-state="idle"');
    expect(html).toContain("Ready");
    expect(html).not.toContain("Reply complete");
  });
});
