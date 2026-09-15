import {useState} from "react";
import {useBlocker, useNavigate} from "@tanstack/react-router";
import type {HarnessAgent, HarnessConfig, HarnessProject} from "@supernova/contracts/harnesses/schemas";
import Button from "@/components/ui/button";
import Dialog from "@/components/ui/dialog";
import SettingsShell from "@/features/settings/components/settings-shell";
import AgentsEditor from "@/features/harnesses/components/agents-editor";
import CuratorEditor from "@/features/harnesses/components/curator-editor";
import HarnessConfigHeader from "@/features/harnesses/components/harness-config-header";
import InstructionsPage from "@/features/harnesses/components/instructions-page";
import OverviewPage from "@/features/harnesses/components/overview-page";
import ProjectConfigEditor from "@/features/harnesses/components/project-config-editor";
import type {ProjectSection} from "@/features/harnesses/components/project-config-editor";
import ResourcesEditor from "@/features/harnesses/components/resources-editor";
import WorkflowsEditor from "@/features/harnesses/components/workflows-editor";
import {useHarnessLibrary, useRemoveHarnessProject, useSaveHarness, useSaveHarnessProject} from "@/features/harnesses/hooks/api/use-harnesses";
import {agentLabel} from "@/features/harnesses/lib/agent-identity";
import type {HarnessPageId, HarnessPageSearch} from "@/features/harnesses/lib/harness-sections";
import {resolveHarnessPage} from "@/features/harnesses/lib/harness-sections";
import {saveWorkspaceDraft} from "@/features/harnesses/lib/save-workspace-draft";
import {useHarnessNavigationStore} from "@/features/harnesses/stores/harness-navigation-store";
import {useMountEffect} from "@/lib/use-mount-effect";
import type {AppEnvironment} from "@/lib/app-environment";
import "@/features/harnesses/components/harness-layout.css";

interface SelectSettingsProjectProps {
  readonly harnessId: string;
  readonly projectId?: string;
}

/** Keeps persisted navigation aligned with the selected route, once per scope. */
function SelectSettingsProject({harnessId, projectId}: SelectSettingsProjectProps) {
  useMountEffect(() => {
    useHarnessNavigationStore.getState().selectProject(harnessId, projectId);
  });
  return null;
}

interface WorkspaceEditorProps {
  harness: HarnessConfig;
  projects: readonly HarnessProject[];
  revision: number;
  page: HarnessPageId;
  agent?: string;
  project?: string;
  workflow?: string;
}

/** Owns one draft for the harness and all its projects. Every page edits this draft; one bar saves it. */
function WorkspaceEditor(props: WorkspaceEditorProps) {
  const {harness, projects, revision, page, agent, project: projectId, workflow} = props;
  const [draft, setDraft] = useState({harness, projects});
  const [base, setBase] = useState({harness, projects, revision});
  const [projectSection, setProjectSection] = useState<ProjectSection>("setup");
  const [confirmReload, setConfirmReload] = useState(false);
  const saveHarness = useSaveHarness();
  const saveProject = useSaveHarnessProject();
  const removeProject = useRemoveHarnessProject();
  const navigate = useNavigate();
  const head = draft.projects.find((item) => item.id === draft.harness.coordinatorProjectId);
  const selectedProject = projectId ? draft.projects.find((item) => item.id === projectId) : (head ?? draft.projects[0]);
  const savePending = saveProject.isPending || saveHarness.isPending;
  const saveError = saveProject.error ?? saveHarness.error;
  const harnessDirty = JSON.stringify(draft.harness) !== JSON.stringify(base.harness);
  const changedProjects = draft.projects.filter((item) => JSON.stringify(item) !== JSON.stringify(base.projects.find((candidate) => candidate.id === item.id)));
  const dirty = harnessDirty || changedProjects.length > 0;
  const changed = [...(harnessDirty ? [draft.harness.name] : []), ...changedProjects.map((item) => agentLabel(item.name))].join(", ");
  // Plan documents take effect on click, so that surface never carries a Save bar.
  const immediate = page === "projects" && projectSection === "plan";

  const blocker = useBlocker({
    shouldBlockFn: ({next}) => dirty && !next.pathname.startsWith(`/settings/harness/${harness.id}/`),
    enableBeforeUnload: dirty,
    withResolver: true,
  });

  const goTo = (nextPage: HarnessPageId, search: HarnessPageSearch = {}): void => {
    void navigate({to: "/settings/harness/$harnessId/$page", params: {harnessId: harness.id, page: nextPage}, search});
  };

  const goToProviders = (): void => {
    void navigate({to: "/settings/$sectionId", params: {sectionId: "providers"}});
  };

  const reset = (): void => {
    setDraft({harness, projects});
    setBase({harness, projects, revision});
    setConfirmReload(false);
  };

  const patchHarness = (change: Partial<HarnessConfig>): void => {
    setDraft((current) => ({...current, harness: {...current.harness, ...change}}));
  };

  const patchProject = (change: Partial<HarnessProject>): void => {
    if (!selectedProject) return;
    const id = selectedProject.id;
    setDraft((current) => ({...current, projects: current.projects.map((item) => (item.id === id ? {...item, ...change} : item))}));
  };

  // Renaming a specialist follows through into the handoff list and every workflow step that names it.
  const patchAgents = (agents: readonly HarnessAgent[]): void => {
    const current = draft.harness.agents;
    const renamed = new Map(current.map((item, index) => [item.name, agents.length === current.length ? agents[index]!.name : item.name]));
    const steps = draft.harness.graph.steps.map((name) => renamed.get(name) ?? name).filter((name) => agents.some((item) => item.name === name));
    const workflows = draft.harness.workflows?.map((item) => ({...item, steps: item.steps.map((step) => ({...step, agent: renamed.get(step.agent) ?? step.agent}))}));
    patchHarness({agents, graph: {steps}, workflows});
  };

  // The plan is an inventory of files, not prompt text, so it saves as soon as it changes and the draft follows.
  const persistPlanningDocuments = async (planningDocuments: readonly string[]): Promise<void> => {
    const id = selectedProject?.id;
    const stored = base.projects.find((item) => item.id === id);
    if (!id || !stored) return;
    saveProject.reset();
    const next = await saveProject.mutateAsync({project: {...stored, planningDocuments}, expectedRevision: base.revision});
    const saved = next.projects.find((item) => item.id === id);
    setBase((current) => ({...current, projects: current.projects.map((item) => (item.id === id ? (saved ?? item) : item)), revision: next.revision}));
    setDraft((current) => ({
      ...current,
      projects: current.projects.map((item) => (item.id === id ? {...item, planningDocuments: saved?.planningDocuments ?? planningDocuments} : item)),
    }));
  };

  const handleRemoveProject = async (): Promise<void> => {
    const id = selectedProject?.id;
    if (!id) return;
    const next = await removeProject.mutateAsync({projectId: id, expectedRevision: base.revision});
    setBase((current) => ({...current, projects: current.projects.filter((item) => item.id !== id), revision: next.revision}));
    setDraft((current) => ({...current, projects: current.projects.filter((item) => item.id !== id)}));
    goTo("projects");
  };

  const handleSave = (): void => {
    saveHarness.reset();
    saveProject.reset();
    void saveWorkspaceDraft(base, {...draft, revision: base.revision}, {harness: saveHarness.mutateAsync, project: saveProject.mutateAsync}, setBase).catch(() => {
      // Mutation errors render below. Saved owners stay saved; unsaved drafts are preserved.
    });
  };

  return (
    <>
      <SelectSettingsProject key={`${harness.id}:${selectedProject?.id}`} harnessId={harness.id} projectId={selectedProject?.id} />
      <p className="shrink-0 border-b border-border-muted px-5 py-2 text-xs leading-relaxed text-ink-muted sm:px-6">
        {immediate
          ? "Plan-file selections save immediately. Saving a document updates the shared project file."
          : "These are defaults for new chats. Chats with a saved configuration keep it; open Context in a chat to inspect its source. Save applies pending edits across this harness and its projects."}
      </p>
      {base.revision !== revision && !savePending && (
        <div role="status" className="shrink-0 border-b border-border bg-surface-sidebar px-5 py-2 text-xs text-ink-muted sm:px-6">
          Settings changed elsewhere. Your draft has been kept.{" "}
          <button className="cursor-pointer underline" type="button" onClick={() => (dirty ? setConfirmReload(true) : reset())}>
            Load current settings
          </button>
        </div>
      )}
      {saveError && (
        <p className="shrink-0 px-5 py-3 text-sm text-danger-ink sm:px-6" role="alert">
          {String(saveError)} Unsaved edits are still here.
        </p>
      )}

      {page === "overview" && <OverviewPage harness={draft.harness} projects={draft.projects} onChange={patchHarness} />}
      {page === "instructions" && <InstructionsPage harness={draft.harness} onChange={patchHarness} />}
      {page === "agents" && (
        <AgentsEditor
          harness={draft.harness}
          coordinatorName={head ? agentLabel(head.name) : undefined}
          selectedName={agent}
          onSelect={(name) => goTo("agents", {agent: name})}
          onChange={patchAgents}
          onOpenPage={(target) => goTo(target)}
        />
      )}
      {page === "skills" && <ResourcesEditor harness={draft.harness} onChangeHarness={patchHarness} onOpenProviders={goToProviders} />}
      {page === "workflows" && <WorkflowsEditor harness={draft.harness} selected={workflow} onChange={patchHarness} onSelect={(id) => goTo("workflows", {workflow: id})} />}
      {page === "projects" && (
        <ProjectConfigEditor
          harness={draft.harness}
          project={selectedProject}
          projects={draft.projects}
          section={projectSection}
          onSectionChange={setProjectSection}
          onChangeProject={patchProject}
          onSelect={(id) => goTo("projects", {project: id})}
          onOpenAgents={(name) => goTo("agents", name ? {agent: name} : {})}
          onPersistPlanningDocuments={persistPlanningDocuments}
          onRemoveProject={handleRemoveProject}
        />
      )}
      {page === "curator" && <CuratorEditor harness={draft.harness} onChangeHarness={patchHarness} />}

      {!immediate && <HarnessConfigHeader changed={changed} dirty={dirty} savePending={savePending} onDiscard={reset} onSave={handleSave} />}

      <Dialog
        className="max-w-md"
        containerClassName="h-auto"
        open={blocker.status === "blocked"}
        title="Leave with unsaved changes?"
        onOpenChange={(open) => {
          if (!open) blocker.reset?.();
        }}
      >
        <p className="text-sm leading-relaxed text-ink-muted">Unsaved edits to {changed} are discarded when you leave this harness.</p>
        <div className="flex justify-end gap-2 py-5">
          <Button className="rounded-lg border border-border px-3 py-2 text-xs text-ink-muted hover:text-ink" onClick={() => blocker.reset?.()}>
            Keep editing
          </Button>
          <Button className="rounded-lg border border-border px-3 py-2 text-xs text-danger-ink hover:bg-overlay-hover" onClick={() => blocker.proceed?.()}>
            Discard changes
          </Button>
        </div>
      </Dialog>

      <Dialog className="max-w-md" containerClassName="h-auto" open={confirmReload} title="Load current settings?" onOpenChange={setConfirmReload}>
        <p className="text-sm leading-relaxed text-ink-muted">Your unsaved edits to {changed} are replaced by the settings on the server.</p>
        <div className="flex justify-end gap-2 py-5">
          <Button className="rounded-lg border border-border px-3 py-2 text-xs text-ink-muted hover:text-ink" onClick={() => setConfirmReload(false)}>
            Keep editing
          </Button>
          <Button className="rounded-lg border border-border px-3 py-2 text-xs text-danger-ink hover:bg-overlay-hover" onClick={reset}>
            Load current settings
          </Button>
        </div>
      </Dialog>
    </>
  );
}

interface HarnessConfigPageProps {
  appEnvironment: AppEnvironment;
  harnessId: string;
  page: string;
  agent?: string;
  project?: string;
  workflow?: string;
}

/** One harness page inside settings: the tree names it, the page header says where you are, one bar saves. */
export default function HarnessConfigPage(props: HarnessConfigPageProps) {
  const {appEnvironment, harnessId, page, agent, project, workflow} = props;
  const library = useHarnessLibrary();
  const harness = library.data?.harnesses.find((item) => item.id === harnessId);
  const resolved = resolveHarnessPage(page);

  if (!library.data || !harness) {
    return (
      <SettingsShell activeHarnessId={harnessId} activePage={resolved.id} activeSectionId="harnesses" appEnvironment={appEnvironment} title={resolved.label}>
        <p className="p-8 text-sm text-ink-muted">{library.isError ? "Could not load the harness." : "Loading harness…"}</p>
      </SettingsShell>
    );
  }

  const projects = library.data.projects.filter((item) => item.harnessId === harnessId).toSorted((a, b) => (a.order ?? 0) - (b.order ?? 0));

  return (
    <SettingsShell activeHarnessId={harness.id} activePage={resolved.id} activeSectionId="harnesses" appEnvironment={appEnvironment} owner={harness.name} title={resolved.label}>
      <div className="harness-workspace flex min-h-0 flex-1 flex-col overflow-hidden">
        <WorkspaceEditor
          key={harness.id}
          agent={agent}
          harness={harness}
          page={resolved.id}
          project={project}
          projects={projects}
          revision={library.data.revision}
          workflow={workflow}
        />
      </div>
    </SettingsShell>
  );
}
