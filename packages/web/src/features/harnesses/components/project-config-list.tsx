import {useState} from "react";
import type {HarnessProject} from "@supernova/contracts/harnesses/schemas";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import AgentMark from "@/features/harnesses/components/agent-mark";
import ConfigChoice from "@/features/harnesses/components/config-choice";
import {agentLabel} from "@/features/harnesses/lib/agent-identity";
import {cn} from "@/lib/cn";

interface ProjectConfigListProps {
  projects: readonly HarnessProject[];
  coordinatorId?: string;
  selectedId?: string;
  onSelect: (projectId: string) => void;
}

/** The projects of one harness, coordinator first. Picking one opens its plan. */
export default function ProjectConfigList(props: ProjectConfigListProps) {
  const {projects, coordinatorId, selectedId, onSelect} = props;
  const [query, setQuery] = useState("");
  const filtered = projects.filter((item) => `${item.name} ${item.path}`.toLowerCase().includes(query.toLowerCase()));

  return (
    <>
      <div className="agent-compact-picker shrink-0 items-center gap-3 border-b border-border px-6 py-3">
        <div className="min-w-0 flex-1">
          {projects.length ? (
            <ConfigChoice label="Projects" value={selectedId ?? ""} options={projects.map((item) => ({value: item.id, label: agentLabel(item.name)}))} onChange={onSelect} />
          ) : (
            <span className="text-sm text-ink-muted">No projects yet</span>
          )}
        </div>
      </div>
      <aside className="harness-agent-list flex min-h-0 w-64 shrink-0 flex-col border-r border-border">
        <div className="space-y-3 p-4">
          <div className="flex h-6 items-center justify-between gap-2 text-xs text-ink-muted">
            <span>
              Projects <span className="ml-1 text-ink-faint">{projects.length}</span>
            </span>
          </div>
          <Input aria-label="Search projects" placeholder="Search projects…" value={query} onChange={(event) => setQuery(event.target.value)} />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-3" data-testid="project-list-scroll">
          {filtered.map((item) => (
            <Button
              key={item.id}
              aria-label={`Open ${agentLabel(item.name)}`}
              aria-pressed={selectedId === item.id}
              onClick={() => onSelect(item.id)}
              className={cn(
                "agent-editor-row mb-1 flex min-h-18 w-full items-center gap-3 rounded-xl corner-superellipse/1.3 px-2 py-2 text-left outline-none hover:bg-overlay-hover focus-visible:bg-overlay-hover",
                selectedId === item.id && "bg-surface-control"
              )}
            >
              <AgentMark name={item.id} color={item.color} kind={item.id === coordinatorId ? "orchestrator" : "lead"} className="size-10 shrink-0" />
              <span className="min-w-0 flex-1">
                <span className="line-clamp-2 text-sm leading-5" title={agentLabel(item.name)}>
                  {agentLabel(item.name)}
                </span>
                {item.folderMissing ? (
                  <span className="mt-1 inline-flex rounded-full border border-border px-2 py-0.5 text-xs text-danger-ink">Folder missing</span>
                ) : (
                  <span className="mt-1 block truncate text-xs text-ink-muted" title={item.path}>
                    {item.path}
                  </span>
                )}
              </span>
            </Button>
          ))}
          {!filtered.length && <p className="px-2 py-3 text-xs text-ink-muted">{projects.length ? "No matches." : "Add a project to this harness to plan its work."}</p>}
        </div>
      </aside>
    </>
  );
}
