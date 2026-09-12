import {useState} from "react";
import type {HarnessConfig, HarnessProject} from "@supernova/contracts/harnesses/schemas";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import SettingsPageShell from "@/features/settings/components/settings-page-shell";
import {SettingsGroup, SettingsRow} from "@/features/settings/components/settings-group";
import AgentIdentityPicker from "@/features/harnesses/components/agent-identity-picker";
import AgentMark from "@/features/harnesses/components/agent-mark";
import EditorTabs from "@/features/harnesses/components/editor-tabs";
import PlanningDocumentsEditor from "@/features/harnesses/components/planning-documents-editor";
import ProjectConfigList from "@/features/harnesses/components/project-config-list";
import ProjectOverridesEditor from "@/features/harnesses/components/project-overrides-editor";
import PromptEditor from "@/features/harnesses/components/prompt-editor";
import {agentColor, agentLabel} from "@/features/harnesses/lib/agent-identity";
import {cn} from "@/lib/cn";

type ProjectSection = "plan" | "instructions" | "setup";

const projectSections: readonly {value: ProjectSection; label: string}[] = [
  {value: "plan", label: "Plan"},
  {value: "instructions", label: "Instructions"},
  {value: "setup", label: "Setup"},
];

interface ProjectConfigEditorProps {
  harness: HarnessConfig;
  project?: HarnessProject;
  projects: readonly HarnessProject[];
  onChangeProject: (change: Partial<HarnessProject>) => void;
  onSelect: (projectId: string) => void;
  onOpenSpecialists: () => void;
}

/** Planning per project: what it is working towards, how its chats are instructed, where it lives. */
export default function ProjectConfigEditor(props: ProjectConfigEditorProps) {
  const {harness, project, projects, onChangeProject, onSelect, onOpenSpecialists} = props;
  const [section, setSection] = useState<ProjectSection>("plan");
  const coordinatorId = harness.coordinatorProjectId;
  const isHead = !!project && project.id === coordinatorId;
  const ordered = projects.toSorted((a, b) => Number(b.id === coordinatorId) - Number(a.id === coordinatorId) || (a.order ?? 0) - (b.order ?? 0));
  const color = project ? agentColor(project.id, project.color ?? (isHead ? "#ffffff" : undefined)) : "#ffffff";
  const documents = project?.planningDocuments ?? [];
  const parent = project?.parentProjectId ? projects.find((item) => item.id === project.parentProjectId) : undefined;
  const canOpenInFinder = window.desktopApi?.environment === "mac";

  return (
    <div className="harness-agent-layout flex h-full min-h-0 overflow-hidden" data-testid="project-workspace">
      <ProjectConfigList coordinatorId={coordinatorId} projects={ordered} selectedId={project?.id} onSelect={onSelect} />
      <section className="flex min-h-0 min-w-0 flex-1 flex-col" data-testid="project-editor-detail">
        {project && (
          <header className="shrink-0 border-b border-border px-5 pt-5 sm:px-6">
            <div className="mx-auto w-full max-w-4xl">
              <div className="flex items-start gap-3">
                <AgentMark name={project.id} color={color} kind="lead" className="size-11 shrink-0" />
                <div className="min-w-0 flex-1">
                  <h2 className="line-clamp-2 text-lg font-medium leading-snug" title={agentLabel(project.name)}>
                    {agentLabel(project.name)}
                  </h2>
                  <p className="mt-1 truncate font-mono text-xs text-ink-muted" title={project.path}>
                    {project.path}
                  </p>
                  <p className={cn("mt-1 text-xs leading-relaxed", project.folderMissing ? "text-danger-ink" : "text-ink-faint")}>
                    {project.folderMissing ? "Folder missing — chats cannot start until it is restored or the project is re-linked" : "Folder found"} · {documents.length} planning{" "}
                    {documents.length === 1 ? "document" : "documents"}
                  </p>
                </div>
              </div>
              <div className="mt-3">
                <EditorTabs label="Project editor tabs" value={section} items={projectSections} onChange={setSection} />
              </div>
            </div>
          </header>
        )}
        <SettingsPageShell testId="project-detail-scroll">
          {!project && <p className="px-3 text-sm text-ink-muted sm:px-4">Select a project to plan its work.</p>}
          {project && section === "plan" && (
            <PlanningDocumentsEditor
              disabled={project.folderMissing}
              documents={documents}
              projectPath={project.path}
              onChange={(planningDocuments) => onChangeProject({planningDocuments})}
            />
          )}
          {project && section === "instructions" && (
            <>
              <SettingsGroup title="Instructions">
                <SettingsRow description={`Added to ${harness.name}'s shared instructions for this project's chats only.`} title="Project instructions">
                  <PromptEditor label="Project system instructions" value={project.systemPrompt} onChange={(systemPrompt) => onChangeProject({systemPrompt})} />
                </SettingsRow>
              </SettingsGroup>
              <ProjectOverridesEditor harness={harness} overrides={project.agents} onChange={(agents) => onChangeProject({agents})} onOpenSpecialists={onOpenSpecialists} />
            </>
          )}
          {project && section === "setup" && (
            <SettingsGroup title="Setup">
              <SettingsRow
                control={<Input aria-label="Project display name" className="sm:w-64" value={project.name} onChange={(event) => onChangeProject({name: event.target.value})} />}
                description="Shown in the sidebar, the chats and every mark of this project."
                title="Display name"
              />
              <SettingsRow
                control={
                  canOpenInFinder && (
                    <Button
                      className="rounded-lg border border-border px-3 py-2 text-xs text-ink-muted hover:text-ink"
                      onClick={() => void window.desktopApi?.openDirectory(project.path)}
                    >
                      Open in Finder
                    </Button>
                  )
                }
                description={project.folderMissing ? "This folder no longer exists on the server." : "Set when the project was linked; it cannot be changed here."}
                title="Folder on the server"
              >
                <p className="break-all font-mono text-xs text-ink-muted">{project.path}</p>
              </SettingsRow>
              <AgentIdentityPicker name={project.id} color={color} kind="lead" onChange={(next) => onChangeProject({color: next})} />
              {parent && <SettingsRow description={agentLabel(parent.name)} title="Part of" />}
            </SettingsGroup>
          )}
        </SettingsPageShell>
      </section>
    </div>
  );
}
