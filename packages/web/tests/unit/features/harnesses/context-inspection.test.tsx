import {renderToStaticMarkup} from "react-dom/server";
import {describe, expect, it} from "vitest";
import InstructionReceipt from "@/features/harnesses/components/instruction-receipt";
import SessionLayout from "@/features/sessions/components/session-layout";

describe("context inspection", () => {
  it.each([true, false])("keeps instruction context concise when captured=%s", (captured) => {
    const html = renderToStaticMarkup(
      <InstructionReceipt
        captured={captured}
        layers={[
          {kind: "shared", label: "Harness instructions", owner: "Science Pi", content: "Always cite primary evidence."},
          {kind: "project", label: "Project instructions", owner: "Lab", content: "Retain falsification criteria."},
        ]}
      />
    );
    expect(html).not.toContain("Captured for this chat");
    expect(html).not.toContain("No saved configuration snapshot");
    expect(html).toContain("Always cite primary evidence.");
    expect(html).toContain("Retain falsification criteria.");
    expect(html).toContain("<details");
    expect(html).not.toContain('open=""');
    expect(html).toContain(">Harness<");
    expect(html).toContain(">Project<");
    expect(html).not.toContain("No runtime receipt yet");
    expect(html).toContain(">Resources<");
    expect(html).toContain(">Runtime<");
  });

  it.each([
    {header: false, variant: "primary" as const},
    {header: true, variant: "pane" as const},
  ])("renders the $variant chat with header=$header", ({header, variant}) => {
    const html = renderToStaticMarkup(<SessionLayout appEnvironment="web" composer={<div>Composer</div>} timeline={<div>Conversation</div>} title="Research" variant={variant} />);
    expect(html.includes("<header")).toBe(header);
    expect(html).toContain("Conversation");
    expect(html).toContain("Composer");
    expect(html.includes("Research")).toBe(header);
  });
});
