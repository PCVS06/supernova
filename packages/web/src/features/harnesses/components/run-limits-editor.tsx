import type {HarnessConfig} from "@supernova/contracts/harnesses/schemas";
import Input from "@/components/ui/input";
import {SettingsGroup, SettingsRow} from "@/features/settings/components/settings-group";

interface RunLimitsEditorProps {
  harness: HarnessConfig;
  onChange: (change: Pick<HarnessConfig, "loop">) => void;
}

/** The ceiling every agent run of this harness works under, unless a workflow step lowers it. */
export default function RunLimitsEditor(props: RunLimitsEditorProps) {
  const {harness, onChange} = props;
  const loop = harness.loop;

  return (
    <SettingsGroup title="Run limits">
      <SettingsRow
        control={
          <Input
            aria-label="Maximum turns"
            className="sm:w-40"
            type="number"
            min={1}
            max={100}
            value={loop.maxTurns}
            onChange={(event) => onChange({loop: {...loop, maxTurns: Number(event.target.value)}})}
          />
        }
        description="How many times an agent may think and act before the run stops."
        title="Maximum turns"
      />
      <SettingsRow
        control={
          <Input
            aria-label="Timeout in seconds"
            className="sm:w-40"
            type="number"
            min={10}
            max={3600}
            value={loop.timeoutSeconds}
            onChange={(event) => onChange({loop: {...loop, timeoutSeconds: Number(event.target.value)}})}
          />
        }
        description="A single run never outlives this budget; a workflow step may lower it, never raise it."
        title="Timeout in seconds"
      />
    </SettingsGroup>
  );
}
