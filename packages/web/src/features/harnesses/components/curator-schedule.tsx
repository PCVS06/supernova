import type {CuratorConfig} from "@supernova/contracts/harnesses/schemas";
import Input from "@/components/ui/input";
import {SettingsGroup, SettingsRow} from "@/features/settings/components/settings-group";
import {defaultCooldownDays, isClockTime} from "@/features/harnesses/lib/curator-config";

const clockHint = "Use HH:MM, such as 21:30.";

/** Empty clears the daily schedule; a nonempty value must be a complete clock time to save. */
function isWritableTime(value: string): boolean {
  return value === "" || isClockTime(value);
}

interface CuratorScheduleProps {
  config: CuratorConfig;
  onChange: (change: Partial<CuratorConfig>) => void;
}

/** When the curator may review on its own, and how long an artefact rests after a decision. */
export default function CuratorSchedule(props: CuratorScheduleProps) {
  const {config, onChange} = props;
  const dailyAt = config.dailyAt ?? "";
  const quiet = {from: config.quietHours?.from ?? "", to: config.quietHours?.to ?? ""};
  const quietValid = (!quiet.from && !quiet.to) || (isClockTime(quiet.from) && isClockTime(quiet.to));

  return (
    <SettingsGroup title="Schedule">
      <SettingsRow
        control={
          <Input
            aria-label="Daily sweep time"
            className="@xl:w-40"
            inputMode="numeric"
            maxLength={5}
            placeholder="HH:MM"
            value={dailyAt}
            onChange={(event) => onChange({dailyAt: event.target.value})}
          />
        }
        description="Full review of the harness once a day at this local time. Empty means none."
        title="Daily sweep"
      >
        {!isWritableTime(dailyAt) && (
          <p className="text-xs text-danger-ink" role="alert">
            {clockHint}
          </p>
        )}
      </SettingsRow>
      <SettingsRow
        control={
          <div className="flex w-full items-center gap-2 @xl:w-auto">
            <Input
              aria-label="Quiet hours from"
              className="@xl:w-24"
              inputMode="numeric"
              maxLength={5}
              placeholder="HH:MM"
              value={quiet.from}
              onChange={(event) => onChange({quietHours: {...quiet, from: event.target.value}})}
            />
            <span className="text-xs text-ink-faint">to</span>
            <Input
              aria-label="Quiet hours to"
              className="@xl:w-24"
              inputMode="numeric"
              maxLength={5}
              placeholder="HH:MM"
              value={quiet.to}
              onChange={(event) => onChange({quietHours: {...quiet, to: event.target.value}})}
            />
          </div>
        }
        description="No review starts inside this window."
        title="Quiet hours"
      >
        {!quietValid && (
          <p className="text-xs text-danger-ink" role="alert">
            {clockHint}
          </p>
        )}
      </SettingsRow>
      <SettingsRow
        control={
          <Input
            aria-label="Cooldown in days"
            className="@xl:w-40"
            min={0}
            step={1}
            type="number"
            value={config.cooldownDays ?? defaultCooldownDays}
            onChange={(event) => onChange({cooldownDays: Number(event.target.value)})}
          />
        }
        description="Days before an artefact can be proposed against again without newer evidence."
        title="Cooldown"
      />
    </SettingsGroup>
  );
}
