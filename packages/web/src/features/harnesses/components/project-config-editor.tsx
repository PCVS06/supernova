import {useState} from "react";
import type {HarnessConfig, HarnessProject} from "@supernova/contracts/harnesses/schemas";
import Button from "@/components/ui/button";
import Dialog from "@/components/ui/dialog";
import Input from "@/components/ui/input";
import SettingsPageShell, {SettingsPageHeader, settingsColumnClass} from "@/features/settings/components/settings-page-shell";
import {SettingsGroup, SettingsLinkRow, SettingsNote, SettingsRow} from "@/features/settings/components/settings-group";
import AgentIdentityPicker from "@/features/harnesses/components/agent-identity-picker";
import AgentMark from "@/features/harnesses/components/agent-mark";
import AgentMemoryPanel from "@/features/harnesses/components/agent-memory-panel";
import ConfigChoice from "@/features/harnesses/components/config-choice";
import EditorTabs from "@/features/harnesses/components/editor-tabs";
import InstructionHistory from "@/features/harnesses/components/instruction-history";
import LeadsEditor from "@/features/harnesses/components/leads-editor";
import PlanningDocumentsEditor from "@/features/harnesses/components/planning-documents-editor";
import PromptEditor from "@/features/harnesses/components/prompt-editor";
import {agentColor, agentLabel} from "@/features/harnesses/lib/agent-identity";
import {resolveHarnessPage} from "@/features/harnesses/lib/harness-sections";
import {cn} from "@/lib/cn";

export type ProjectSection = "setup" | "lead" | "instructions" | "plan" | "memory";

const projectSections: readonly {value: ProjectSection; label: string}[] = [
  {value: "setup", label: "General"},
  {value: "instructions", label: "Instructions"},
  {value: "lead", label: "Lead"},
  {value: "plan", label: "Plan"},
  {value: "memory", label: "Memory"},
];

interface ProjectConfigEditorProps {
  harness: HarnessConfig;
  /** The project in the URL. Without one the page lists every project. */
  project?: HarnessProject;
  projects: readonly HarnessProject[];
  section: ProjectSection;
  onSectionChange: (section: ProjectSection) => void;
  onChangeProject: (change: Partial<HarnessProject>) => void;
  /** Opens one project; an empty string returns to the list. */
  onSelect: (projectId: string) => void;
  /** Opens the Agents page, where the specialists a lead may override are defined. */
  onOpenAgents: () => void;
  /** Saves the document list right away; the plan is not part of the draft behind "Save changes". */
  onPersistPlanningDocuments: (documents: readonly string[]) => Promise<void>;
  onRemoveProject: () => Promise<void>;
}

/** The projects of one harness: a list, and one page per project with its setup, instructions, lead, plan and memory. */
export default function ProjectConfigEditor(props: ProjectConfigEditorProps) {
  const {harness, project, projects, section, onSectionChange, onChangeProject, onSelect, onOpenAgents, onPersistPlanningDocuments, onRemoveProject} = props;
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState<string>();
  const page = resolveHarnessPage("projects");
  const coordinatorId = harness.coordinatorProjectId;
  const ordered = projects.toSorted((a, b) => Number(b.id === coordinatorId) - Number(a.id === coordinatorId) || (a.order ?? 0) - (b.order ?? 0));

  if (!project) {
    return (
      <SettingsPageShell description={page.description} testId="projects-index" title={page.label}>
        <SettingsGroup description="Add a project with the + beside the harness in the main sidebar." title={`${projects.length} projects`}>
          {ordered.map((item) => (
            <SettingsLinkRow
              description={item.folderMissing ? `Folder missing · ${item.path}` : item.path}
              key={item.id}
              label={`Open ${agentLabel(item.name)}`}
              leading={<AgentMark className="size-8" color={item.color} kind={item.id === coordinatorId ? "orchestrator" : "lead"} name={item.id} />}
              meta={item.id === coordinatorId ? "Coordinates" : undefined}
              title={agentLabel(item.name)}
              onClick={() => onSelect(item.id)}
            />
          ))}
          {!projects.length && <SettingsNote>No projects yet. Link a folder from the main sidebar to give this harness somewhere to work.</SettingsNote>}
        </SettingsGroup>
      </SettingsPageShell>
    );
  }

  const isHead = project.id === coordinatorId;
  const color = agentColor(project.id, project.color ?? (isHead ? "#ffffff" : undefined));
  const parent = project.parentProjectId ? projects.find((item) => item.id === project.parentProjectId) : undefined;
  const labs = projects.filter((item) => item.parentProjectId === project.id).length;
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
    <div className="flex min-h-0 flex-1 flex-col" data-testid="project-workspace">
      <div className={cn(settingsColumnClass, "shrink-0 pt-8")}>
        <SettingsPageHeader
          actions={
            projects.length > 1 && (
              <ConfigChoice
                className="w-52"
                label="Switch project"
                options={ordered.map((item) => ({value: item.id, label: agentLabel(item.name)}))}
                value={project.id}
                onChange={onSelect}
              />
            )
          }
          back={{label: page.label, onClick: () => onSelect("")}}
          description={project.folderMissing ? `Folder missing · ${project.path}` : project.path}
          leading={<AgentMark className="size-12" color={project.color} kind={isHead ? "orchestrator" : "lead"} name={project.id} />}
          tabs={<EditorTabs label="Project editor tabs" value={section} items={projectSections} onChange={onSectionChange} />}
          title={agentLabel(project.name)}
        />
      </div>

      {section === "plan" && (
        <>
          <p className={cn(settingsColumnClass, "shrink-0 py-2 text-xs text-ink-faint")}>Plan changes save at once</p>
          <div className="flex min-h-0 flex-1 border-t border-border">
            <PlanningDocumentsEditor
              disabled={project.folderMissing}
              documents={project.planningDocuments ?? []}
              projectPath={project.path}
              onChange={onPersistPlanningDocuments}
            />
          </div>
        </>
      )}
      {section === "lead" && <LeadsEditor harness={harness} isHead={isHead} project={project} onChangeProject={onChangeProject} onOpenSpecialists={onOpenAgents} />}
      {section === "memory" && (
        <SettingsPageShell testId="project-detail-scroll">
          <AgentMemoryPanel
            explanation={`Records the agents saved while working in ${agentLabel(project.name)}.`}
            harnessId={harness.id}
            projectId={project.id}
            projects={[project]}
          />
        </SettingsPageShell>
      )}
      {section === "instructions" && (
        <SettingsPageShell testId="project-detail-scroll">
          <SettingsGroup description={`Added to ${harness.name}'s shared instructions, for this project's chats only.`} title="Project instructions">
            <div className="p-3">
              <PromptEditor label="Project system instructions" size="lg" value={project.systemPrompt} onChange={(systemPrompt) => onChangeProject({systemPrompt})} />
            </div>
            <InstructionHistory target={{kind: "project", harnessId: harness.id, projectId: project.id}} onRestore={(systemPrompt) => onChangeProject({systemPrompt})} />
          </SettingsGroup>
          <SettingsGroup description="Added after the harness's context rules, before the conversation starts." title="Context rules">
            <div className="p-3">
              <PromptEditor
                label="Project context instructions"
                size="sm"
                value={project.contextInstructions}
                onChange={(contextInstructions) => onChangeProject({contextInstructions})}
              />
            </div>
          </SettingsGroup>
        </SettingsPageShell>
      )}
      {section === "setup" && (
        <SettingsPageShell testId="project-detail-scroll">
          <SettingsGroup title="Project">
            <SettingsRow
              control={<Input aria-label="Project display name" className="@xl:w-64" value={project.name} onChange={(event) => onChangeProject({name: event.target.value})} />}
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
              title="Folder"
            >
              <p className={cn("break-all font-mono text-xs", project.folderMissing ? "text-danger-ink" : "text-ink-muted")}>{project.path}</p>
            </SettingsRow>
            {parent && <SettingsRow description={`Coordinated by ${agentLabel(parent.name)}.`} title="Part of" />}
            {isHead && (
              <SettingsRow
                control={
                  <Button className="rounded-lg border border-border px-3 py-2 text-xs text-ink-muted hover:text-ink" onClick={() => onSectionChange("lead")}>
                    Open Lead tab
                  </Button>
                }
                description="This project coordinates the harness, so its lead is the main orchestrator. Its role, model and skills are on the Lead tab."
                title="Coordination role"
              />
            )}
          </SettingsGroup>
          <SettingsGroup title="Identity">
            <AgentIdentityPicker name={project.id} color={color} kind="lead" onChange={(next) => onChangeProject({color: next})} />
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
          <Button className="rounded-lg border border-border px-3 py-2 text-xs text-danger-ink hover:bg-overlay-hover" disabled={removing} onClick={() => void handleRemove()}>
            {removing ? "Removing…" : "Remove project"}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
