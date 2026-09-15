import {renderToStaticMarkup} from "react-dom/server";
import {describe, expect, it} from "vitest";
import InstructionReceipt from "@/features/harnesses/components/instruction-receipt";
import SessionLayout from "@/features/sessions/components/session-layout";

describe("context inspection", () => {
  it.each([
    {captured: true, origin: "Captured for this chat"},
    {captured: false, origin: "Current defaults"},
    {captured: undefined, origin: "Configuration source not recorded"},
  ])("shows $origin while keeping instruction details collapsed", ({captured, origin}) => {
    const html = renderToStaticMarkup(
      <InstructionReceipt
        captured={captured}
        layers={[
          {kind: "shared", label: "Harness instructions", owner: "Science Pi", content: "Always cite primary evidence."},
          {kind: "project", label: "Project instructions", owner: "Lab", content: "Retain falsification criteria."},
        ]}
      />
    );
    expect(html).toContain(origin);
    expect(html.includes("This chat has no saved configuration snapshot")).toBe(captured === false);
    expect(html).toContain("No runtime snapshot recorded.");
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

  it("identifies the recorded model and capture time without implying skills were used", () => {
    const capturedAt = "2026-09-15T12:00:00.000Z";
    const html = renderToStaticMarkup(
      <InstructionReceipt
        captured
        revision={4}
        scope="run"
        layers={[]}
        runtime={{
          capturedAt,
          systemPrompt: "Verify the evidence.",
          model: {providerId: "test-provider", id: "research-model", thinkingLevel: "high"},
          skills: ["source-verification"],
          contextFiles: ["evidence.md"],
          tools: ["read"],
        }}
      />
    );

    expect(html).toContain("Captured for this run");
    expect(html).toContain("Configuration revision 4");
    expect(html).toContain(`dateTime="${capturedAt}"`);
    expect(html).toContain("Model at capture");
    expect(html).toContain("test-provider / research-model · high");
    expect(html).toContain("Available skills may not have been invoked.");
    expect(html).toContain("System prompt at capture");
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
    expect(html).not.toContain("Chat identity");
  });
});
