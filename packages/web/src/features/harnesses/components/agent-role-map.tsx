import type {HarnessConfig, HarnessProject} from "@supernova/contracts/harnesses/schemas";
import AgentMark from "@/features/harnesses/components/agent-mark";
import EditorTabs from "@/features/harnesses/components/editor-tabs";
import type {HarnessSectionId} from "@/features/harnesses/lib/harness-sections";

interface AgentRoleMapProps {
  harness: HarnessConfig;
  project?: HarnessProject;
  projects: readonly HarnessProject[];
  section: HarnessSectionId;
  onSelect: (projectId: string | undefined, section: HarnessSectionId) => void;
}

/** Sub-navigation of the Agents tab: the main orchestrator, the project leads, the specialists, the curator. */
export default function AgentRoleMap(props: AgentRoleMapProps) {
  const {harness, project, projects, section, onSelect} = props;
  const head = projects.find((item) => item.id === harness.coordinatorProjectId);
  const labs = projects.filter((item) => item.id !== head?.id).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const lab = project?.id !== head?.id ? project : undefined;
  const tabs = [
    ...(head
      ? [
          {
            value: "orchestrator" as HarnessSectionId,
            label: "Main orchestrator",
            icon: <AgentMark name={head.id} color={head.color ?? "#ffffff"} kind="lead" className="size-7" />,
            action: () => onSelect(head.id, "orchestrator"),
          },
        ]
      : []),
    {
      value: "leads" as HarnessSectionId,
      label: "Project leads",
      count: labs.length,
      disabled: !!head && !labs.length,
      icon: <AgentMark name={lab?.id ?? "project-leads"} color={lab?.color} kind="lead" className="size-7" />,
      action: () => onSelect(lab?.id ?? labs[0]?.id, "leads"),
    },
    {
      value: "specialists" as HarnessSectionId,
      label: "Specialists",
      count: harness.agents.length,
      icon: <AgentMark name="specialist-roles" className="size-7" />,
      action: () => onSelect(project?.id, "specialists"),
    },
    {
      value: "curator" as HarnessSectionId,
      label: "Curator",
      icon: <AgentMark name="curator" color="#a3a3a3" className="size-7" />,
      // The curator belongs to the harness, never to one project, so it drops the project scope.
      action: () => onSelect(undefined, "curator"),
    },
  ];

  return (
    <div className="shrink-0 border-b border-border px-5 pt-2 sm:px-6">
      <EditorTabs
        label="Agent role tabs"
        value={section}
        items={tabs.map((tab) => ({value: tab.value, label: tab.label, count: tab.count, disabled: tab.disabled, icon: tab.icon}))}
        onChange={(value) => tabs.find((tab) => tab.value === value)?.action()}
      />
    </div>
  );
}
