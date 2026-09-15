import {renderToStaticMarkup} from "react-dom/server";
import {describe, expect, it} from "vitest";
import AgentMark from "@/features/harnesses/components/agent-mark";
import ChatRoleBadge from "@/features/sessions/components/chat-role-badge";
import SessionHeader from "@/features/sessions/components/session-header";

describe("session header", () => {
  it("shows the project's mark, the chat title and who the chat talks to", () => {
    const html = renderToStaticMarkup(
      <SessionHeader
        badge={<ChatRoleBadge role="project-lead" title="Science Lab · /work/lab" />}
        mark={<AgentMark className="size-6" color="#7dd3fc" kind="lead" name="lab" />}
        title="Rewrite the intake flow"
      />
    );

    expect(html).toContain("Rewrite the intake flow");
    expect(html).toContain("Project lead");
    expect(html).toContain('data-chat-role="project-lead"');
    // The mark leads the row, so a chat is recognizable before its title is read.
    expect(html.indexOf("<svg")).toBeLessThan(html.indexOf("Rewrite the intake flow"));
  });

  it("names a plain harness chat without claiming a lead", () => {
    const html = renderToStaticMarkup(<SessionHeader badge={<ChatRoleBadge />} mark={<AgentMark name="reviewer" />} title="Check the migration" />);

    expect(html).toContain('data-chat-role="chat"');
    expect(html).not.toContain("Project lead");
  });

  it.each(["harness-lead", "project-lead", "chat"] as const)("distinguishes %s provenance", (role) => {
    const html = renderToStaticMarkup(<ChatRoleBadge role={role} />);
    expect(html).toContain({"harness-lead": "Harness lead", "project-lead": "Project lead", chat: "Chat"}[role]);
    expect(html).toContain(`data-chat-role="${role}"`);
  });

  it("separates project identity from the chat title", () => {
    const html = renderToStaticMarkup(<SessionHeader subtitle="Research lab" title="Evidence review" />);
    expect(html.indexOf("Research lab")).toBeLessThan(html.indexOf("Evidence review"));
    expect(html).toContain("<h1");
  });
});
