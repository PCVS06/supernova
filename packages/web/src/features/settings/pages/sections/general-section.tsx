import Switch from "@/components/ui/switch";
import {SettingsGroup, SettingsRow} from "@/features/settings/components/settings-group";
import {useGeneralSettingsStore} from "@/features/settings/stores/general-settings-store";
import {useWorkspaceMapStore} from "@/features/workspace/stores/workspace-map-store";

/** App behaviour: what a turn records, and how chats and the sidebar present the work behind them. */
export default function GeneralSection() {
  const captureCheckpoints = useGeneralSettingsStore((state) => state.captureCheckpoints);
  const confirmCheckpointConflicts = useGeneralSettingsStore((state) => state.confirmCheckpointConflicts);
  const setCaptureCheckpoints = useGeneralSettingsStore((state) => state.setCaptureCheckpoints);
  const setConfirmCheckpointConflicts = useGeneralSettingsStore((state) => state.setConfirmCheckpointConflicts);
  const workspace = useWorkspaceMapStore();

  return (
    <>
      <SettingsGroup title="Git checkpoints">
        <SettingsRow
          control={<Switch aria-label="Capture workspace checkpoints" checked={captureCheckpoints} onCheckedChange={setCaptureCheckpoints} />}
          description="Snapshot workspace files at each turn so conversation navigation can restore them."
          title="Capture workspace checkpoints"
        />
        <SettingsRow
          control={<Switch aria-label="Ask before discarding changes" checked={confirmCheckpointConflicts} onCheckedChange={setConfirmCheckpointConflicts} />}
          description="Ask for confirmation when restoring a checkpoint would discard later changes."
          title="Ask before discarding changes"
        />
      </SettingsGroup>

      <SettingsGroup title="Workspace behaviour">
        <SettingsRow
          control={<Switch aria-label="Orbital motion" checked={workspace.orbitMotion} onCheckedChange={workspace.setOrbitMotion} />}
          description="Let participants move around their orchestrator until you inspect a symbol."
          title="Orbital motion"
        />
        <SettingsRow
          control={
            <select
              aria-label="Orbit detail"
              className="rounded-md border border-border bg-surface px-2 py-1.5 text-xs"
              onChange={(event) => workspace.setOrbitDensity(event.target.value as "balanced" | "compact")}
              value={workspace.orbitDensity}
            >
              <option value="balanced">Balanced</option>
              <option value="compact">Compact</option>
            </select>
          }
          description="Keep larger systems grouped by their owner, with every participant still in the group's search."
          title="Orbit detail"
        />
        <SettingsRow
          control={<Switch aria-label="Detailed sidebar activity" checked={workspace.sidebarDetail} onCheckedChange={workspace.setSidebarDetail} />}
          description="Show activity counts and project roles in the sidebar instead of ongoing work alone."
          title="Detailed sidebar activity"
        />
      </SettingsGroup>
    </>
  );
}
