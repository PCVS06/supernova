import type {CuratorConfig} from "@supernova/contracts/harnesses/schemas";

/** What a curator starts as: off, cheap, and allowed to apply nothing by itself. */
export const defaultCuratorConfig: CuratorConfig = {enabled: false, maxCostUsdPerRun: 0.5, maxCostUsdPerDay: 2, autoApply: {memory: false, planningLog: false}};

/** The first edit of an unconfigured curator writes a complete record, so a half configuration is never saved. */
export function curatorConfigPatch(current: CuratorConfig | undefined, change: Partial<CuratorConfig>): CuratorConfig {
  return {
    ...defaultCuratorConfig,
    ...current,
    ...change,
    autoApply: {...defaultCuratorConfig.autoApply, ...current?.autoApply, ...change.autoApply},
  };
}
