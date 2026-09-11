import type {HarnessConfig, HarnessProject} from "@supernova/contracts/harnesses/schemas";
import AgentMark from "@/features/harnesses/components/agent-mark";
import EditorTabs from "@/features/harnesses/components/editor-tabs";

/** Separate workspaces for the main orchestrator, project leads and specialists. */
export default function AgentRoleMap({
  harness,
  project,
  projects,
  specialists,
  onSelect,
}: {
  harness: HarnessConfig;
  project?: HarnessProject;
  projects: readonly HarnessProject[];
  specialists: boolean;
  onSelect: (projectId: string | undefined, section: string) => void;
}) {
  const head = projects.find((item) => item.id === harness.coordinatorProjectId);
  const labs = projects.filter((item) => item.id !== head?.id).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const lab = project?.id !== head?.id ? project : undefined;
  const active = specialists ? "specialists" : head && !lab ? "main" : "projects";
  const tabs = [
    ...(head
      ? [
          {
            id: "main",
            title: "Main orchestrator",
            name: head.id,
            color: head.color ?? "#ffffff",
            count: undefined,
            kind: "lead" as const,
            action: () => onSelect(head.id, "Overview"),
          },
        ]
      : []),
    {
      id: "projects",
      title: "Project leads",
      name: lab?.id ?? "project-leads",
      color: lab?.color,
      count: labs.length,
      kind: "lead" as const,
      action: () => onSelect(lab?.id ?? labs[0]?.id, "Overview"),
    },
    {
      id: "specialists",
      title: "Specialists",
      name: "specialist-roles",
      color: undefined,
      count: harness.agents.length,
      kind: "specialist" as const,
      action: () => onSelect(project?.id, "Team"),
    },
  ];
  return (
    <section className="shrink-0 border-b border-border px-6 pt-2">
      <EditorTabs
        label="Agent role tabs"
        value={active}
        items={tabs.map((tab) => ({
          value: tab.id,
          label: tab.title,
          count: tab.count,
          disabled: tab.id === "projects" && !!head && !labs.length,
          icon: <AgentMark name={tab.name} color={tab.color} kind={tab.kind} className="size-7" />,
        }))}
        onChange={(value) => tabs.find((tab) => tab.id === value)?.action()}
      />
    </section>
  );
}
