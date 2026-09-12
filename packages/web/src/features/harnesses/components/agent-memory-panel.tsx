import {useState} from "react";
import type {HarnessProject} from "@supernova/contracts/harnesses/schemas";
import Button from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import Input from "@/components/ui/input";
import {SettingsGroup, SettingsRow} from "@/features/settings/components/settings-group";
import ConfigCard, {configCardClass} from "@/features/harnesses/components/config-card";
import ConfigChoice from "@/features/harnesses/components/config-choice";
import {useHarnessMemory} from "@/features/harnesses/hooks/api/use-harness-resources";
import {agentLabel} from "@/features/harnesses/lib/agent-identity";
import {cn} from "@/lib/cn";

interface AgentMemoryPanelProps {
  harnessId: string;
  /** One line saying whose memory this is. */
  explanation: string;
  /** The ledger to show first; falls back to the first readable project. */
  projectId?: string;
  /** Ledgers this agent may read. A single entry hides the picker. */
  projects: readonly HarnessProject[];
}

/** What the agents saved in one project. Read-only: records are written by the agents, never here. */
export default function AgentMemoryPanel(props: AgentMemoryPanelProps) {
  const {harnessId, explanation, projectId, projects} = props;
  const [selectedId, setSelectedId] = useState(projectId ?? projects[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const project = projects.find((item) => item.id === selectedId) ?? projects[0];
  const memory = useHarnessMemory(harnessId, project?.id);
  const records = memory.data?.records.filter((record) => `${record.id} ${record.statement} ${record.kind} ${record.state}`.toLowerCase().includes(query.toLowerCase())) ?? [];
  const unavailable = memory.data?.unavailableReason;

  return (
    <SettingsGroup title="Memory">
      {projects.length > 1 && (
        <SettingsRow
          control={
            <ConfigChoice
              className="sm:w-64"
              label="Project ledger"
              value={project?.id ?? ""}
              options={projects.map((item) => ({value: item.id, label: agentLabel(item.name)}))}
              onChange={(id) => {
                setSelectedId(id);
                setQuery("");
              }}
            />
          }
          description="Pick the project whose ledger you want to read."
          title="Project ledger"
        />
      )}
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
        description={explanation}
        title={`${unavailable ? "—" : (memory.data?.total ?? "—")} saved records`}
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
                  {unavailable === "workspace-missing" ? "Project folder missing" : memory.data.total ? "No matching records" : "Nothing saved yet"}
                </h4>
                <p className="mt-2 max-w-sm text-xs leading-relaxed text-ink-muted">
                  {unavailable === "workspace-missing"
                    ? "Restore the folder on the server, then refresh."
                    : memory.data.total
                      ? "Clear the search to see every record."
                      : "Agents write here while they work. Nothing to do yet."}
                </p>
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
        <p className="pt-2 text-xs leading-relaxed text-ink-faint">
          Storage · <span className="font-mono">{project ? `${project.path}/.science-memory/ledger.jsonl` : "no project connected"}</span> · written by the agents, read-only here.
        </p>
      </div>
    </SettingsGroup>
  );
}
