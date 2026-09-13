import type {CuratorConfig} from "@supernova/contracts/harnesses/schemas";

const clockTime = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Days an artefact rests after a decision before it may be proposed against again without newer evidence. */
export const defaultCooldownDays = 7;

/** What a curator starts as: off, cheap, and allowed to apply nothing by itself. */
export const defaultCuratorConfig: CuratorConfig = {
  enabled: false,
  maxCostUsdPerRun: 0.5,
  maxCostUsdPerDay: 2,
  autoApply: {memory: false, planningLog: false},
  cooldownDays: defaultCooldownDays,
};

/** A local wall-clock time written "HH:MM", hours 00–23 and minutes 00–59. */
export function isClockTime(value: string): boolean {
  return clockTime.test(value);
}

/** The first edit of an unconfigured curator writes a complete record, so a half configuration is never saved. */
export function curatorConfigPatch(current: CuratorConfig | undefined, change: Partial<CuratorConfig>): CuratorConfig {
  const {dailyAt, quietHours, ...rest} = {
    ...defaultCuratorConfig,
    ...current,
    ...change,
    autoApply: {...defaultCuratorConfig.autoApply, ...current?.autoApply, ...change.autoApply},
  };

  // An unset schedule is saved as absent, never as empty strings a later read would have to interpret.
  return {...rest, ...(dailyAt ? {dailyAt} : {}), ...(quietHours?.from || quietHours?.to ? {quietHours} : {})};
}
