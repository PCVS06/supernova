import {useState} from "react";
import type {HarnessConfig, HarnessProject} from "@supernova/contracts/harnesses/schemas";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Icon from "@/components/ui/icon";
import {SettingsGroup, SettingsRow} from "@/features/settings/components/settings-group";
import ConfigCard, {configCardClass} from "@/features/harnesses/components/config-card";
import ConfigChoice from "@/features/harnesses/components/config-choice";
import EditorTabs from "@/features/harnesses/components/editor-tabs";
import AgentWorkbench from "@/features/harnesses/components/agent-workbench";
import {useHarnessMemory} from "@/features/harnesses/hooks/api/use-harness-resources";
import {agentLabel} from "@/features/harnesses/lib/agent-identity";
import {cn} from "@/lib/cn";

type MemoryScope = "harness" | "projects" | "specialists";

const scopeOptions: readonly {value: MemoryScope; label: string}[] = [
  {value: "harness", label: "Harness memory"},
  {value: "projects", label: "Project memory"},
  {value: "specialists", label: "Specialist memory"},
];

interface MemoryEditorProps {
  harness: HarnessConfig;
  project?: HarnessProject;
  projects: readonly HarnessProject[];
  onOpenContext?: (projectId?: string) => void;
}

/** What the agents of this harness have saved. Read-only: records are written by the agents, never here. */
export default function MemoryEditor(props: MemoryEditorProps) {
  const {harness, project, projects, onOpenContext} = props;
  const [scope, setScope] = useState<MemoryScope>(project && project.id !== harness.coordinatorProjectId ? "projects" : "harness");
  const [section, setSection] = useState<"records" | "storage">("records");
  const [projectId, setProjectId] = useState(project?.id ?? projects[0]?.id ?? "");
  const [agentId, setAgentId] = useState("");
  const [query, setQuery] = useState("");
  const head = projects.find((item) => item.id === harness.coordinatorProjectId);
  const labs = projects.filter((item) => item.id !== harness.coordinatorProjectId).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const selectableProjects = scope === "projects" ? labs : projects;
  const selectedProjectId = selectableProjects.some((item) => item.id === projectId) ? projectId : selectableProjects[0]?.id;
  const owner = scope === "harness" ? head : projects.find((item) => item.id === selectedProjectId);
  const memory = useHarnessMemory(harness.id, scope === "harness" ? undefined : selectedProjectId);
  const mergedAgents = new Map(harness.agents.map((agent) => [agent.name, agent]));
  for (const agent of owner?.agents ?? []) mergedAgents.set(agent.name, agent);
  const agents = [...mergedAgents.values()];
  const agent = agents.find((item) => item.name === agentId) ?? agents[0];
  const records = memory.data?.records.filter((record) => `${record.id} ${record.statement} ${record.kind} ${record.state}`.toLowerCase().includes(query.toLowerCase())) ?? [];
  const ownerName = owner ? agentLabel(owner.name) : "No project selected";
  const specialist = scope === "specialists";
  const identity = specialist
    ? {
        id: agent?.name ?? "specialist",
        name: agent ? agentLabel(agent.name) : "Specialist memory",
        color: agent?.color,
        role: "Specialist memory",
        description: "Shared project memory · no private store",
      }
    : {
        id: owner?.id ?? harness.id,
        name: scope === "harness" ? agentLabel(harness.name) : ownerName,
        color: owner?.color ?? (scope === "harness" ? "#ffffff" : undefined),
        role: scope === "harness" ? "Harness memory" : "Project memory",
        description: scope === "harness" ? (head ? ownerName : "Not connected") : "",
      };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden" data-testid="memory-workspace">
      <AgentWorkbench
        key={scope}
        kind={specialist ? "specialist" : "lead"}
        identity={identity}
        selection={
          scope === "harness"
            ? undefined
            : {
                purpose: "memory",
                label: specialist ? "Specialists" : "Projects",
                value: specialist ? (agent?.name ?? "") : (selectedProjectId ?? ""),
                items: specialist
                  ? agents.map((item) => ({id: item.name, name: agentLabel(item.name), color: item.color, subtitle: "Uses project memory"}))
                  : labs.map((item) => ({id: item.id, name: agentLabel(item.name), color: item.color, subtitle: "Project ledger"})),
                onChange: (id) => {
                  if (specialist) setAgentId(id);
                  else setProjectId(id);
                  setQuery("");
                },
              }
        }
        navigation={
          <EditorTabs
            label="Memory detail tabs"
            value={section}
            onChange={setSection}
            items={[
              {value: "records", label: "Records"},
              {value: "storage", label: "Scope & storage"},
            ]}
          />
        }
      >
        <SettingsGroup title="Memory scope">
          <SettingsRow
            control={
              <ConfigChoice
                className="sm:w-64"
                label="Memory scope"
                value={scope}
                options={scopeOptions.map((option) => ({
                  value: option.value,
                  label: option.value === "projects" && !labs.length ? `${option.label} · no projects` : option.label,
                }))}
                onChange={(value) => {
                  setScope(value as MemoryScope);
                  setQuery("");
                }}
              />
            }
            description="Memory belongs to a harness or a project. Specialists read the memory of the project they work in."
            title="Whose memory"
          />
          {specialist && selectableProjects.length > 0 && (
            <SettingsRow
              control={
                <ConfigChoice
                  className="sm:w-64"
                  label="Memory project"
                  value={selectedProjectId ?? ""}
                  options={selectableProjects.map((item) => ({value: item.id, label: agentLabel(item.name)}))}
                  onChange={(id) => {
                    setProjectId(id);
                    setQuery("");
                  }}
                />
              }
              description="The project ledger this specialist reads from."
              title="Project memory source"
            />
          )}
        </SettingsGroup>

        {section === "storage" ? (
          <SettingsGroup title="Scope & storage">
            <SettingsRow description={ownerName} title="Owner" />
            <SettingsRow description={owner ? `${owner.path}/.science-memory/ledger.jsonl` : "No source connected"} title="Source file" />
            <SettingsRow description="Read-only. Records are written by the agents, never from this screen." title="Access" />
            {specialist && <SettingsRow description="Not connected. Specialists share the project ledger." title="Private memory" />}
            {onOpenContext && (
              <SettingsRow
                control={
                  <Button
                    className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs text-ink-muted hover:text-ink"
                    onClick={() => onOpenContext(scope === "harness" ? undefined : owner?.id)}
                  >
                    <Icon name="settings" size="xs" />
                    Context loading & settings
                  </Button>
                }
                description="Memory is recalled through the context rules of this harness."
                title="Context loading"
              />
            )}
          </SettingsGroup>
        ) : (
          <SettingsGroup title={specialist ? "Shared project records" : "Saved records"}>
            <SettingsRow
              control={
                <Button
                  aria-label="Refresh memory"
                  disabled={memory.isFetching}
                  className="flex shrink-0 items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs text-ink-muted hover:bg-overlay-hover"
                  onClick={() => void memory.refetch()}
                >
                  <Icon name="restart" size="xs" />
                  Refresh
                </Button>
              }
              description={`${ownerName} · read-only`}
              title={`${memory.data?.unavailableReason ? "—" : (memory.data?.total ?? "—")} records`}
            >
              <Input aria-label="Search memory" placeholder="Search saved records…" value={query} onChange={(event) => setQuery(event.target.value)} />
            </SettingsRow>
            <div className="space-y-2 px-3 sm:px-4">
              {memory.isPending && (
                <p role="status" className="py-8 text-center text-sm text-ink-muted">
                  Reading memory…
                </p>
              )}
              {memory.isError && (
                <ConfigCard className="text-sm text-danger-ink" role="alert">
                  Could not read memory. No files were changed. Use Refresh to try again.
                </ConfigCard>
              )}
              {memory.data && (
                <>
                  {memory.data.rejected > 0 && (
                    <p role="alert" className="text-xs text-danger-ink">
                      {memory.data.rejected} malformed entries skipped.
                    </p>
                  )}
                  {memory.data.total > 200 && <p className="text-xs text-ink-muted">Showing the 200 most recently updated records.</p>}
                  {!records.length && (
                    <ConfigCard className="flex flex-col items-center px-6 py-12 text-center">
                      <span className="mb-4 flex size-12 items-center justify-center rounded-full border border-border text-ink-muted">
                        <Icon name="archive" size="md" />
                      </span>
                      <h4 className="text-sm font-medium">
                        {memory.data.unavailableReason === "workspace-missing"
                          ? "Workspace folder unavailable"
                          : memory.data.total
                            ? "No matching records"
                            : "No saved memories yet"}
                      </h4>
                      <p className="mt-2 max-w-sm text-xs leading-relaxed text-ink-muted">
                        {memory.data.unavailableReason === "workspace-missing" ? "Folder not found. Check the project path." : memory.data.total ? "Try another search." : ""}
                      </p>
                      {!memory.data.total && (
                        <Button className="mt-5 text-xs text-ink-muted underline underline-offset-4 hover:text-ink" onClick={() => setSection("storage")}>
                          View scope & storage
                        </Button>
                      )}
                    </ConfigCard>
                  )}
                  {records.map((record) => (
                    <article className={cn(configCardClass, "overflow-hidden")} key={record.id}>
                      <div className="p-5">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-ink-muted">
                          <span className="break-words rounded-full border border-border px-2.5 py-1">{record.kind.replaceAll("_", " ")}</span>
                          <span className="break-words rounded-full bg-surface-control px-2.5 py-1">{record.state.replaceAll("_", " ")}</span>
                          <span className="ml-auto text-ink-faint">Updated {record.updatedAt.slice(0, 10)}</span>
                        </div>
                        <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-relaxed">{record.statement}</p>
                      </div>
                      <div className="border-t border-border px-5 py-3 text-xs text-ink-muted">
                        <p className="truncate font-mono" title={record.id}>
                          {record.id}
                        </p>
                        {record.evidence.length > 0 && (
                          <details className="mt-3">
                            <summary className="cursor-pointer hover:text-ink">Evidence · {record.evidence.length} references</summary>
                            <ul className="mt-3 space-y-2">
                              {record.evidence.map((ref, index) => (
                                <li className="break-all leading-relaxed" key={index}>
                                  {ref}
                                </li>
                              ))}
                            </ul>
                          </details>
                        )}
                      </div>
                    </article>
                  ))}
                </>
              )}
            </div>
          </SettingsGroup>
        )}
      </AgentWorkbench>
    </div>
  );
}
