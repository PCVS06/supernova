import {renderToStaticMarkup} from "react-dom/server";
import {describe, expect, it} from "vitest";
import AgentMark from "@/features/harnesses/components/agent-mark";
import ChatRoleBadge from "@/features/sessions/components/chat-role-badge";
import SessionHeader from "@/features/sessions/components/session-header";

describe("session header", () => {
  it("shows the project's mark, the chat title and who the chat talks to", () => {
    const html = renderToStaticMarkup(
      <SessionHeader
        badge={<ChatRoleBadge lead title="Science Lab · /work/lab" />}
        mark={<AgentMark className="size-6" color="#7dd3fc" kind="lead" name="lab" />}
        title="Rewrite the intake flow"
      />
    );

    expect(html).toContain("Rewrite the intake flow");
    expect(html).toContain("Project lead");
    expect(html).toContain('data-chat-role="lead"');
    // The mark leads the row, so a chat is recognizable before its title is read.
    expect(html.indexOf("<svg")).toBeLessThan(html.indexOf("Rewrite the intake flow"));
  });

  it("names a plain harness chat without claiming a lead", () => {
    const html = renderToStaticMarkup(<SessionHeader badge={<ChatRoleBadge />} mark={<AgentMark name="reviewer" />} title="Check the migration" />);

    expect(html).toContain("Harness chat");
    expect(html).toContain('data-chat-role="harness"');
    expect(html).not.toContain("Project lead");
  });

  it("keeps the routed chat clear of the window controls and a pane flush left", () => {
    const routed = renderToStaticMarkup(<SessionHeader offsetClassName="left-48" title="Routed chat" />);
    const pane = renderToStaticMarkup(<SessionHeader title="Pane chat" />);

    expect(routed).toContain("left-48");
    expect(pane).not.toContain("left-48");
  });
});
