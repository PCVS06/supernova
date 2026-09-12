import {useState} from "react";
import type {HarnessConfig, HarnessProject} from "@supernova/contracts/harnesses/schemas";
import Button from "@/components/ui/button";
import Dialog from "@/components/ui/dialog";
import Icon from "@/components/ui/icon";
import Input from "@/components/ui/input";
import SettingsPageShell from "@/features/settings/components/settings-page-shell";
import {SettingsGroup, SettingsRow} from "@/features/settings/components/settings-group";
import AgentIdentityPicker from "@/features/harnesses/components/agent-identity-picker";
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
  /** Saves the document list right away; the plan is not part of the draft behind "Save changes". */
  onPersistPlanningDocuments: (documents: readonly string[]) => Promise<void>;
  onRemoveProject: () => Promise<void>;
}

/** Planning per project: the plan first, then how its chats are instructed, then where it lives. */
export default function ProjectConfigEditor(props: ProjectConfigEditorProps) {
  const {harness, project, projects, onChangeProject, onSelect, onOpenSpecialists, onPersistPlanningDocuments, onRemoveProject} = props;
  const [section, setSection] = useState<ProjectSection>("plan");
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState<string>();
  const coordinatorId = harness.coordinatorProjectId;
  const isHead = !!project && project.id === coordinatorId;
  const ordered = projects.toSorted((a, b) => Number(b.id === coordinatorId) - Number(a.id === coordinatorId) || (a.order ?? 0) - (b.order ?? 0));
  const color = project ? agentColor(project.id, project.color ?? (isHead ? "#ffffff" : undefined)) : "#ffffff";
  const parent = project?.parentProjectId ? projects.find((item) => item.id === project.parentProjectId) : undefined;
  const labs = project ? projects.filter((item) => item.parentProjectId === project.id).length : 0;
  const canOpenInFinder = window.desktopApi?.environment === "mac";

  const handleRemove = async (): Promise<void> => {
    setRemoving(true);
    setRemoveError(undefined);
    try {
      await onRemoveProject();
      setConfirmRemove(false);
    } catch (error) {
      setRemoveError(error instanceof Error ? error.message : String(error));
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="harness-agent-layout flex h-full min-h-0 overflow-hidden" data-testid="project-workspace">
      <ProjectConfigList coordinatorId={coordinatorId} projects={ordered} selectedId={project?.id} onSelect={onSelect} />
      <section className="flex min-h-0 min-w-0 flex-1 flex-col" data-testid="project-editor-detail">
        {!project && <p className="p-6 text-sm text-ink-muted">Select a project to plan its work.</p>}
        {project && (
          <>
            <div className="flex shrink-0 items-center justify-between gap-4 border-b border-border px-5 sm:px-6">
              <EditorTabs label="Project editor tabs" value={section} items={projectSections} onChange={setSection} />
              <p className={cn("hidden min-w-0 items-center gap-2 text-xs sm:flex", project.folderMissing ? "text-danger-ink" : "text-ink-faint")} title={project.path}>
                <Icon name={project.folderMissing ? "alert" : "folder"} size="xs" />
                <span className="truncate font-mono">{project.folderMissing ? `Folder missing · ${project.path}` : project.path}</span>
              </p>
            </div>
            {section === "plan" && (
              <PlanningDocumentsEditor
                disabled={project.folderMissing}
                documents={project.planningDocuments ?? []}
                projectPath={project.path}
                onChange={onPersistPlanningDocuments}
              />
            )}
            {section === "instructions" && (
              <SettingsPageShell testId="project-detail-scroll">
                <SettingsGroup title="Instructions">
                  <SettingsRow description={`Added to ${harness.name}'s shared instructions for this project's chats only.`} title="Project instructions">
                    <PromptEditor label="Project system instructions" value={project.systemPrompt} onChange={(systemPrompt) => onChangeProject({systemPrompt})} />
                  </SettingsRow>
                </SettingsGroup>
                <ProjectOverridesEditor harness={harness} overrides={project.agents} onChange={(agents) => onChangeProject({agents})} onOpenSpecialists={onOpenSpecialists} />
              </SettingsPageShell>
            )}
            {section === "setup" && (
              <SettingsPageShell testId="project-detail-scroll">
                <SettingsGroup title="Project">
                  <SettingsRow
                    control={<Input aria-label="Project display name" className="sm:w-64" value={project.name} onChange={(event) => onChangeProject({name: event.target.value})} />}
                    description="Shown in the sidebar, the chats and every mark of this project."
                    title="Display name"
                  />
                  <SettingsRow
                    control={
                      canOpenInFinder && !project.folderMissing ? (
                        <Button
                          className="rounded-lg border border-border px-3 py-2 text-xs text-ink-muted hover:text-ink"
                          onClick={() => void window.desktopApi?.openDirectory(project.path)}
                        >
                          Open in Finder
                        </Button>
                      ) : undefined
                    }
                    description={project.folderMissing ? "This folder no longer exists on the server." : "Set when the project was linked; it cannot be changed here."}
                    title="Folder on the server"
                  >
                    <p className={cn("break-all font-mono text-xs", project.folderMissing ? "text-danger-ink" : "text-ink-muted")}>{project.path}</p>
                  </SettingsRow>
                  <AgentIdentityPicker name={project.id} color={color} kind="lead" onChange={(next) => onChangeProject({color: next})} />
                  {parent && <SettingsRow description={agentLabel(parent.name)} title="Part of" />}
                </SettingsGroup>
                <SettingsGroup title="Remove">
                  <SettingsRow
                    control={
                      <Button className="rounded-lg border border-border px-3 py-2 text-xs text-danger-ink hover:bg-overlay-hover" onClick={() => setConfirmRemove(true)}>
                        Remove project
                      </Button>
                    }
                    description={`Unlinks it from ${harness.name}. The folder and its files stay on disk, and existing chats keep their settings.`}
                    title={`Remove ${agentLabel(project.name)}`}
                  >
                    {removeError && (
                      <p className="text-xs leading-relaxed text-danger-ink" role="alert">
                        {removeError}
                      </p>
                    )}
                  </SettingsRow>
                </SettingsGroup>
              </SettingsPageShell>
            )}
            <Dialog className="max-w-md" containerClassName="h-auto" open={confirmRemove} title={`Remove ${agentLabel(project.name)}?`} onOpenChange={setConfirmRemove}>
              <p className="text-sm leading-relaxed text-ink-muted">
                {labs > 0 ? `It coordinates ${labs === 1 ? "one lab" : `${labs} labs`}, which must be removed first. ` : ""}
                The folder <span className="font-mono text-xs text-ink">{project.path}</span> and its files stay on disk. Existing chats keep the settings they were started with.
              </p>
              <div className="flex justify-end gap-2 py-5">
                <Button className="rounded-lg border border-border px-3 py-2 text-xs text-ink-muted hover:text-ink" onClick={() => setConfirmRemove(false)}>
                  Keep it
                </Button>
                <Button
                  className="rounded-lg border border-border px-3 py-2 text-xs text-danger-ink hover:bg-overlay-hover"
                  disabled={removing}
                  onClick={() => void handleRemove()}
                >
                  {removing ? "Removing…" : "Remove project"}
                </Button>
              </div>
            </Dialog>
          </>
        )}
      </section>
    </div>
  );
}
