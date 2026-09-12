import {renderToStaticMarkup} from "react-dom/server";
import {describe, expect, it} from "vitest";
import InstructionReceipt from "@/features/harnesses/components/instruction-receipt";
import SessionLayout from "@/features/sessions/components/session-layout";

describe("context inspection", () => {
  it.each([
    {captured: true, notice: "Captured for this chat. Changes in Settings apply to new chats."},
    {captured: false, notice: "No saved configuration snapshot. These are current project defaults, not verified historical instructions."},
  ])("keeps instruction provenance explicit when captured=$captured", ({captured, notice}) => {
    const html = renderToStaticMarkup(
      <InstructionReceipt
        captured={captured}
        layers={[
          {kind: "shared", label: "Harness instructions", owner: "Science Pi", content: "Always cite primary evidence."},
          {kind: "project", label: "Project instructions", owner: "Lab", content: "Retain falsification criteria."},
        ]}
      />
    );
    expect(html).toContain(notice);
    expect(html).toContain("Always cite primary evidence.");
    expect(html).toContain("Retain falsification criteria.");
    expect(html).toContain("<details");
    expect(html).not.toContain('open=""');
    expect(html).toContain(">Harness<");
    expect(html).toContain(">Project<");
    expect(html).toContain("No runtime receipt yet");
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
