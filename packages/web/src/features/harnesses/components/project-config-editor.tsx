import {useState} from "react";
import type {HarnessConfig, HarnessProject} from "@supernova/contracts/harnesses/schemas";
import Button from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import Input from "@/components/ui/input";
import {SettingsGroup, SettingsRow} from "@/features/settings/components/settings-group";
import AgentWorkbench from "@/features/harnesses/components/agent-workbench";
import AgentIdentityPicker from "@/features/harnesses/components/agent-identity-picker";
import ConfigCard from "@/features/harnesses/components/config-card";
import ConfigChoice from "@/features/harnesses/components/config-choice";
import PlanningDocumentsEditor from "@/features/harnesses/components/planning-documents-editor";
import PromptEditor from "@/features/harnesses/components/prompt-editor";
import {agentColor, agentLabel} from "@/features/harnesses/lib/agent-identity";

interface ProjectConfigEditorProps {
  harness: HarnessConfig;
  project?: HarnessProject;
  projects: readonly HarnessProject[];
  onChangeProject: (change: Partial<HarnessProject>) => void;
  onSelect: (projectId: string) => void;
  onOpenSpecialists: () => void;
}

/** One project of a harness: its identity, its own instructions, its planning documents, its overrides. */
export default function ProjectConfigEditor(props: ProjectConfigEditorProps) {
  const {harness, project, projects, onChangeProject, onSelect, onOpenSpecialists} = props;
  const [overrideName, setOverrideName] = useState(harness.agents[0]?.name ?? "");
  const head = projects.find((item) => item.id === harness.coordinatorProjectId);
  const isHead = !!project && project.id === head?.id;
  const ordered = projects.toSorted((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const color = project ? agentColor(project.id, project.color ?? (isHead ? "#ffffff" : undefined)) : "#ffffff";
  const overrides = project?.agents ?? [];

  return (
    <AgentWorkbench
      kind="lead"
      identity={
        project
          ? {
              id: project.id,
              name: agentLabel(project.name),
              color,
              role: isHead ? "Coordinating project" : "Project",
              description: project.path,
            }
          : undefined
      }
      selection={{
        label: "Projects",
        value: project?.id ?? "",
        items: ordered.map((item) => ({
          id: item.id,
          name: agentLabel(item.name),
          color: item.color ?? (item.id === head?.id ? "#ffffff" : undefined),
          subtitle: item.path,
          searchText: item.path,
        })),
        onChange: onSelect,
      }}
    >
      {!project && <p className="px-3 text-sm text-ink-muted sm:px-4">Select a project to edit its instructions, planning documents and overrides.</p>}
      {project && (
        <>
          <SettingsGroup title="Project">
            <SettingsRow
              control={<Input aria-label="Project display name" className="sm:w-64" value={project.name} onChange={(event) => onChangeProject({name: event.target.value})} />}
              description="Shown in the sidebar, the chats and every agent mark of this project."
              title="Display name"
            />
            <SettingsRow description={project.path} title="Folder on the server" />
            <AgentIdentityPicker name={project.id} color={color} kind="lead" onChange={(next) => onChangeProject({color: next})} />
          </SettingsGroup>

          <SettingsGroup title="Instructions">
            <SettingsRow description={`Appended to ${harness.name}'s shared instructions. Other projects are unaffected.`} title="Project system instructions">
              <PromptEditor label="Project system instructions" value={project.systemPrompt} onChange={(systemPrompt) => onChangeProject({systemPrompt})} />
            </SettingsRow>
            <SettingsRow description="Loaded with the context rules of this harness, for this project's chats only." title="Project context instructions">
              <PromptEditor
                label="Project context instructions"
                size="sm"
                value={project.contextInstructions}
                onChange={(contextInstructions) => onChangeProject({contextInstructions})}
              />
            </SettingsRow>
          </SettingsGroup>

          <PlanningDocumentsEditor documents={project.planningDocuments ?? []} projectPath={project.path} onChange={(planningDocuments) => onChangeProject({planningDocuments})} />

          <SettingsGroup title="Specialist overrides">
            <SettingsRow
              control={
                <Button className="rounded-lg border border-border px-3 py-2 text-xs text-ink-muted hover:text-ink" onClick={onOpenSpecialists}>
                  Edit in Agents
                </Button>
              }
              description="Specialists inherit from the harness unless this project overrides them by name."
              title={`${overrides.length} overridden specialists`}
            >
              <div className="space-y-2">
                {overrides.map((agent) => (
                  <ConfigCard className="flex items-center gap-2" key={agent.name}>
                    <span className="min-w-0 flex-1 truncate font-mono text-xs text-ink-muted">{agent.name}</span>
                    <Button
                      aria-label={`Remove ${agent.name} override`}
                      className="grid size-7 shrink-0 place-items-center rounded-md hover:bg-overlay-hover"
                      onClick={() => onChangeProject({agents: overrides.filter((item) => item.name !== agent.name)})}
                    >
                      <Icon name="x" size="xs" />
                    </Button>
                  </ConfigCard>
                ))}
              </div>
            </SettingsRow>
            <SettingsRow description="Copies the harness definition into this project so you can change it here." title="Add an override">
              <div className="flex flex-wrap items-center gap-2">
                <ConfigChoice
                  className="sm:w-56"
                  label="Agent to override"
                  value={overrideName}
                  options={harness.agents.length ? harness.agents.map((agent) => ({value: agent.name, label: agentLabel(agent.name)})) : [{value: "", label: "No specialists yet"}]}
                  onChange={setOverrideName}
                />
                <Button
                  className="px-3 py-2 text-xs"
                  variant="filled"
                  disabled={!overrideName || overrides.some((agent) => agent.name === overrideName)}
                  onClick={() => {
                    const agent = harness.agents.find((item) => item.name === overrideName);
                    if (agent) onChangeProject({agents: [...overrides, agent]});
                  }}
                >
                  Override specialist
                </Button>
              </div>
            </SettingsRow>
          </SettingsGroup>
        </>
      )}
    </AgentWorkbench>
  );
}
