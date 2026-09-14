import {renderToStaticMarkup} from "react-dom/server";
import {describe, expect, it} from "vitest";
import InstructionReceipt from "@/features/harnesses/components/instruction-receipt";
import AgentMark from "@/features/harnesses/components/agent-mark";

describe("chat identity and instruction provenance", () => {
  it.each([
    ["specialist", "e", false, "Specialist worker"],
    ["lead", "phi", false, "Project lead"],
    ["orchestrator", "tau", false, "Lead orchestrator"],
    ["curator", "i", true, "Curator"],
    ["specialist", "e", true, "Specialist worker"],
  ] as const)("identifies %s as %s while preserving its activity", (kind, constant, working, label) => {
    const html = renderToStaticMarkup(<AgentMark name="reviewer" color="#7dd3fc" kind={kind} working={working} />);
    expect(html).toContain(`data-constant="${constant}"`);
    expect(html).toContain(label);
    expect(html).toContain(`data-state="${working ? "working" : "idle"}"`);
    expect(html).not.toContain('style="color:#7dd3fc"');
  });
  it("does not present configuration as an observed runtime prompt", () => {
    const html = renderToStaticMarkup(<InstructionReceipt layers={[{kind: "shared", owner: "Science Space", label: "Shared manual", content: "Scientific rules"}]} />);
    expect(html).toContain("Not recorded.");
    expect(html).toContain("Scientific rules");
    expect(html).not.toContain("Exact runtime system prompt");
  });
});
