import {useState} from "react";
import AgentWorkbench from "@/features/harnesses/components/agent-workbench";
import AgentIdentityPicker from "@/features/harnesses/components/agent-identity-picker";
import type {HarnessConfig, HarnessProject} from "@supernova/contracts/harnesses/schemas";
import Button from "@/components/ui/button";
import AgentMark from "@/features/harnesses/components/agent-mark";
import {ConfigField, PromptEditor} from "@/features/harnesses/components/config-fields";
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
          <ExecutionEditor
            value={project ? project.execution : harness.execution}
            inherited={project ? harness.execution : undefined}
            inheritLabel="Use default model"
            onChange={(execution) => (project ? onChangeProject({execution}) : onChangeHarness({execution}))}
          />
          {project && <AgentIdentityPicker name={project.id} color={color} kind="lead" onChange={(color) => onChangeProject({color})} />}
          <section aria-label="Lead responsibilities" className="rounded-xl border border-border bg-surface-raised p-4">
            <h3 className="text-xs uppercase tracking-wider text-ink-muted">Responsibilities</h3>
            {isHead ? (
              <>
                {labs[0] && (
                  <Button onClick={() => onSelect(labs[0]!.id)} className="mt-3 text-xs underline underline-offset-4">
                    Open project leads →
                  </Button>
                )}
              </>
            ) : (
              <p className="mt-2 text-sm leading-relaxed">
                {head ? (
                  <>
                    Reports to{" "}
                    <Button className="underline underline-offset-4" onClick={() => onSelect(head.id)}>
                      {agentLabel(head.name)}
                    </Button>
                  </>
                ) : (
                  "Project lead"
                )}
              </p>
            )}
            <Button onClick={onOpenSpecialists} className="mt-4 flex w-full items-center gap-3 border-t border-border pt-3 text-left">
              {!isHead && (
                <span className="flex shrink-0 -space-x-2">
                  {specialists.slice(0, 3).map((agent) => (
                    <AgentMark key={agent.name} name={agent.name} color={agent.color} className="size-8 rounded-full bg-surface-raised" />
                  ))}
                </span>
              )}
              <span className="flex-1 text-xs">
                <span className="block text-ink">{specialists.length} specialists</span>
              </span>
              <span aria-hidden="true" className="text-ink-muted">
                →
              </span>
            </Button>
          </section>
          {project && (
            <details className="border-t border-border pt-4 text-xs text-ink-muted">
              <summary className="cursor-pointer">Working folder</summary>
              <p className="mt-2 break-all font-mono">{project.path}</p>
            </details>
          )}
        </>
      )}
      {section === "prompt" && (
        <>
          {isHead || !project ? (
            <ConfigField label="Shared operating manual · all projects">
              <PromptEditor label="Shared operating instructions" value={harness.systemPrompt} onChange={(systemPrompt) => onChangeHarness({systemPrompt})} />
            </ConfigField>
          ) : (
            <details className="rounded-xl border border-border p-4">
              <summary className="cursor-pointer text-sm">Shared operating manual · inherited</summary>
              <pre className="mt-3 max-h-48 overflow-y-auto whitespace-pre-wrap text-xs text-ink-muted">{harness.systemPrompt || "No shared instructions."}</pre>
              {head && (
                <Button className="mt-3 text-xs underline" onClick={() => onSelect(head.id)}>
                  Edit in Main orchestrator → Instructions
                </Button>
              )}
            </details>
          )}
          {project && (
            <ConfigField label={isHead ? "Science Space brief · central chats only" : "Project brief · this project only"}>
              <PromptEditor label="Project instructions" value={project.systemPrompt} onChange={(systemPrompt) => onChangeProject({systemPrompt})} />
            </ConfigField>
          )}
          <ConfigField label={isHead ? "Coordination role · main orchestrator only" : "Lead role · main chat agent only"}>
            <PromptEditor
              label="Lead role prompt"
              value={rolePrompt}
              onChange={(value) => (project ? onChangeProject({orchestratorPrompt: value || undefined}) : onChangeHarness({orchestratorPrompt: value || undefined}))}
            />
          </ConfigField>
        </>
      )}
      {section === "skills" && (
        <>
          <div className="rounded-xl border border-border p-4">
            <h3 className="text-sm font-medium">{project ? "Project skill availability" : "Shared skill availability"}</h3>
          </div>
          <SkillsEditor
            harnessId={harness.id}
            value={project ? project.enabledSkills : harness.enabledSkills}
            inherited={project ? harness.enabledSkills : undefined}
            onChange={(enabledSkills) => (project ? onChangeProject({enabledSkills}) : onChangeHarness({enabledSkills}))}
          />
        </>
      )}
    </AgentWorkbench>
  );
}
