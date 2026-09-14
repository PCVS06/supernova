import type {CuratorConfig, HarnessConfig} from "@supernova/contracts/harnesses/schemas";
import {useState} from "react";
import {Link} from "@tanstack/react-router";
import Button from "@/components/ui/button";
import ConstantOrb from "@/components/brand/constant-orb";
import ConstantCompletion from "@/components/brand/constant-completion";
import {constantIdentity} from "@/components/brand/constant-identity";
import {useAppearanceStore} from "@/features/settings/stores/appearance-store";
import Input from "@/components/ui/input";
import Switch from "@/components/ui/switch";
import {showToast} from "@/components/ui/toast-manager";
import SettingsPageShell from "@/features/settings/components/settings-page-shell";
import {SettingsGroup, SettingsRow} from "@/features/settings/components/settings-group";
import CuratorRequests from "@/features/harnesses/components/curator-requests";
import CuratorSchedule from "@/features/harnesses/components/curator-schedule";
import CuratorSignals from "@/features/harnesses/components/curator-signals";
import ExecutionEditor from "@/features/harnesses/components/execution-editor";
import {useCuration, useRunCuratorReview} from "@/features/harnesses/hooks/api/use-curation";
import {relativeTime, spendLabel} from "@/features/harnesses/lib/curation-format";
import {curatorConfigPatch, defaultCuratorConfig} from "@/features/harnesses/lib/curator-config";

interface CuratorEditorProps {
  harness: HarnessConfig;
  onChangeHarness: (change: Partial<HarnessConfig>) => void;
}

/** The curator of one harness: whether it runs, which model it uses, what it may apply alone, and what it cost. */
export default function CuratorEditor(props: CuratorEditorProps) {
  const {harness, onChangeHarness} = props;
  const curation = useCuration(harness.id);
  const runReview = useRunCuratorReview();
  const [completedReview, setCompletedReview] = useState<string>();
  const mathematicalMotion = useAppearanceStore((state) => state.mathematicalMotion);
  const curator = harness.curator;
  const limits = curator ?? defaultCuratorConfig;
  const last = (curation.data?.reviews ?? []).toSorted((a, b) => b.startedAt.localeCompare(a.startedAt))[0];
  const pending = curation.data?.proposals.filter((proposal) => proposal.status === "pending").length ?? 0;

  const patch = (change: Partial<CuratorConfig>): void => {
    onChangeHarness({curator: curatorConfigPatch(curator, change)});
  };

  const handleReview = (): void => {
    setCompletedReview(undefined);
    runReview.mutate(
      {harnessId: harness.id},
      {
        onSuccess: (review) => {
          if (review.status === "failed") {
            showToast("Review failed", review.error ?? "The review stopped without a reason.");
            return;
          }
          if (review.status === "completed") setCompletedReview(review.id);
          showToast("Review finished", review.summary || `${review.proposals} proposals · ${review.applied} applied`);
        },
        onError: (error) => showToast("Review failed", error instanceof Error ? error.message : String(error)),
      }
    );
  };

  return (
    <SettingsPageShell testId="curator-editor">
      <header className="flex items-center gap-4 px-3 pb-5 sm:px-4">
        {completedReview ? (
          <ConstantCompletion constant="i" className="size-24" label="Curator · imaginary unit" key={completedReview} onComplete={() => setCompletedReview(undefined)} />
        ) : (
          <ConstantOrb constant="i" className="size-24" label="Curator · imaginary unit" state={runReview.isPending ? "working" : "idle"} />
        )}
        <div>
          <h2 className="text-xl font-medium text-ink-strong">Curator</h2>
          <p className="mt-1 text-xs text-ink-muted">Instructions, plans and memory</p>
          {runReview.isPending && mathematicalMotion === "playful" && (
            <p aria-hidden="true" className="mt-1 text-xs text-ink">
              {constantIdentity.i.caption}…
            </p>
          )}
        </div>
      </header>
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
        <SettingsRow
          control={
            <Link className="rounded-lg border border-border px-3 py-2 text-xs text-ink-muted hover:text-ink" params={{harnessId: harness.id}} to="/inbox/$harnessId">
              {pending > 0 ? `Open inbox (${pending} pending)` : "Open inbox"}
            </Link>
          }
          description="Proposals are approved, edited or rejected outside settings."
          title="Inbox"
        />
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

      <CuratorRequests requests={curation.data?.requests ?? []} />
    </SettingsPageShell>
  );
}
