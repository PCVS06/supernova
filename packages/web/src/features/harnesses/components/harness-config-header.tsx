import type {HarnessConfig, HarnessProject} from "@supernova/contracts/harnesses/schemas";
import Button from "@/components/ui/button";
import AgentMark from "@/features/harnesses/components/agent-mark";
import {agentLabel} from "@/features/harnesses/lib/agent-identity";

interface HarnessConfigHeaderProps {
  harness: HarnessConfig;
  project?: HarnessProject;
  isHead: boolean;
  dirty: boolean;
  sharedDirty: boolean;
  savePending: boolean;
  onDiscard: () => void;
  onSave: () => void;
}

/** The one header of harness configuration: who is being configured, and the only save and discard in this surface. */
export default function HarnessConfigHeader(props: HarnessConfigHeaderProps) {
  const {harness, project, isHead, dirty, sharedDirty, savePending, onDiscard, onSave} = props;

  return (
    <header className="flex min-h-20 shrink-0 flex-wrap items-center justify-between gap-4 border-b border-border px-5 py-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <AgentMark className="size-11" color={project ? (project.color ?? (isHead ? "#ffffff" : undefined)) : "#ffffff"} kind="lead" name={project?.id ?? harness.id} />
        <div className="min-w-0">
          <h1 className="truncate text-lg font-medium text-ink-strong">{project ? agentLabel(project.name) : harness.name}</h1>
          <p className="mt-0.5 truncate text-xs text-ink-muted">
            {project ? (isHead ? `Coordinating project · ${harness.name}` : `Project of ${harness.name}`) : "Harness-wide settings"}
            {dirty && <span className="text-ink-faint"> · unsaved{sharedDirty ? ", harness-wide" : ""}</span>}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {dirty && (
          <Button className="rounded-lg border border-border px-3 py-2 text-xs text-ink-muted hover:text-ink" onClick={onDiscard}>
            Discard
          </Button>
        )}
        <Button variant="filled" className="px-3 py-2 text-xs" disabled={!dirty || savePending} onClick={onSave}>
          {savePending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </header>
  );
}
