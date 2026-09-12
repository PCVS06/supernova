import {useState} from "react";
import type {CurationProposal, HarnessProject} from "@supernova/contracts/harnesses/schemas";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import SettingsPageShell from "@/features/settings/components/settings-page-shell";
import ConfigCard from "@/features/harnesses/components/config-card";
import PromptEditor from "@/features/harnesses/components/prompt-editor";
import WorkflowChip from "@/features/harnesses/components/workflow-graph/workflow-chip";
import {useCuration, useDecideCuration, useRollbackCuration} from "@/features/harnesses/hooks/api/use-curation";
import {useHarnessLibrary} from "@/features/harnesses/hooks/api/use-harnesses";
import {curationTargetLabel, relativeTime} from "@/features/harnesses/lib/curation-format";
import type {DiffLine} from "@/features/harnesses/lib/text-diff";
import {diffLines} from "@/features/harnesses/lib/text-diff";
import {cn} from "@/lib/cn";

type InboxFilter = "pending" | "applied" | "rejected" | "all";

const inboxFilters: readonly {value: InboxFilter; label: string}[] = [
  {value: "pending", label: "Pending"},
  {value: "applied", label: "Applied"},
  {value: "rejected", label: "Rejected"},
  {value: "all", label: "All"},
];

const actionClass = "rounded-lg border border-border px-3 py-2 text-xs text-ink-muted hover:text-ink";

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function matchesFilter(proposal: CurationProposal, filter: InboxFilter): boolean {
  return filter === "all" || proposal.status === filter;
}

interface DiffColumnProps {
  label: string;
  lines: readonly DiffLine[];
}

function DiffColumn(props: DiffColumnProps) {
  const {label, lines} = props;

  return (
    <div className="min-w-0 space-y-1">
      <p className="retro-label text-ink-faint">{label}</p>
      <div className="overflow-x-auto rounded-xl border border-border bg-surface-raised/70 p-3 font-mono text-xs leading-relaxed">
        {lines.map((line, index) => (
          <p
            className={cn(
              "whitespace-pre-wrap",
              line.kind === "removed" && "text-diff-removed",
              line.kind === "added" && "text-diff-added",
              line.kind === "same" && "text-ink-muted"
            )}
            key={index}
          >
            {line.text || " "}
          </p>
        ))}
      </div>
    </div>
  );
}

interface ProposalChangeProps {
  proposal: CurationProposal;
}

function ProposalChange(props: ProposalChangeProps) {
  const {proposal} = props;
  const change = proposal.change;

  if (change.type === "memory") {
    return (
      <div className="space-y-1">
        <p className="font-mono text-xs text-ink">
          {change.op === "supersede" ? `Supersede ${proposal.target.recordId ?? ""} by ${change.supersededBy ?? ""}` : `Retract ${proposal.target.recordId ?? ""}`}
        </p>
        <p className="text-xs leading-relaxed text-ink-muted">{change.reason}</p>
      </div>
    );
  }

  if (change.type === "log") {
    return <p className="whitespace-pre-wrap rounded-xl border border-border bg-surface-raised/70 p-3 font-mono text-xs leading-relaxed text-ink">{change.line}</p>;
  }

  const diff = diffLines(change.find, change.replace);

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <DiffColumn label="Current" lines={diff.find} />
      <DiffColumn label="Proposed" lines={diff.replace} />
    </div>
  );
}

interface ProposalCardProps {
  proposal: CurationProposal;
  projectName?: string;
  revision: number;
}

/** One proposal with its evidence and the decision it still needs. Every decision carries the revision it was read at. */
function ProposalCard(props: ProposalCardProps) {
  const {proposal, projectName, revision} = props;
  const change = proposal.change;
  const [replace, setReplace] = useState(change.type === "text" ? change.replace : "");
  const [editing, setEditing] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const decide = useDecideCuration();
  const rollback = useRollbackCuration();
  const failure = decide.error ?? rollback.error;
  const busy = decide.isPending || rollback.isPending;

  const handleApprove = (): void => {
    decide.reset();
    decide.mutate({proposalId: proposal.id, decision: "approve", replace: editing ? replace : undefined, expectedRevision: revision});
  };

  const handleReject = (): void => {
    decide.reset();
    decide.mutate({proposalId: proposal.id, decision: "reject", reason, expectedRevision: revision});
  };

  const handleRollback = (): void => {
    rollback.reset();
    rollback.mutate({proposalId: proposal.id, expectedRevision: revision});
  };

  return (
    <ConfigCard className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="min-w-0 flex-1 truncate text-sm text-ink-strong" title={curationTargetLabel(proposal.target, projectName)}>
          {curationTargetLabel(proposal.target, projectName)}
        </h3>
        <WorkflowChip tone={proposal.tier === "approval" ? "accent" : "muted"}>{proposal.tier}</WorkflowChip>
        <span className="text-xs text-ink-faint">{relativeTime(proposal.createdAt)}</span>
      </div>
      <p className="text-xs leading-relaxed text-ink-muted">{proposal.rationale}</p>
      {proposal.evidence.length > 0 && (
        <ul className="space-y-1">
          {proposal.evidence.map((item, index) => (
            <li key={index}>
              <details className="rounded-lg border border-border px-3 py-2">
                <summary className="cursor-pointer text-xs text-ink-muted">
                  {item.kind} · {item.ref}
                </summary>
                <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-ink-muted">{item.quote}</p>
              </details>
            </li>
          ))}
        </ul>
      )}
      <ProposalChange proposal={proposal} />
      {editing && change.type === "text" && <PromptEditor label="Replacement text" size="sm" value={replace} onChange={setReplace} />}
      {proposal.status === "pending" && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <Button className={actionClass} disabled={busy} onClick={handleApprove}>
              {decide.isPending ? "Applying…" : "Approve"}
            </Button>
            {change.type === "text" && (
              <Button className={actionClass} onClick={() => setEditing(!editing)}>
                {editing ? "Stop editing" : "Edit"}
              </Button>
            )}
            <Button className={actionClass} disabled={busy} onClick={() => setRejecting(!rejecting)}>
              {rejecting ? "Keep it" : "Reject"}
            </Button>
          </div>
          {rejecting && (
            <div className="flex flex-wrap items-center gap-2">
              <Input aria-label="Rejection reason" className="sm:w-80" placeholder="Why is this wrong?" value={reason} onChange={(event) => setReason(event.target.value)} />
              <Button className={actionClass} disabled={busy || !reason.trim()} onClick={handleReject}>
                Reject
              </Button>
            </div>
          )}
        </div>
      )}
      {proposal.status === "applied" && (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-xs text-ink-muted">Applied at revision {proposal.appliedRevision ?? "—"}</p>
          <Button className={actionClass} disabled={busy} onClick={handleRollback}>
            {rollback.isPending ? "Rolling back…" : "Roll back"}
          </Button>
        </div>
      )}
      {proposal.status === "rejected" && <p className="text-xs text-ink-muted">Rejected · {proposal.decisionReason ?? "No reason given."}</p>}
      {proposal.status === "rolled-back" && <p className="text-xs text-ink-muted">Rolled back.</p>}
      {proposal.status === "failed" && <p className="text-xs text-danger-ink">{proposal.error ?? "This change could not be applied."}</p>}
      {failure && (
        <p className="text-xs text-danger-ink" role="alert">
          {errorText(failure)} Nothing was changed.
        </p>
      )}
    </ConfigCard>
  );
}

interface CurationInboxProps {
  harnessId: string;
  projects: readonly HarnessProject[];
  /** Which chip is active on first render. Waiting proposals come first. */
  initialFilter?: InboxFilter;
}

/** Proposals waiting for a decision, and the record of the ones already decided. */
export default function CurationInbox(props: CurationInboxProps) {
  const {harnessId, projects, initialFilter = "pending"} = props;
  const [filter, setFilter] = useState<InboxFilter>(initialFilter);
  const curation = useCuration(harnessId);
  const library = useHarnessLibrary();
  const revision = library.data?.revision ?? 0;
  const proposals = (curation.data?.proposals ?? []).filter((proposal) => matchesFilter(proposal, filter)).toSorted((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <SettingsPageShell testId="curation-inbox">
      <div className="space-y-4">
        <nav aria-label="Proposal filters" className="flex flex-wrap gap-2 px-3 sm:px-4">
          {inboxFilters.map((item) => (
            <Button
              aria-label={item.label}
              aria-pressed={item.value === filter}
              className={cn("rounded-full border px-3 py-1 text-xs", item.value === filter ? "border-ink-faint text-ink" : "border-border text-ink-muted hover:text-ink")}
              key={item.value}
              onClick={() => setFilter(item.value)}
            >
              {item.label}
            </Button>
          ))}
        </nav>
        <div className="space-y-3 px-3 sm:px-4">
          {curation.isPending && (
            <p className="py-8 text-center text-sm text-ink-muted" role="status">
              Loading proposals…
            </p>
          )}
          {curation.isError && (
            <ConfigCard className="text-sm text-danger-ink" role="alert">
              Could not load the inbox.{" "}
              <Button className="underline" onClick={() => void curation.refetch()}>
                Retry
              </Button>
            </ConfigCard>
          )}
          {proposals.map((proposal) => (
            <ProposalCard key={proposal.id} projectName={projects.find((project) => project.id === proposal.target.projectId)?.name} proposal={proposal} revision={revision} />
          ))}
          {curation.data && !proposals.length && (
            <ConfigCard className="text-sm text-ink-muted">{filter === "pending" ? "Nothing waiting. Run a review from Agents → Curator." : "None yet."}</ConfigCard>
          )}
        </div>
      </div>
    </SettingsPageShell>
  );
}
