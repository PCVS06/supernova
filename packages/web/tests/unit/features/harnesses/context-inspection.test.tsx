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
    expect(html).not.toContain("<details");
    expect(html).toContain("No runtime receipt yet");
    expect(html).toContain('aria-label="Resources"');
    expect(html).toContain('aria-label="Runtime"');
  });

  it("puts context in the chat header without adding a project-goals strip above the conversation", () => {
    const html = renderToStaticMarkup(
      <SessionLayout appEnvironment="web" contextStrip={<button>Context</button>} composer={<div>Composer</div>} timeline={<div>Conversation</div>} title="Research" />
    );
    expect(html.indexOf("Context")).toBeLessThan(html.indexOf("</header>"));
    expect(html.indexOf("Conversation")).toBeGreaterThan(html.indexOf("</header>"));
    expect(html).not.toContain("Goals");
  });
});
