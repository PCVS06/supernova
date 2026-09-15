import type {CuratorMetrics} from "@supernova/contracts/harnesses/schemas";
import {SettingsGroup} from "@/features/settings/components/settings-group";
import ConfigCard from "@/features/harnesses/components/config-card";
import {agentLabel} from "@/features/harnesses/lib/agent-identity";
import {compactChars, percent, spendLabel} from "@/features/harnesses/lib/curation-format";

interface SignalTile {
  label: string;
  value: string;
  /** The same measure one window earlier, when there is one. */
  note?: string;
}

interface CuratorSignalsProps {
  metrics?: CuratorMetrics;
}

/** What the curator's work has produced, over the measured window and the one before it. */
export default function CuratorSignals(props: CuratorSignalsProps) {
  const {metrics} = props;

  if (!metrics) {
    return (
      <SettingsGroup title="Signals">
        <div className="px-3 sm:px-4">
          <ConfigCard className="text-sm text-ink-muted">No signals yet.</ConfigCard>
        </div>
      </SettingsGroup>
    );
  }

  const {instructionChars, proposals, spend, steersPerChat} = metrics;
  const tiles: readonly SignalTile[] = [
    {label: "Accepted", value: percent(proposals.applied, proposals.rejected)},
    {label: "Pending", value: String(proposals.pending)},
    {label: "Steers per chat", value: steersPerChat.current.toFixed(1), note: `was ${steersPerChat.previous.toFixed(1)}`},
    {
      label: "Instructions",
      value: compactChars(instructionChars.current),
      note: instructionChars.previous === undefined ? undefined : `was ${compactChars(instructionChars.previous)}`,
    },
    {label: "Spend today", value: `${spendLabel(spend.today)} of ${spendLabel(spend.maxPerDay)}`},
    {label: "Requests", value: String(metrics.requests)},
  ];
  const failures = metrics.failures.filter((agent) => agent.runs > 0 || agent.previousRuns > 0).toSorted((a, b) => b.failed - a.failed);

  return (
    <SettingsGroup title="Signals">
      <div className="space-y-4 px-3 sm:px-4">
        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {tiles.map((tile) => (
            <div className="rounded-xl corner-superellipse/1.3 border border-border bg-surface-raised/70 p-3" key={tile.label}>
              <dt className="text-xs text-ink-muted">{tile.label}</dt>
              <dd className="flex flex-wrap items-baseline gap-1.5 text-sm text-ink-strong">
                {tile.value}
                {tile.note && <span className="text-xs text-ink-faint">{tile.note}</span>}
              </dd>
            </div>
          ))}
        </dl>
        <div className="space-y-2">
          <p className="retro-label text-ink-faint">Failures per agent</p>
          {failures.length ? (
            <table className="w-full text-left text-xs text-ink-muted">
              <thead>
                <tr className="text-ink-faint">
                  <th className="font-normal">Agent</th>
                  <th className="font-normal">Runs</th>
                  <th className="font-normal">Failed</th>
                  <th className="font-normal">Previous</th>
                </tr>
              </thead>
              <tbody>
                {failures.map((agent) => (
                  <tr key={agent.agentName}>
                    <td className="text-ink">{agentLabel(agent.agentName)}</td>
                    <td>{agent.runs}</td>
                    <td>{agent.failed}</td>
                    <td>{`${agent.previousFailed}/${agent.previousRuns}`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-xs text-ink-muted">{`No runs in the last ${metrics.windowDays} days.`}</p>
          )}
        </div>
        <div className="space-y-2">
          <p className="retro-label text-ink-faint">Recent rejections</p>
          {metrics.rejectionReasons.length ? (
            <ul className="space-y-1">
              {metrics.rejectionReasons.map((reason, index) => (
                <li className="text-xs leading-relaxed text-ink-muted" key={index}>
                  {reason}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-ink-muted">None.</p>
          )}
        </div>
      </div>
    </SettingsGroup>
  );
}
