import {useState} from "react";
import type {HarnessConfig, HarnessProject} from "@supernova/contracts/harnesses/schemas";
import Button from "@/components/ui/button";
import {SettingsGroup, SettingsRow} from "@/features/settings/components/settings-group";
import AgentWorkbench from "@/features/harnesses/components/agent-workbench";
import AgentIdentityPicker from "@/features/harnesses/components/agent-identity-picker";
import AgentMark from "@/features/harnesses/components/agent-mark";
import PromptEditor from "@/features/harnesses/components/prompt-editor";
import ExecutionEditor from "@/features/harnesses/components/execution-editor";
import SkillsEditor from "@/features/harnesses/components/skills-editor";
import {agentColor, agentLabel} from "@/features/harnesses/lib/agent-identity";

interface LeadsEditorProps {
  harness: HarnessConfig;
  project?: HarnessProject;
  projects: readonly HarnessProject[];
  onChangeProject: (change: Partial<HarnessProject>) => void;
  onChangeHarness: (change: Partial<HarnessConfig>) => void;
  onSelect: (projectId: string) => void;
  onOpenSpecialists: () => void;
  initialSection?: "settings" | "prompt";
}

/** Role definitions, not live agents. Editing a lead stays within its project draft. */
export default function LeadsEditor(props: LeadsEditorProps) {
  const {harness, project, projects, onChangeProject, onChangeHarness, onSelect, onOpenSpecialists, initialSection = "settings"} = props;
  const [section, setSection] = useState<"settings" | "prompt" | "skills">(initialSection);
  const head = projects.find((item) => item.id === harness.coordinatorProjectId);
  const isHead = !!project && project.id === head?.id;
  const labs = projects.filter((item) => item.id !== head?.id).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const leads = isHead ? [] : labs;
  const name = project ? agentLabel(project.name) : "Project lead defaults";
  const color = project ? agentColor(project.id, project.color ?? (isHead ? "#ffffff" : undefined)) : "#ffffff";
  const agents = new Map(harness.agents.map((agent) => [agent.name, agent]));
  for (const agent of project?.agents ?? []) agents.set(agent.name, agent);
  const specialists = [...agents.values()];
  const rolePrompt = project ? (project.orchestratorPrompt ?? (isHead ? harness.orchestratorPrompt : "") ?? "") : (harness.orchestratorPrompt ?? "");

  return (
    <AgentWorkbench
      kind="lead"
      identity={{
        id: project?.id ?? harness.id,
        name,
        color,
        role: isHead ? "Cross-lab coordinator" : project ? "Project lead" : "Shared role defaults",
        description: isHead ? `${labs.length} labs` : "",
      }}
      selection={
        leads.length
          ? {
              label: "Project leads",
              value: project?.id ?? "",
              items: leads.map((item) => ({
                id: item.id,
                name: agentLabel(item.name),
                color: item.id === project?.id ? color : item.color,
                subtitle: item.execution?.model?.id ?? "Inherited model",
              })),
              onChange: onSelect,
            }
          : undefined
      }
      section={section}
      onSectionChange={setSection}
    >
      {section === "settings" && (
        <>
          <SettingsGroup title="Execution">
            <ExecutionEditor
              value={project ? project.execution : harness.execution}
              inherited={project ? harness.execution : undefined}
              inheritLabel="Use default model"
              onChange={(execution) => (project ? onChangeProject({execution}) : onChangeHarness({execution}))}
            />
          </SettingsGroup>
          {project && (
            <SettingsGroup title="Identity">
              <AgentIdentityPicker name={project.id} color={color} kind="lead" onChange={(next) => onChangeProject({color: next})} />
            </SettingsGroup>
          )}
          <SettingsGroup title="Responsibilities">
            <SettingsRow
              control={
                isHead
                  ? labs[0] && (
                      <Button className="rounded-lg border border-border px-3 py-2 text-xs text-ink-muted hover:text-ink" onClick={() => onSelect(labs[0]!.id)}>
                        Open project leads
                      </Button>
                    )
                  : head && (
                      <Button className="rounded-lg border border-border px-3 py-2 text-xs text-ink-muted hover:text-ink" onClick={() => onSelect(head.id)}>
                        Open {agentLabel(head.name)}
                      </Button>
                    )
              }
              description={
                isHead
                  ? `Coordinates ${labs.length} projects and keeps their chats separate.`
                  : head
                    ? `Reports to ${agentLabel(head.name)} and owns this project's work only.`
                    : "Owns this project's work."
              }
              title="Accountability"
            />
            <SettingsRow
              control={
                <Button className="rounded-lg border border-border px-3 py-2 text-xs text-ink-muted hover:text-ink" onClick={onOpenSpecialists}>
                  Configure specialists
                </Button>
              }
              description="Specialists are shared definitions this lead may delegate to."
              title={`${specialists.length} specialists`}
            >
              {!isHead && specialists.length > 0 && (
                <span className="flex shrink-0 -space-x-2">
                  {specialists.slice(0, 6).map((agent) => (
                    <AgentMark key={agent.name} name={agent.name} color={agent.color} className="size-8 rounded-full bg-surface-raised" />
                  ))}
                </span>
              )}
            </SettingsRow>
            {project && <SettingsRow description={project.path} title="Working folder" />}
          </SettingsGroup>
        </>
      )}
      {section === "prompt" && (
        <>
          <SettingsGroup title="Shared operating manual">
            {isHead || !project ? (
              <SettingsRow description="Every project of this harness inherits these instructions." title="Shared instructions · all projects">
                <PromptEditor label="Shared operating instructions" value={harness.systemPrompt} onChange={(systemPrompt) => onChangeHarness({systemPrompt})} />
              </SettingsRow>
            ) : (
              <SettingsRow
                control={
                  head && (
                    <Button className="rounded-lg border border-border px-3 py-2 text-xs text-ink-muted hover:text-ink" onClick={() => onSelect(head.id)}>
                      Edit in Main orchestrator
                    </Button>
                  )
                }
                description="Owned by the main orchestrator and inherited here."
                title="Shared operating manual · inherited"
              >
                <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap rounded-xl border border-border bg-surface-raised/70 p-4 font-mono text-xs leading-relaxed text-ink-muted">
                  {harness.systemPrompt || "No shared instructions."}
                </pre>
              </SettingsRow>
            )}
          </SettingsGroup>
          <SettingsGroup title="This role">
            {project && (
              <SettingsRow
                description={isHead ? "Used by central chats only." : "Used by this project's chats only."}
                title={isHead ? "Central brief · central chats only" : "Project brief · this project only"}
              >
                <PromptEditor label="Project instructions" value={project.systemPrompt} onChange={(systemPrompt) => onChangeProject({systemPrompt})} />
              </SettingsRow>
            )}
            <SettingsRow
              description="Only the main chat agent reads this. Specialists keep their own prompts."
              title={isHead ? "Coordination role · main orchestrator only" : "Lead role · main chat agent only"}
            >
              <PromptEditor
                label="Lead role prompt"
                value={rolePrompt}
                onChange={(value) => (project ? onChangeProject({orchestratorPrompt: value || undefined}) : onChangeHarness({orchestratorPrompt: value || undefined}))}
              />
            </SettingsRow>
          </SettingsGroup>
        </>
      )}
      {section === "skills" && (
        <SettingsGroup title={project ? "Project skill availability" : "Shared skill availability"}>
          <SkillsEditor
            harnessId={harness.id}
            value={project ? project.enabledSkills : harness.enabledSkills}
            inherited={project ? harness.enabledSkills : undefined}
            onChange={(enabledSkills) => (project ? onChangeProject({enabledSkills}) : onChangeHarness({enabledSkills}))}
          />
        </SettingsGroup>
      )}
    </AgentWorkbench>
  );
}
