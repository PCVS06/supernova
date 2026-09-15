import type {ReactNode} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {beforeAll, describe, expect, it, vi} from "vitest";
import type {HarnessConfig, HarnessProject} from "@supernova/contracts/harnesses/schemas";
import AgentsEditor from "@/features/harnesses/components/agents-editor";
import CuratorEditor from "@/features/harnesses/components/curator-editor";
import InstructionsPage from "@/features/harnesses/components/instructions-page";
import OverviewPage from "@/features/harnesses/components/overview-page";
import ProjectConfigEditor from "@/features/harnesses/components/project-config-editor";
import type {ProjectSection} from "@/features/harnesses/components/project-config-editor";
import ResourcesEditor from "@/features/harnesses/components/resources-editor";
import WorkflowsEditor from "@/features/harnesses/components/workflows-editor";

vi.mock("@tanstack/react-router", () => ({Link: (props: {children: ReactNode}) => <a href="/inbox/science">{props.children}</a>}));
vi.mock("@/features/harnesses/components/execution-editor", () => ({default: () => <div aria-label="Model and effort" />}));
vi.mock("@/features/harnesses/components/skills-editor", () => ({default: () => <div aria-label="Skill switches" />}));
vi.mock("@/features/harnesses/components/instruction-history", () => ({default: () => <div>History</div>}));
vi.mock("@/features/harnesses/hooks/api/use-project-documents", () => ({
  useProjectDocument: () => ({data: undefined, isPending: false, isError: true, isFetching: false, refetch: vi.fn()}),
  useSaveProjectDocument: () => ({mutate: vi.fn(), reset: vi.fn(), isPending: false, isSuccess: false, error: undefined}),
}));
vi.mock("@/features/harnesses/hooks/api/use-harness-resources", () => ({
  useHarnessResources: () => ({data: {tools: [], extensions: [], warnings: []}, isPending: false, isError: false, refetch: vi.fn()}),
  useHarnessMemory: () => ({
    data: {projectName: "Robot Lab", available: false, total: 0, rejected: 0, records: []},
    isPending: false,
    isError: false,
    isFetching: false,
    refetch: vi.fn(),
  }),
  useToolCredentials: () => ({data: [], isPending: false, isError: false}),
  useSaveToolCredential: () => ({mutateAsync: vi.fn(), reset: vi.fn(), isPending: false}),
}));
vi.mock("@/features/harnesses/hooks/api/use-curation", () => ({
  useCuration: () => ({data: {proposals: [], reviews: [], requests: []}, isPending: false, isError: false, refetch: vi.fn()}),
  useRunCuratorReview: () => ({mutate: vi.fn(), reset: vi.fn(), isPending: false, error: undefined}),
}));

const harness: HarnessConfig = {
  id: "science",
  name: "Science Pi",
  description: "Research",
  systemPrompt: "Shared rules",
  orchestratorPrompt: "Coordinate labs",
  coordinatorProjectId: "head",
  execution: {model: {id: "shared-model", providerId: "test"}, effort: "medium"},
  curator: {enabled: true, maxCostUsdPerRun: 0.5, maxCostUsdPerDay: 2, autoApply: {memory: false, planningLog: false}},
  agents: [{name: "reviewer", description: "Review evidence", systemPrompt: "Review", tools: ["read"]}],
  extensions: [],
  skills: [],
  context: {instructions: "Cite evidence", files: ["docs/plan.md"], includeProjectInstructions: true, autoCompaction: true, reserveTokens: 1000, keepRecentTokens: 1000},
  graph: {steps: []},
  workflows: [],
  loop: {maxTurns: 10, timeoutSeconds: 60},
};
const head: HarnessProject = {id: "head", harnessId: "science", name: "Science Space", path: "/science", systemPrompt: "Central brief", contextInstructions: "", agents: []};
const lab: HarnessProject = {...head, id: "lab", name: "Robot Lab", path: "/robot", parentProjectId: "head", color: "#7dd3fc", planningDocuments: ["PLAN.md"]};

const project = (section: ProjectSection) =>
  renderToStaticMarkup(
    <ProjectConfigEditor
      harness={harness}
      project={lab}
      projects={[head, lab]}
      section={section}
      onSectionChange={vi.fn()}
      onChangeProject={vi.fn()}
      onSelect={vi.fn()}
      onOpenAgents={vi.fn()}
      onPersistPlanningDocuments={vi.fn(async () => undefined)}
      onRemoveProject={vi.fn(async () => undefined)}
    />
  );

const agents = (initialSection: "settings" | "prompt" | "skills") =>
  renderToStaticMarkup(
    <AgentsEditor
      harness={harness}
      coordinatorName="Science Space"
      initialSection={initialSection}
      selectedName="reviewer"
      onSelect={vi.fn()}
      onChange={vi.fn()}
      onOpenPage={vi.fn()}
    />
  );

/** Every configuration surface of one harness, rendered once. */
function surfaces(): Record<string, string> {
  return {
    overview: renderToStaticMarkup(<OverviewPage harness={harness} projects={[head, lab]} onChange={vi.fn()} />),
    instructions: renderToStaticMarkup(<InstructionsPage harness={harness} onChange={vi.fn()} />),
    "agents-main": renderToStaticMarkup(<AgentsEditor harness={harness} coordinatorName="Science Space" onSelect={vi.fn()} onChange={vi.fn()} onOpenPage={vi.fn()} />),
    "agents-settings": agents("settings"),
    "agents-prompt": agents("prompt"),
    "agents-skills": agents("skills"),
    skills: renderToStaticMarkup(<ResourcesEditor harness={harness} onChangeHarness={vi.fn()} onOpenProviders={vi.fn()} />),
    workflows: renderToStaticMarkup(<WorkflowsEditor harness={harness} onChange={vi.fn()} />),
    curator: renderToStaticMarkup(<CuratorEditor harness={harness} onChangeHarness={vi.fn()} />),
    "project-setup": project("setup"),
    "project-lead": project("lead"),
    "project-instructions": project("instructions"),
    "project-plan": project("plan"),
    "project-memory": project("memory"),
  };
}

/** One row of the field ownership map: the schema field, the surface that owns it, the label of its editor. */
const ownership: readonly {field: string; home: string; label: string}[] = [
  {field: "harness.name", home: "overview", label: "Harness name"},
  {field: "harness.description", home: "overview", label: "Harness description"},
  {field: "harness.execution", home: "overview", label: "Model and effort"},
  {field: "harness.loop.maxTurns", home: "overview", label: "Maximum turns"},
  {field: "harness.loop.timeoutSeconds", home: "overview", label: "Timeout in seconds"},
  {field: "harness.coordinatorProjectId", home: "overview", label: "Coordinating project"},
  {field: "harness.systemPrompt", home: "instructions", label: "Shared operating instructions"},
  {field: "harness.orchestratorPrompt", home: "instructions", label: "Coordination role prompt"},
  {field: "harness.context.instructions", home: "instructions", label: "Context instructions"},
  {field: "harness.context.includeProjectInstructions", home: "instructions", label: "Include project instructions"},
  {field: "harness.context.autoCompaction", home: "instructions", label: "Automatic compaction"},
  {field: "harness.context.files", home: "instructions", label: "Context files"},
  {field: "harness.context.reserveTokens", home: "instructions", label: "Reserved tokens"},
  {field: "harness.context.keepRecentTokens", home: "instructions", label: "Recent tokens to keep"},
  {field: "harness.agents[].name", home: "agents-settings", label: "Agent identifier"},
  {field: "harness.agents[].description", home: "agents-settings", label: "Agent role"},
  {field: "harness.agents[].tools", home: "agents-settings", label: "Allowed tools"},
  {field: "harness.agents[].execution", home: "agents-settings", label: "Model and effort"},
  {field: "harness.agents[].color", home: "agents-settings", label: "Agent color #ffffff"},
  {field: "harness.agents[].systemPrompt", home: "agents-prompt", label: "reviewer system prompt"},
  {field: "harness.agents[].skillNames", home: "agents-skills", label: "Skill switches"},
  {field: "harness.enabledSkills", home: "skills", label: "Skill switches"},
  {field: "harness.workflows", home: "workflows", label: "Workflow"},
  {field: "harness.curator.execution", home: "curator", label: "Model and effort"},
  {field: "harness.curator.enabled", home: "curator", label: "Curator"},
  {field: "harness.curator.maxCostUsdPerRun", home: "curator", label: "Per review in USD"},
  {field: "harness.curator.maxCostUsdPerDay", home: "curator", label: "Per day in USD"},
  {field: "harness.curator.autoApply.memory", home: "curator", label: "Memory hygiene"},
  {field: "harness.curator.autoApply.planningLog", home: "curator", label: "Plan log"},
  {field: "project.name", home: "project-setup", label: "Project display name"},
  {field: "project.color", home: "project-setup", label: "Lead color #ffffff"},
  {field: "project.orchestratorPrompt", home: "project-lead", label: "Lead role prompt"},
  {field: "project.execution", home: "project-lead", label: "Model and effort"},
  {field: "project.enabledSkills", home: "project-lead", label: "Skill switches"},
  {field: "project.agents", home: "project-lead", label: "Agent to override"},
  {field: "project.systemPrompt", home: "project-instructions", label: "Project system instructions"},
  {field: "project.contextInstructions", home: "project-instructions", label: "Project context instructions"},
  {field: "project.planningDocuments", home: "project-plan", label: "PLAN.md content"},
];

function occurrences(html: string, label: string): number {
  return html.split(`aria-label="${label}"`).length - 1;
}

describe("field ownership", () => {
  beforeAll(() => {
    vi.stubGlobal("window", {});
  });

  it("gives every field of the ownership map exactly one editor, on its own page", () => {
    const rendered = surfaces();
    const homes = new Map<string, string[]>();
    for (const row of ownership) homes.set(row.label, [...(homes.get(row.label) ?? []), row.home]);

    for (const [label, owners] of homes) {
      const found = Object.entries(rendered)
        .filter(([, html]) => occurrences(html, label) > 0)
        .map(([id]) => id);
      expect(found.toSorted(), label).toEqual(owners.toSorted());
      for (const owner of owners) expect(occurrences(rendered[owner]!, label), `${label} on ${owner}`).toBe(1);
    }
  });

  it("leaves no editor on the surfaces that only link to a field", () => {
    const rendered = surfaces();
    const main = (section: "settings" | "prompt" | "skills") =>
      renderToStaticMarkup(<AgentsEditor harness={harness} coordinatorName="Science Space" initialSection={section} onSelect={vi.fn()} onChange={vi.fn()} onOpenPage={vi.fn()} />);
    expect(main("settings")).toContain("Open Overview");
    expect(main("prompt")).toContain("Open Instructions");
    expect(main("skills")).toContain("Open Skills &amp; tools");
    expect(rendered["project-memory"]).toContain("Memory · read-only");
    // The former second homes of F3 are gone: no shared manual outside Instructions, no skills outside their pages.
    for (const id of ["project-setup", "project-lead", "project-instructions", "agents-main"]) {
      expect(occurrences(rendered[id]!, "Shared operating instructions"), id).toBe(0);
    }
    expect(occurrences(rendered["project-setup"]!, "Model and effort")).toBe(0);
  });
});
