import {renderToStaticMarkup} from "react-dom/server";
import {beforeEach, describe, expect, it, vi} from "vitest";
import type {HarnessConfig, HarnessProject} from "@supernova/contracts/harnesses/schemas";
import type {HarnessMemoryResult} from "@supernova/contracts/harnesses/procedures";
import MemoryEditor from "@/features/harnesses/components/memory-editor";

const memory = vi.hoisted(() => ({data: undefined as HarnessMemoryResult | undefined, isError: false, isPending: false, isFetching: false, refetch: vi.fn(), scope: vi.fn()}));
vi.mock("@/features/harnesses/hooks/api/use-harness-resources", () => ({
  useHarnessMemory: (harnessId: string, projectId?: string) => {
    memory.scope(harnessId, projectId);
    return memory;
  },
}));
const harness: HarnessConfig = {
  id: "science",
  name: "Science Pi",
  description: "Research",
  systemPrompt: "Shared rules",
  coordinatorProjectId: "head",
  agents: [],
  extensions: [],
  skills: [],
  context: {instructions: "", files: [], includeProjectInstructions: true, autoCompaction: true, reserveTokens: 1000, keepRecentTokens: 1000},
  graph: {steps: []},
  loop: {maxTurns: 10, timeoutSeconds: 60},
};
const head: HarnessProject = {id: "head", harnessId: "science", name: "Science Space", path: "/science", systemPrompt: "", contextInstructions: "", agents: []};
const lab: HarnessProject = {...head, id: "lab", name: "Robot Lab", path: "/robot", color: "#7dd3fc"};
const render = (project = head) => renderToStaticMarkup(<MemoryEditor harness={harness} projects={[head, lab]} project={project} />);

describe("memory workbench", () => {
  beforeEach(() => {
    memory.scope.mockClear();
    memory.isError = false;
    memory.data = {projectName: "Science Space", available: false, total: 0, rejected: 0, records: []};
  });
  it("uses the shared identity editor with memory-specific navigation", () => {
    const html = render();
    expect(html).toContain("agent-editor-portrait size-24");
    expect(html).toContain('aria-label="Memory detail tabs"');
    expect(html).toContain('aria-label="Records" aria-pressed="true"');
    expect(html).toContain('aria-label="Scope &amp; storage"');
    expect(html).not.toContain('aria-label="Settings"');
    expect(html).not.toContain("lead-list-scroll");
    expect(html).not.toContain("agent-role-description");
    expect(html).not.toContain("Saved records, not chat history");
    expect(html).toContain("No saved memories yet");
    expect(memory.scope).toHaveBeenCalledWith("science", undefined);
  });
  it("keeps the project selector and query isolated from central memory", () => {
    const html = render(lab);
    expect(html).toContain('aria-label="View Robot Lab memory"');
    expect(html).not.toContain('aria-label="View Science Space memory"');
    expect(html).toContain('style="color:#7dd3fc"');
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
    const html = render();
    expect(html).toContain("research finding");
    expect(html).toContain("provisional");
    expect(html).toContain("Updated 2026-09-11");
    expect(html).toContain("Evidence · 1 references");
    expect(html).toContain("doi:10.0000/example");
    expect(html).toContain("&lt;script&gt;unsafe()&lt;/script&gt;");
    expect(html).not.toContain("<script>");
    expect(html).toContain("2 malformed entries skipped");
  });
  it("reports read failures without pretending memory is empty", () => {
    memory.data = undefined;
    memory.isError = true;
    const html = render();
    expect(html).toContain("Could not read memory. No files were changed.");
    expect(html).not.toContain("No saved memories yet");
  });
  it("explains an unavailable project path without claiming the memory is empty", () => {
    memory.data = {projectName: "Robot Lab", available: false, unavailableReason: "workspace-missing", total: 0, rejected: 0, records: []};
    const html = render(lab);
    expect(html).toContain("Workspace folder unavailable");
    expect(html).toContain("Folder not found. Check the project path.");
    expect(html).not.toContain("No saved memories yet");
  });
});
