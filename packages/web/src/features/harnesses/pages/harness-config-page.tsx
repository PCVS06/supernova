import {useState} from "react";
import {Link, useBlocker, useNavigate} from "@tanstack/react-router";
import type {HarnessConfig, HarnessLibrary, HarnessProject} from "@supernova/contracts/harnesses/schemas";
import SettingsShell from "@/features/settings/components/settings-shell";
import AgentRoleMap from "@/features/harnesses/components/agent-role-map";
import AgentsEditor from "@/features/harnesses/components/agents-editor";
import EditorTabs from "@/features/harnesses/components/editor-tabs";
import HarnessConfigHeader from "@/features/harnesses/components/harness-config-header";
import LeadsEditor from "@/features/harnesses/components/leads-editor";
import ProjectConfigEditor from "@/features/harnesses/components/project-config-editor";
import ResourcesEditor from "@/features/harnesses/components/resources-editor";
import RunLimitsEditor from "@/features/harnesses/components/run-limits-editor";
import WorkflowsEditor from "@/features/harnesses/components/workflows-editor";
import {useHarnessLibrary, useSaveHarness, useSaveHarnessProject} from "@/features/harnesses/hooks/api/use-harnesses";
import {agentLabel} from "@/features/harnesses/lib/agent-identity";
import type {HarnessSectionId} from "@/features/harnesses/lib/harness-sections";
import {harnessTabs, resolveHarnessSection} from "@/features/harnesses/lib/harness-sections";
import {saveWorkspaceDraft} from "@/features/harnesses/lib/save-workspace-draft";
import {useHarnessNavigationStore} from "@/features/harnesses/stores/harness-navigation-store";
import type {AppEnvironment} from "@/lib/app-environment";
import {useMountEffect} from "@/lib/use-mount-effect";
import "@/features/harnesses/components/harness-layout.css";

interface WorkspaceEditorProps {
  harness: HarnessConfig;
  library: HarnessLibrary;
  section: HarnessSectionId;
  project?: HarnessProject;
  agentName?: string;
}

/** Owns the draft of one scope: the harness, plus the project in scope. Every panel edits this draft, nothing else. */
function WorkspaceEditor(props: WorkspaceEditorProps) {
  const {harness, library, section, project, agentName} = props;
  const [draft, setDraft] = useState(harness);
  const [projectDraft, setProjectDraft] = useState(project);
  const [base, setBase] = useState({harness, project, revision: library.revision});
  const saveHarness = useSaveHarness();
  const saveProject = useSaveHarnessProject();
  const navigate = useNavigate();
  const selectProject = useHarnessNavigationStore((state) => state.selectProject);
  const tab = harnessTabs.find((item) => item.sections.some((candidate) => candidate.id === section))!;
  const sharedDirty = JSON.stringify(draft) !== JSON.stringify(base.harness);
  const dirty = JSON.stringify(projectDraft) !== JSON.stringify(base.project) || sharedDirty;
  const savePending = saveProject.isPending || saveHarness.isPending;
  const saveError = saveProject.error ?? saveHarness.error;
  const projects = library.projects.filter((item) => item.harnessId === harness.id);
  const head = projects.find((item) => item.id === harness.coordinatorProjectId);
  const isHead = !!project && project.id === head?.id;
  const effectiveAgents = new Map(draft.agents.map((agent) => [agent.name, agent]));
  for (const agent of projectDraft?.agents ?? []) effectiveAgents.set(agent.name, agent);
  const effectiveHarness = {
    ...draft,
    execution: {...draft.execution, ...projectDraft?.execution},
    enabledSkills: projectDraft?.enabledSkills ?? draft.enabledSkills,
    agents: [...effectiveAgents.values()],
  };

  // The harness navigation store follows the scope in the URL; this editor is keyed by it, so mount is the sync point.
  useMountEffect(() => selectProject(harness.id, project?.id));

  const reset = (): void => {
    setDraft(harness);
    setProjectDraft(project);
    setBase({harness, project, revision: library.revision});
  };

  const patchProject = (change: Partial<HarnessProject>): void => {
    if (projectDraft) setProjectDraft({...projectDraft, ...change});
  };

  const changeScope = (projectId?: string, nextSection?: HarnessSectionId, name?: string): void => {
    void navigate({
      to: "/settings/harness/$harnessId",
      params: {harnessId: harness.id},
      search: {projectId, section: nextSection ?? section, agentName: name},
    });
  };

  const handleSave = (): void => {
    saveHarness.reset();
    saveProject.reset();
    void saveWorkspaceDraft(
      base,
      {harness: draft, project: projectDraft, revision: base.revision},
      {harness: saveHarness.mutateAsync, project: saveProject.mutateAsync},
      setBase
    ).catch(() => {
      // Mutation errors render below. Successful owners remain saved; unsaved drafts are preserved.
    });
  };

  useBlocker({
    shouldBlockFn: ({current, next}) =>
      dirty &&
      (current.pathname !== next.pathname || (current.search as {projectId?: string}).projectId !== (next.search as {projectId?: string}).projectId) &&
      !window.confirm("Discard unsaved changes before switching workspace?"),
    enableBeforeUnload: dirty,
  });

  return (
    <>
      <HarnessConfigHeader
        dirty={dirty}
        harness={draft}
        isHead={isHead}
        project={projectDraft}
        savePending={savePending}
        sharedDirty={sharedDirty}
        onDiscard={reset}
        onSave={handleSave}
      />
      <div className="shrink-0 border-b border-border px-5 sm:px-6">
        <EditorTabs
          label="Harness configuration tabs"
          value={tab.id}
          items={harnessTabs.map((item) => ({value: item.id, label: item.label}))}
          onChange={(value) => {
            const target = harnessTabs.find((item) => item.id === value)!.sections[0]!.id;
            changeScope(target === "orchestrator" ? undefined : project?.id, target);
          }}
        />
      </div>
      {base.revision !== library.revision && !savePending && (
        <div role="status" className="shrink-0 border-b border-border bg-surface-sidebar px-5 py-2 text-xs text-ink-muted sm:px-6">
          Settings changed elsewhere. Your draft has been kept.{" "}
          <button
            className="cursor-pointer underline"
            type="button"
            onClick={() => {
              if (!dirty || window.confirm("Discard your draft and load current settings?")) reset();
            }}
          >
            Load current settings
          </button>
        </div>
      )}
      {saveError && (
        <p className="shrink-0 px-5 py-3 text-sm text-danger-ink sm:px-6" role="alert">
          {String(saveError)} Unsaved edits are still here.
        </p>
      )}
      {tab.id === "agents" && <AgentRoleMap harness={effectiveHarness} project={projectDraft} projects={projects} section={section} onSelect={changeScope} />}
      {(tab.id === "resources" || tab.id === "workflows") && (
        <div className="shrink-0 border-b border-border px-5 sm:px-6">
          <EditorTabs
            label={`${tab.label} sections`}
            value={section}
            items={tab.sections.map((item) => ({value: item.id, label: item.label}))}
            onChange={(value) => changeScope(project?.id, value)}
          />
        </div>
      )}

      {(section === "orchestrator" || section === "leads") && (
        <LeadsEditor
          key={section + (projectDraft?.id ?? "shared")}
          harness={draft}
          initialSection="settings"
          project={projectDraft}
          projects={projects}
          onChangeProject={patchProject}
          onChangeHarness={(change) => setDraft({...draft, ...change})}
          onSelect={(projectId) => changeScope(projectId, section)}
          onOpenSpecialists={() => changeScope(project?.id, "specialists")}
        />
      )}
      {section === "specialists" && (
        <AgentsEditor
          key={agentName ?? "specialists"}
          agents={effectiveHarness.agents}
          memoryProjectId={projectDraft?.id}
          projects={projects}
          selectedName={agentName}
          harness={effectiveHarness}
          inheritedAgents={projectDraft ? harness.agents : undefined}
          onChange={(agents) => {
            if (projectDraft) {
              patchProject({agents: agents.filter((agent) => JSON.stringify(agent) !== JSON.stringify(harness.agents.find((item) => item.name === agent.name)))});
              return;
            }
            const renamed = new Map(draft.agents.map((agent, index) => [agent.name, agents.length === draft.agents.length ? agents[index]!.name : agent.name]));
            const steps = draft.graph.steps.map((name) => renamed.get(name) ?? name).filter((name) => agents.some((agent) => agent.name === name));
            const workflows = draft.workflows?.map((workflow) => ({
              ...workflow,
              steps: workflow.steps.map((step) => ({...step, agent: renamed.get(step.agent) ?? step.agent})),
            }));
            setDraft({...draft, agents, graph: {steps}, workflows});
          }}
        />
      )}
      {tab.id === "resources" && <ResourcesEditor harness={draft} section={section} onChangeHarness={(change) => setDraft({...draft, ...change})} />}
      {section === "workflows" && <WorkflowsEditor harness={effectiveHarness} onChange={(change) => setDraft({...draft, ...change})} />}
      {section === "limits" && <RunLimitsEditor harness={draft} onChange={(change) => setDraft({...draft, ...change})} />}
      {section === "projects" && (
        <ProjectConfigEditor
          harness={draft}
          project={projectDraft}
          projects={projects}
          onChangeProject={patchProject}
          onSelect={(projectId) => changeScope(projectId, "projects")}
          onOpenSpecialists={() => changeScope(project?.id, "specialists")}
        />
      )}
    </>
  );
}

interface HarnessConfigPageProps {
  appEnvironment: AppEnvironment;
  harnessId: string;
  section?: string;
  projectId?: string;
  agentName?: string;
}

/** Harness configuration inside settings: one shell, one breadcrumb, one header, four tabs. */
export default function HarnessConfigPage(props: HarnessConfigPageProps) {
  const {appEnvironment, harnessId, section, projectId, agentName} = props;
  const library = useHarnessLibrary();
  const harness = library.data?.harnesses.find((item) => item.id === harnessId);
  const resolved = resolveHarnessSection(section);

  if (!library.data || !harness) {
    return (
      <SettingsShell activeSectionId="harnesses" appEnvironment={appEnvironment} breadcrumb={["Harnesses"]}>
        <p className="p-8 text-sm text-ink-muted">{library.isError ? "Could not load the harness." : "Loading harness…"}</p>
      </SettingsShell>
    );
  }

  const projects = library.data.projects.filter((item) => item.harnessId === harnessId).toSorted((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const labs = projects.filter((item) => item.id !== harness.coordinatorProjectId);
  const requested = projectId ? projects.find((item) => item.id === projectId) : undefined;
  // Workflows, limits and resources belong to the harness, so those panels never run inside a project scope.
  const harnessScoped = resolved.tab.id === "workflows" || resolved.tab.id === "resources";
  const defaultOwnerId =
    resolved.section.id === "orchestrator"
      ? harness.coordinatorProjectId
      : resolved.section.id === "leads"
        ? labs[0]?.id
        : resolved.section.id === "projects"
          ? projects[0]?.id
          : undefined;
  const project = harnessScoped ? undefined : (requested ?? projects.find((item) => item.id === defaultOwnerId));

  if (projectId && !requested) {
    return (
      <SettingsShell activeSectionId="harnesses" appEnvironment={appEnvironment} breadcrumb={["Harnesses", harness.name]}>
        <p className="p-8 text-sm text-danger-ink">This workspace is not part of this harness.</p>
      </SettingsShell>
    );
  }

  const breadcrumb = [
    <Link key="harnesses" params={{sectionId: "harnesses"}} to="/settings/$sectionId">
      Harnesses
    </Link>,
    <Link key="harness" params={{harnessId: harness.id}} to="/settings/harness/$harnessId">
      {harness.name}
    </Link>,
    ...(project ? [agentLabel(project.name)] : []),
    resolved.section.label,
  ];

  return (
    <SettingsShell activeSectionId="harnesses" appEnvironment={appEnvironment} breadcrumb={breadcrumb}>
      <div className="harness-workspace flex min-h-0 flex-1 flex-col overflow-hidden">
        <WorkspaceEditor
          key={harness.id + ":" + (project?.id ?? "shared")}
          agentName={agentName}
          harness={harness}
          library={library.data}
          project={project}
          section={resolved.section.id}
        />
      </div>
    </SettingsShell>
  );
}
