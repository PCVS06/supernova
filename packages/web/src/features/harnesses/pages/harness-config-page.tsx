import {useEffect, useState} from "react";
import {Link, useBlocker, useNavigate} from "@tanstack/react-router";
import type {HarnessConfig, HarnessLibrary, HarnessProject} from "@supernova/contracts/harnesses/schemas";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Switch from "@/components/ui/switch";
import PiOrb from "@/components/brand/pi-orb";
import {ConfigField, PromptEditor} from "@/features/harnesses/components/config-fields";
import AgentsEditor from "@/features/harnesses/components/agents-editor";
import LeadsEditor from "@/features/harnesses/components/leads-editor";
import GraphEditor from "@/features/harnesses/components/graph-editor";
import ExecutionEditor from "@/features/harnesses/components/execution-editor";
import ResourcesEditor from "@/features/harnesses/components/resources-editor";
import MemoryEditor from "@/features/harnesses/components/memory-editor";
import EditorTabs from "@/features/harnesses/components/editor-tabs";
import WorkspaceChats from "@/features/harnesses/components/workspace-chats";
import AgentRoleMap from "@/features/harnesses/components/agent-role-map";
import {useHarnessLibrary, useSaveHarness, useSaveHarnessProject} from "@/features/harnesses/hooks/api/use-harnesses";
import {agentColor, agentColors, agentLabel} from "@/features/harnesses/lib/agent-identity";
import {saveWorkspaceDraft} from "@/features/harnesses/lib/save-workspace-draft";
import {useHarnessNavigationStore} from "@/features/harnesses/stores/harness-navigation-store";
import {cn} from "@/lib/cn";
import "@/features/harnesses/components/harness-layout.css";

const sections = ["Chats", "Overview", "Team", "Prompts", "Skills", "Memory", "Graph", "Context", "Workflow", "Run limits"] as const;
const tabs = [
  {label: "Agents", section: "Overview"},
  {label: "Resources", section: "Skills"},
  {label: "Memory", section: "Memory"},
  {label: "Graph / Workflows", section: "Graph"},
] as const;
type Section = (typeof sections)[number];

function WorkspaceEditor(props: {harness: HarnessConfig; library: HarnessLibrary; section: Section; project?: HarnessProject; agentName?: string}) {
  const {harness, library, section, project, agentName} = props;
  const [draft, setDraft] = useState(harness);
  const [projectDraft, setProjectDraft] = useState(project);
  const [base, setBase] = useState({harness, project, revision: library.revision});
  const saveHarness = useSaveHarness();
  const saveProject = useSaveHarnessProject();
  const navigate = useNavigate();
  const selectProject = useHarnessNavigationStore((state) => state.selectProject);
  useEffect(() => {
    selectProject(harness.id, project?.id);
  }, [harness.id, project?.id, selectProject]);
  const sharedDirty = JSON.stringify(draft) !== JSON.stringify(base.harness);
  const dirty = JSON.stringify(projectDraft) !== JSON.stringify(base.project) || sharedDirty;
  const savePending = saveProject.isPending || saveHarness.isPending;
  const saveError = saveProject.error ?? saveHarness.error;
  const projects = library.projects.filter((item) => item.harnessId === harness.id);
  const head = projects.find((item) => item.id === harness.coordinatorProjectId);
  const isHead = !!project && project.id === head?.id;
  const activeTab = section === "Team" || section === "Prompts" ? "Overview" : ["Workflow", "Run limits"].includes(section) ? "Graph" : section === "Context" ? "Memory" : section;
  const effectiveAgents = new Map(draft.agents.map((agent) => [agent.name, agent]));
  for (const agent of projectDraft?.agents ?? []) effectiveAgents.set(agent.name, agent);
  const effectiveHarness = {
    ...draft,
    execution: {...draft.execution, ...projectDraft?.execution},
    enabledSkills: projectDraft?.enabledSkills ?? draft.enabledSkills,
    agents: [...effectiveAgents.values()],
  };
  const patchProject = (change: Partial<HarnessProject>) => {
    if (projectDraft) setProjectDraft({...projectDraft, ...change});
  };
  const changeScope = (projectId?: string, nextSection?: string, name?: string) => {
    void navigate({to: "/harness/$harnessId", params: {harnessId: harness.id}, search: {projectId, section: nextSection ?? section, agentName: name}});
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
      <header className="relative z-20 flex min-h-20 shrink-0 flex-wrap items-center justify-between gap-4 border-b border-border px-6 py-4 [-webkit-app-region:drag]">
        <div className="flex min-w-0 items-center gap-3">
          <PiOrb className="size-12" state="still" color={project ? (project.color ?? (isHead ? "#ffffff" : agentColor(project.id))) : undefined} />
          <div className="[-webkit-app-region:no-drag]">
            <Link className="text-xs text-ink-muted" to={project ? "/harness/$harnessId" : "/harnesses"} params={{harnessId: harness.id}} search={{section: "Chats"}}>
              {project ? `${harness.name} /` : "Harnesses /"}
            </Link>
            <h1 className="mt-1 text-lg font-medium">{project ? agentLabel(project.name) : head ? "Science Space" : harness.name}</h1>
          </div>
        </div>
        <div className="flex items-center gap-3 [-webkit-app-region:no-drag]">
          {dirty && (
            <Button
              className="text-xs text-ink-muted"
              onClick={() => {
                setDraft(harness);
                setProjectDraft(project);
                setBase({harness, project, revision: library.revision});
              }}
            >
              Discard
            </Button>
          )}
          {section !== "Chats" && (
            <Button
              variant="filled"
              className="px-3 py-2 text-xs"
              disabled={!dirty || savePending}
              onClick={() => {
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
              }}
            >
              {savePending ? "Saving…" : "Save changes"}
            </Button>
          )}
        </div>
      </header>
      <nav aria-label="Harness configuration tabs" className="flex shrink-0 flex-wrap gap-1 border-b border-border px-4 py-2">
        {tabs.map((item) => (
          <Button
            key={item.label}
            aria-current={activeTab === item.section ? "page" : undefined}
            className={cn(
              "whitespace-nowrap rounded-md px-3 py-2 text-sm text-ink-muted outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ink-faint",
              activeTab === item.section ? "bg-surface-control text-ink" : "hover:bg-overlay-hover"
            )}
            onClick={() => changeScope(project?.id, item.section)}
          >
            {item.label}
          </Button>
        ))}
      </nav>
      {dirty && section !== "Chats" && (
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-surface-sidebar px-6 py-2 text-xs text-ink-muted">
          <span>Unsaved changes{sharedDirty ? " · harness-wide" : ""}</span>
          <span>New chats only</span>
        </div>
      )}
      {base.revision !== library.revision && !savePending && (
        <div role="status" className="px-6 py-2 text-xs text-ink-muted">
          Settings changed elsewhere. Your draft has been kept.{" "}
          <Button
            className="underline"
            onClick={() => {
              if (!dirty || window.confirm("Discard your draft and load current settings?")) {
                setDraft(harness);
                setProjectDraft(project);
                setBase({harness, project, revision: library.revision});
              }
            }}
          >
            Load current settings
          </Button>
        </div>
      )}
      {activeTab === "Overview" && <AgentRoleMap harness={effectiveHarness} project={project} projects={projects} specialists={section === "Team"} onSelect={changeScope} />}
      {activeTab === "Graph" && (
        <div className="shrink-0 border-b border-border px-6">
          <EditorTabs
            label="Graph and workflow sections"
            value={section}
            onChange={(value) => changeScope(project?.id, value)}
            items={[
              {label: "Overview", value: "Graph"},
              {label: "Existing handoffs", value: "Workflow"},
              {label: "Run limits", value: "Run limits"},
            ]}
          />
        </div>
      )}
      {section === "Context" && (
        <div className="flex shrink-0 justify-end border-b border-border px-6 py-2">
          <Button className="text-xs text-ink-muted underline underline-offset-4" onClick={() => changeScope(project?.id, "Memory")}>
            Back to saved memory
          </Button>
        </div>
      )}
      {saveError && (
        <p className="shrink-0 px-6 py-3 text-sm text-danger-ink" role="alert">
          {String(saveError)} Unsaved edits are still here.
        </p>
      )}
      {section === "Team" ? (
        <div className="min-h-0 flex-1 overflow-hidden">
          <AgentsEditor
            key={agentName ?? "team"}
            agents={effectiveHarness.agents}
            selectedName={agentName}
            harness={effectiveHarness}
            inheritedAgents={project ? harness.agents : undefined}
            onChange={(agents) => {
              if (projectDraft) patchProject({agents: agents.filter((agent) => JSON.stringify(agent) !== JSON.stringify(harness.agents.find((item) => item.name === agent.name)))});
              else {
                const renamed = new Map(draft.agents.map((agent, index) => [agent.name, agents.length === draft.agents.length ? agents[index]!.name : agent.name]));
                const steps = draft.graph.steps.map((name) => renamed.get(name) ?? name).filter((name) => agents.some((agent) => agent.name === name));
                setDraft({...draft, agents, graph: {steps}});
              }
            }}
          />
        </div>
      ) : section === "Overview" || section === "Prompts" ? (
        <div className="min-h-0 flex-1 overflow-hidden">
          <LeadsEditor
            key={section}
            initialSection={section === "Prompts" ? "prompt" : "settings"}
            harness={draft}
            project={projectDraft}
            projects={projects}
            onChangeProject={patchProject}
            onChangeHarness={(change) => setDraft({...draft, ...change})}
            onSelect={(projectId) => changeScope(projectId, "Overview")}
            onOpenSpecialists={() => changeScope(project?.id, "Team")}
          />
        </div>
      ) : section === "Skills" ? (
        <ResourcesEditor
          harness={draft}
          project={projectDraft}
          onChange={(enabledSkills) => (projectDraft ? patchProject({enabledSkills}) : setDraft({...draft, enabledSkills}))}
        />
      ) : section === "Memory" ? (
        <MemoryEditor harness={draft} project={projectDraft} projects={projects} onOpenContext={(projectId) => changeScope(projectId, "Context")} />
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-6" data-testid="settings-content-scroll">
          <div className="mx-auto max-w-4xl space-y-6">
            {section === "Chats" && <WorkspaceChats harness={harness} project={project} projects={projects} />}
            {section === "Graph" && (
              <div className="rounded-xl border border-border p-6">
                <p className="text-xs uppercase tracking-wider text-ink-muted">On hold</p>
                <h2 className="mt-2 text-lg font-medium">Graph / Workflows</h2>
              </div>
            )}
            {section === "Context" && (
              <>
                {!project && (
                  <details className="rounded-lg border border-border p-4">
                    <summary className="cursor-pointer text-sm">Default model for new projects</summary>
                    <div className="mt-4">
                      <ExecutionEditor value={draft.execution} inheritLabel="Choose in chat" onChange={(execution) => setDraft({...draft, execution})} />
                    </div>
                  </details>
                )}
                <details className="rounded-lg border border-border p-4">
                  <summary className="cursor-pointer text-sm">Workspace appearance · name & color</summary>
                  <div className="mt-4 space-y-4">
                    <ConfigField label={project ? "Project display name" : "Harness name"}>
                      <Input
                        value={projectDraft?.name ?? draft.name}
                        onChange={(event) => (projectDraft ? patchProject({name: event.target.value}) : setDraft({...draft, name: event.target.value}))}
                      />
                    </ConfigField>
                    {projectDraft && (
                      <ConfigField label="Project color">
                        <div className="flex flex-wrap gap-2">
                          {agentColors.map((color) => (
                            <button
                              key={color}
                              aria-label={`Project color ${color}`}
                              aria-pressed={(projectDraft.color ?? agentColor(projectDraft.id)) === color}
                              className="size-6 rounded-full border-2 border-transparent aria-pressed:border-white"
                              style={{backgroundColor: color}}
                              onClick={() => patchProject({color})}
                            />
                          ))}
                        </div>
                      </ConfigField>
                    )}
                    {!project && (
                      <ConfigField label="Description">
                        <Input value={draft.description} onChange={(event) => setDraft({...draft, description: event.target.value})} />
                      </ConfigField>
                    )}
                  </div>
                </details>
                <ConfigField label={project ? "Additional project context" : "Shared context instructions"}>
                  <PromptEditor
                    compact
                    label="Context instructions"
                    value={projectDraft?.contextInstructions ?? draft.context.instructions}
                    onChange={(instructions) =>
                      projectDraft ? patchProject({contextInstructions: instructions}) : setDraft({...draft, context: {...draft.context, instructions}})
                    }
                  />
                </ConfigField>
                {project && (
                  <p className="text-sm text-ink-muted">
                    <Button className="underline" onClick={() => changeScope(undefined, "Context")}>
                      Open shared context settings
                    </Button>
                  </p>
                )}
                {!project && (
                  <>
                    <ConfigField label="Context files" description="Paths relative to each project. Loaded at chat startup.">
                      <PromptEditor
                        compact
                        label="Context files"
                        value={draft.context.files.join("\n")}
                        onChange={(value) =>
                          setDraft({
                            ...draft,
                            context: {
                              ...draft.context,
                              files: value
                                .split("\n")
                                .map((file) => file.trim())
                                .filter(Boolean),
                            },
                          })
                        }
                      />
                    </ConfigField>
                    <ConfigField label="Include project AGENTS.md">
                      <Switch
                        aria-label="Include project instructions"
                        checked={draft.context.includeProjectInstructions}
                        onCheckedChange={(includeProjectInstructions) => setDraft({...draft, context: {...draft.context, includeProjectInstructions}})}
                      />
                    </ConfigField>
                    <ConfigField label="Automatic compaction">
                      <Switch
                        aria-label="Automatic compaction"
                        checked={draft.context.autoCompaction}
                        onCheckedChange={(autoCompaction) => setDraft({...draft, context: {...draft.context, autoCompaction}})}
                      />
                    </ConfigField>
                    <details className="rounded-lg border border-border p-4">
                      <summary className="cursor-pointer text-sm">Context budget</summary>
                      <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        <ConfigField label="Reserved tokens">
                          <Input
                            type="number"
                            min={1024}
                            max={100000}
                            value={draft.context.reserveTokens}
                            onChange={(event) => setDraft({...draft, context: {...draft.context, reserveTokens: Number(event.target.value)}})}
                          />
                        </ConfigField>
                        <ConfigField label="Recent tokens to keep">
                          <Input
                            type="number"
                            min={1024}
                            max={100000}
                            value={draft.context.keepRecentTokens}
                            onChange={(event) => setDraft({...draft, context: {...draft.context, keepRecentTokens: Number(event.target.value)}})}
                          />
                        </ConfigField>
                      </div>
                    </details>
                  </>
                )}
              </>
            )}
            {section === "Workflow" && (
              <>
                {project && (
                  <p className="text-sm text-ink-muted">
                    Shared by all projects.{" "}
                    <Button className="underline" onClick={() => changeScope(undefined, "Workflow")}>
                      Edit shared workflow
                    </Button>
                  </p>
                )}
                <fieldset disabled={!!project}>
                  <GraphEditor harness={effectiveHarness} onChange={(steps) => setDraft({...draft, graph: {steps}})} />
                </fieldset>
              </>
            )}
            {section === "Run limits" && (
              <>
                <h2 className="text-lg font-medium">Run limits</h2>
                {project && <p className="text-sm text-ink-muted">Inherited</p>}
                <fieldset disabled={!!project} className="grid gap-5 sm:grid-cols-2">
                  <ConfigField label="Maximum turns">
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      value={draft.loop.maxTurns}
                      onChange={(event) => setDraft({...draft, loop: {...draft.loop, maxTurns: Number(event.target.value)}})}
                    />
                  </ConfigField>
                  <ConfigField label="Timeout in seconds">
                    <Input
                      type="number"
                      min={10}
                      max={3600}
                      value={draft.loop.timeoutSeconds}
                      onChange={(event) => setDraft({...draft, loop: {...draft.loop, timeoutSeconds: Number(event.target.value)}})}
                    />
                  </ConfigField>
                </fieldset>
                <p className="text-xs leading-relaxed text-ink-muted">Approval-dialog actions unavailable.</p>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default function HarnessConfigPage(props: {harnessId: string; section?: string; projectId?: string; agentName?: string}) {
  const {harnessId, section, projectId, agentName} = props;
  const library = useHarnessLibrary();
  const harness = library.data?.harnesses.find((item) => item.id === harnessId);
  if (!library.data || !harness) return <div className="p-8 text-sm text-ink-muted">{library.isError ? "Could not load the harness." : "Loading harness…"}</div>;
  const ownerId = projectId ?? (section === "Overview" || section === "Prompts" ? harness.coordinatorProjectId : undefined);
  const project = library.data.projects.find((item) => item.id === ownerId && item.harnessId === harnessId);
  if (projectId && !project) return <p className="p-8 text-sm text-danger-ink">This workspace is not part of this harness.</p>;
  const activeSection = sections.find((item) => item === section) ?? "Chats";
  return (
    <div className="harness-workspace flex min-h-0 flex-1 flex-col overflow-hidden pt-12 md:pt-0">
      <WorkspaceEditor
        key={harness.id + ":" + (project?.id ?? "shared")}
        harness={harness}
        library={library.data}
        section={activeSection}
        project={project}
        agentName={agentName}
      />
    </div>
  );
}
