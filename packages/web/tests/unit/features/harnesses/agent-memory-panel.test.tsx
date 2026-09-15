import {renderToStaticMarkup} from "react-dom/server";
import {beforeEach, describe, expect, it, vi} from "vitest";
import type {HarnessProject} from "@supernova/contracts/harnesses/schemas";
import type {HarnessMemoryResult} from "@supernova/contracts/harnesses/procedures";
import AgentMemoryPanel from "@/features/harnesses/components/agent-memory-panel";

const memory = vi.hoisted(() => ({data: undefined as HarnessMemoryResult | undefined, isError: false, isPending: false, isFetching: false, refetch: vi.fn(), scope: vi.fn()}));
vi.mock("@/features/harnesses/hooks/api/use-harness-resources", () => ({
  useHarnessMemory: (harnessId: string, projectId?: string) => {
    memory.scope(harnessId, projectId);
    return memory;
  },
}));

const head: HarnessProject = {id: "head", harnessId: "science", name: "Science Space", path: "/science", systemPrompt: "", contextInstructions: "", agents: []};
const lab: HarnessProject = {...head, id: "lab", name: "Robot Lab", path: "/robot", color: "#7dd3fc"};

describe("agent memory panel", () => {
  beforeEach(() => {
    memory.scope.mockClear();
    memory.isError = false;
    memory.data = {projectName: "Science Space", available: false, total: 0, rejected: 0, records: []};
  });

  it("reads one ledger without a picker, says it is read-only and names the storage file", () => {
    const html = renderToStaticMarkup(<AgentMemoryPanel explanation="Records the agents saved while working in Science Space." harnessId="science" projects={[head]} />);
    expect(html).toContain("Memory · read-only");
    expect(html).toContain("Records the agents saved while working in Science Space.");
    expect(html).toContain("/science/.science-memory/ledger.jsonl");
    expect(html).toContain('aria-label="Refresh memory"');
    expect(html).toContain('aria-label="Search memory"');
    expect(html).not.toContain('aria-label="Project ledger"');
    expect(html).toContain("Nothing saved yet");
    expect(memory.scope).toHaveBeenCalledWith("science", "head");
  });

  it("opens the requested ledger and offers the others when several are readable", () => {
    const html = renderToStaticMarkup(
      <AgentMemoryPanel explanation="Records the agents saved while working in Robot Lab." harnessId="science" projectId="lab" projects={[head, lab]} />
    );
    expect(html).toContain('aria-label="Project ledger"');
    expect(html).toContain("/robot/.science-memory/ledger.jsonl");
    expect(memory.scope).toHaveBeenCalledWith("science", "lab");
  });

  it("shows record state and evidence without interpreting saved text as markup", () => {
    memory.data = {
      projectName: "Science Space",
      available: true,
      total: 1,
      rejected: 2,
      records: [
        {
          id: "R-01",
          kind: "research_finding",
          state: "provisional",
          updatedAt: "2026-09-11T12:00:00Z",
          statement: "Evidence <script>unsafe()</script>",
          evidence: ["doi:10.0000/example"],
        },
      ],
    };
    const html = renderToStaticMarkup(<AgentMemoryPanel explanation="Records the agents saved while working in Science Space." harnessId="science" projects={[head]} />);
    expect(html).toContain("research finding");
    expect(html).toContain("provisional");
    expect(html).toContain("Updated 2026-09-11");
    expect(html).toContain("Evidence · 1 references");
    expect(html).toContain("doi:10.0000/example");
    expect(html).toContain("&lt;script&gt;unsafe()&lt;/script&gt;");
    expect(html).not.toContain("<script>");
    expect(html).toContain("2 malformed entries skipped");
  });

  it("reports a read failure without pretending memory is empty", () => {
    memory.data = undefined;
    memory.isError = true;
    const html = renderToStaticMarkup(<AgentMemoryPanel explanation="Records the agents saved while working in Science Space." harnessId="science" projects={[head]} />);
    expect(html).toContain("Could not read memory. No files were changed.");
    expect(html).not.toContain("Nothing saved yet");
  });

  it("explains a missing project folder instead of claiming the ledger is empty", () => {
    memory.data = {projectName: "Robot Lab", available: false, unavailableReason: "workspace-missing", total: 0, rejected: 0, records: []};
    const html = renderToStaticMarkup(<AgentMemoryPanel explanation="Records the agents saved while working in Robot Lab." harnessId="science" projects={[lab]} />);
    expect(html).toContain("Project folder missing");
    expect(html).toContain("Restore the folder on the server, then refresh.");
    expect(html).not.toContain("Nothing saved yet");
  });
});
