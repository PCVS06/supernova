import type {CuratorConfig, HarnessConfig} from "@supernova/contracts/harnesses/schemas";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Switch from "@/components/ui/switch";
import {showToast} from "@/components/ui/toast-manager";
import SettingsPageShell from "@/features/settings/components/settings-page-shell";
import {SettingsGroup, SettingsRow} from "@/features/settings/components/settings-group";
import ConfigCard from "@/features/harnesses/components/config-card";
import CuratorRequests from "@/features/harnesses/components/curator-requests";
import CuratorSchedule from "@/features/harnesses/components/curator-schedule";
import CuratorSignals from "@/features/harnesses/components/curator-signals";
import ExecutionEditor from "@/features/harnesses/components/execution-editor";
import {useCuration, useRunCuratorReview} from "@/features/harnesses/hooks/api/use-curation";
import {compactChars, relativeTime, spendLabel} from "@/features/harnesses/lib/curation-format";
import {curatorConfigPatch, defaultCuratorConfig} from "@/features/harnesses/lib/curator-config";

const REVIEW_LIMIT = 20;

interface CuratorEditorProps {
  harness: HarnessConfig;
  onChangeHarness: (change: Partial<HarnessConfig>) => void;
  onOpenInbox: () => void;
}

/** The curator of one harness: whether it runs, which model it uses, what it may apply alone, and what it cost. */
export default function CuratorEditor(props: CuratorEditorProps) {
  const {harness, onChangeHarness, onOpenInbox} = props;
  const curation = useCuration(harness.id);
  const runReview = useRunCuratorReview();
  const curator = harness.curator;
  const limits = curator ?? defaultCuratorConfig;
  const reviews = (curation.data?.reviews ?? []).toSorted((a, b) => b.startedAt.localeCompare(a.startedAt)).slice(0, REVIEW_LIMIT);
  const last = reviews[0];
  const pending = curation.data?.proposals.filter((proposal) => proposal.status === "pending").length ?? 0;

  const patch = (change: Partial<CuratorConfig>): void => {
    onChangeHarness({curator: curatorConfigPatch(curator, change)});
  };

  const handleReview = (): void => {
    runReview.mutate(
      {harnessId: harness.id},
      {
        onSuccess: (review) => {
          if (review.status === "failed") {
            showToast("Review failed", review.error ?? "The review stopped without a reason.");
            return;
          }
          showToast("Review finished", review.summary || `${review.proposals} proposals · ${review.applied} applied`);
        },
        onError: (error) => showToast("Review failed", error instanceof Error ? error.message : String(error)),
      }
    );
  };

  return (
    <SettingsPageShell testId="curator-editor">
      <SettingsGroup title="Status">
        <SettingsRow
          control={<Switch aria-label="Curator" checked={curator?.enabled ?? false} onCheckedChange={(enabled) => patch({enabled})} />}
          description="Reviews instructions, plans and memory against what the runs show."
          title="Curator"
        />
        <SettingsRow
          control={
            <Button className="rounded-lg border border-border px-3 py-2 text-xs text-ink-muted hover:text-ink" disabled={runReview.isPending} onClick={handleReview}>
              {runReview.isPending ? "Reviewing…" : "Review now"}
            </Button>
          }
          description="Runs one review now under the limits below."
          title="Review now"
        />
        <SettingsRow description={last ? undefined : "No reviews yet."} title="Last review">
          {last && (
            <div className="space-y-2">
              <p className="text-xs text-ink-muted">
                {relativeTime(last.startedAt)} · {last.trigger} · {last.proposals} proposals · {last.applied} applied
                {spendLabel(last.spentUsd) && ` · ${spendLabel(last.spentUsd)}`}
              </p>
              {(last.error ?? last.summary) && (
                <p className="whitespace-pre-wrap rounded-xl border border-border bg-surface-raised/70 p-3 text-xs leading-relaxed text-ink-muted">{last.error ?? last.summary}</p>
              )}
            </div>
          )}
        </SettingsRow>
        {pending > 0 && (
          <div className="px-3 sm:px-4">
            <Button className="text-xs text-ink-muted underline hover:text-ink" onClick={onOpenInbox}>
              Open inbox ({pending} pending)
            </Button>
          </div>
        )}
      </SettingsGroup>

      <SettingsGroup title="Model">
        <ExecutionEditor value={curator?.execution} inherited={harness.execution} inheritLabel="Uses the harness model" onChange={(execution) => patch({execution})} />
      </SettingsGroup>

      <SettingsGroup title="Auto-apply">
        <SettingsRow
          control={
            <Switch aria-label="Memory hygiene" checked={curator?.autoApply.memory ?? false} onCheckedChange={(memory) => patch({autoApply: {...limits.autoApply, memory}})} />
          }
          description="Supersede and retract ledger records without asking."
          title="Memory hygiene"
        />
        <SettingsRow
          control={
            <Switch
              aria-label="Plan log"
              checked={curator?.autoApply.planningLog ?? false}
              onCheckedChange={(planningLog) => patch({autoApply: {...limits.autoApply, planningLog}})}
            />
          }
          description="Append dated decisions to the first planning document without asking."
          title="Plan log"
        />
      </SettingsGroup>

      <CuratorSchedule config={limits} onChange={patch} />

      <CuratorSignals metrics={curation.data?.metrics} />

      <SettingsGroup title="Spend limits">
        <SettingsRow
          control={
            <Input
              aria-label="Per review in USD"
              className="sm:w-40"
              min={0}
              step={0.1}
              type="number"
              value={limits.maxCostUsdPerRun}
              onChange={(event) => patch({maxCostUsdPerRun: Number(event.target.value)})}
            />
          }
          description="The most it may spend on one review, in USD."
          title="Per review"
        />
        <SettingsRow
          control={
            <Input
              aria-label="Per day in USD"
              className="sm:w-40"
              min={0}
              step={0.5}
              type="number"
              value={limits.maxCostUsdPerDay}
              onChange={(event) => patch({maxCostUsdPerDay: Number(event.target.value)})}
            />
          }
          description="The most it may spend in one day, in USD."
          title="Per day"
        />
      </SettingsGroup>

      <SettingsGroup title="Reviews">
        <div className="space-y-2 px-3 sm:px-4">
          {reviews.map((review) => (
            <ConfigCard key={review.id} className="space-y-1 p-3">
              <p className="text-xs text-ink-muted">
                {relativeTime(review.startedAt)} · {review.trigger} · {review.status} · {review.proposals} proposals · {review.applied} applied
                {spendLabel(review.spentUsd) && ` · ${spendLabel(review.spentUsd)}`}
                {review.instructionChars !== undefined && ` · ${compactChars(review.instructionChars)} chars`}
              </p>
              {review.status === "failed" && (
                <p className="truncate text-xs text-danger-ink" title={review.error ?? undefined}>
                  {review.error ?? "No reason given."}
                </p>
              )}
            </ConfigCard>
          ))}
          {!reviews.length && <ConfigCard className="text-sm text-ink-muted">No reviews yet.</ConfigCard>}
        </div>
      </SettingsGroup>

      <CuratorRequests requests={curation.data?.requests ?? []} />
    </SettingsPageShell>
  );
}
