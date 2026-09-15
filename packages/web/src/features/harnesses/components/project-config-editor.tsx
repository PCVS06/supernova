import {useState} from "react";
import type {HarnessConfig, HarnessProject} from "@supernova/contracts/harnesses/schemas";
import Button from "@/components/ui/button";
import Dialog from "@/components/ui/dialog";
import Icon from "@/components/ui/icon";
import Input from "@/components/ui/input";
import SettingsPageShell from "@/features/settings/components/settings-page-shell";
import {SettingsGroup, SettingsRow} from "@/features/settings/components/settings-group";
import AgentIdentityPicker from "@/features/harnesses/components/agent-identity-picker";
import AgentMemoryPanel from "@/features/harnesses/components/agent-memory-panel";
import EditorTabs from "@/features/harnesses/components/editor-tabs";
import InstructionHistory from "@/features/harnesses/components/instruction-history";
import LeadsEditor from "@/features/harnesses/components/leads-editor";
import PlanningDocumentsEditor from "@/features/harnesses/components/planning-documents-editor";
import ProjectConfigList from "@/features/harnesses/components/project-config-list";
import PromptEditor from "@/features/harnesses/components/prompt-editor";
import {agentColor, agentLabel} from "@/features/harnesses/lib/agent-identity";
import {mainOrchestratorAgent} from "@/features/harnesses/lib/harness-sections";
import {cn} from "@/lib/cn";

export type ProjectSection = "setup" | "lead" | "instructions" | "plan" | "memory";

const projectSections: readonly {value: ProjectSection; label: string}[] = [
  {value: "setup", label: "Setup"},
  {value: "lead", label: "Lead"},
  {value: "instructions", label: "Instructions"},
  {value: "plan", label: "Plan"},
  {value: "memory", label: "Memory"},
];

interface ProjectConfigEditorProps {
  harness: HarnessConfig;
  project?: HarnessProject;
  projects: readonly HarnessProject[];
  section: ProjectSection;
  onSectionChange: (section: ProjectSection) => void;
  onChangeProject: (change: Partial<HarnessProject>) => void;
  onSelect: (projectId: string) => void;
  /** Opens the Agents page, optionally on one agent. */
  onOpenAgents: (agent?: string) => void;
  /** Saves the document list right away; the plan is not part of the draft behind "Save changes". */
  onPersistPlanningDocuments: (documents: readonly string[]) => Promise<void>;
  onRemoveProject: () => Promise<void>;
}

/** One project: where it lives, who leads it, how its chats are instructed, its plan and what it remembers. */
export default function ProjectConfigEditor(props: ProjectConfigEditorProps) {
  const {harness, project, projects, section, onSectionChange, onChangeProject, onSelect, onOpenAgents, onPersistPlanningDocuments, onRemoveProject} = props;
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
  // The coordinating project has no lead of its own; its role is the main orchestrator of the harness.
  const sections = projectSections.filter((item) => item.value !== "lead" || !isHead);
  const current = sections.some((item) => item.value === section) ? section : "setup";

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
        {!project && <p className="p-6 text-sm text-ink-muted">Select a project to configure it.</p>}
        {project && (
          <>
            <div className="flex shrink-0 items-center justify-between gap-4 border-b border-border px-5 sm:px-6">
              <EditorTabs label="Project editor tabs" value={current} items={sections} onChange={onSectionChange} />
              {current === "plan" ? (
                <p className="hidden shrink-0 text-xs text-ink-faint sm:block">Plan changes save at once</p>
              ) : current === "memory" ? (
                <p className="hidden shrink-0 text-xs text-ink-faint sm:block">Read-only</p>
              ) : (
                <p className={cn("hidden min-w-0 items-center gap-2 text-xs sm:flex", project.folderMissing ? "text-danger-ink" : "text-ink-faint")} title={project.path}>
                  <Icon name={project.folderMissing ? "alert" : "folder"} size="xs" />
                  <span className="truncate font-mono">{project.folderMissing ? `Folder missing · ${project.path}` : project.path}</span>
                </p>
              )}
            </div>
            {current === "plan" && (
              <PlanningDocumentsEditor
                disabled={project.folderMissing}
                documents={project.planningDocuments ?? []}
                projectPath={project.path}
                onChange={onPersistPlanningDocuments}
              />
            )}
            {current === "lead" && <LeadsEditor harness={harness} project={project} onChangeProject={onChangeProject} onOpenSpecialists={() => onOpenAgents()} />}
            {current === "memory" && (
              <SettingsPageShell testId="project-detail-scroll">
                <AgentMemoryPanel
                  explanation={`Records the agents saved while working in ${agentLabel(project.name)}.`}
                  harnessId={harness.id}
                  projectId={project.id}
                  projects={[project]}
                />
              </SettingsPageShell>
            )}
            {current === "instructions" && (
              <SettingsPageShell testId="project-detail-scroll">
                <SettingsGroup title="Instructions">
                  <SettingsRow description={`Added to ${harness.name}'s shared instructions for this project's chats only.`} title="Project instructions">
                    <PromptEditor label="Project system instructions" value={project.systemPrompt} onChange={(systemPrompt) => onChangeProject({systemPrompt})} />
                  </SettingsRow>
                  <InstructionHistory target={{kind: "project", harnessId: harness.id, projectId: project.id}} onRestore={(systemPrompt) => onChangeProject({systemPrompt})} />
                </SettingsGroup>
                <SettingsGroup title="Context">
                  <SettingsRow description="Loaded into this project's chats before the conversation starts." title="Project context instructions">
                    <PromptEditor
                      label="Project context instructions"
                      size="sm"
                      value={project.contextInstructions}
                      onChange={(contextInstructions) => onChangeProject({contextInstructions})}
                    />
                  </SettingsRow>
                </SettingsGroup>
              </SettingsPageShell>
            )}
            {current === "setup" && (
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
                  {isHead && (
                    <SettingsRow
                      control={
                        <Button className="rounded-lg border border-border px-3 py-2 text-xs text-ink-muted hover:text-ink" onClick={() => onOpenAgents(mainOrchestratorAgent)}>
                          Open Main orchestrator
                        </Button>
                      }
                      description="This project coordinates the harness, so its role is the main orchestrator."
                      title="Coordination role"
                    />
                  )}
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
