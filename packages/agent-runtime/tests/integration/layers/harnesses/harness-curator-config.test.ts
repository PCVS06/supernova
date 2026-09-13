import {describe, expect, it} from "vitest";
import type {CuratorConfig} from "@supernova/contracts/harnesses/schemas";
import {createDefaultHarness, defaultCuratorConfig, normalizeHarnessHierarchy, validateHarness} from "@supernova/agent-runtime/layers/harnesses/lib/harness-config";

function withCurator(curator: Partial<CuratorConfig>) {
  return {...createDefaultHarness(), curator: {...defaultCuratorConfig(), ...curator}};
}

describe("curator configuration", () => {
  it("offers defaults that apply nothing and spend nothing until switched on", () => {
    expect(defaultCuratorConfig()).toEqual({enabled: false, maxCostUsdPerRun: 0.5, maxCostUsdPerDay: 2, autoApply: {memory: false, planningLog: false}, cooldownDays: 7});
  });

  it("leaves a harness without a curator alone", () => {
    const library = normalizeHarnessHierarchy({revision: 1, harnesses: [createDefaultHarness()], projects: []});

    expect(library.harnesses[0]?.curator).toBeUndefined();
    expect(() => validateHarness(createDefaultHarness())).not.toThrow();
  });

  it("bounds what the curator may spend", () => {
    expect(() => validateHarness(withCurator({enabled: true}))).not.toThrow();
    expect(() => validateHarness(withCurator({maxCostUsdPerRun: 50, maxCostUsdPerDay: 500}))).not.toThrow();
    expect(() => validateHarness(withCurator({maxCostUsdPerRun: 0.001}))).toThrow("between 0.01 and 50 USD");
    expect(() => validateHarness(withCurator({maxCostUsdPerRun: 51, maxCostUsdPerDay: 500}))).toThrow("between 0.01 and 50 USD");
    expect(() => validateHarness(withCurator({maxCostUsdPerDay: 0.05}))).toThrow("between 0.1 and 500 USD");
    expect(() => validateHarness(withCurator({maxCostUsdPerDay: 501}))).toThrow("between 0.1 and 500 USD");
    expect(() => validateHarness(withCurator({maxCostUsdPerRun: 3, maxCostUsdPerDay: 1}))).toThrow("more on one review than on a whole day");
  });

  it("validates the curator's own model effort", () => {
    expect(() => validateHarness(withCurator({execution: {effort: "high"}}))).not.toThrow();
    expect(() => validateHarness(withCurator({execution: {effort: "ludicrous"}}))).toThrow("Unsupported reasoning effort");
  });

  it("takes the sweep time and the quiet window as times of day", () => {
    expect(() => validateHarness(withCurator({dailyAt: "03:30", quietHours: {from: "22:00", to: "07:00"}}))).not.toThrow();
    expect(() => validateHarness(withCurator({dailyAt: "24:00"}))).toThrow("local time of day");
    expect(() => validateHarness(withCurator({dailyAt: "3:30"}))).toThrow("local time of day");
    expect(() => validateHarness(withCurator({dailyAt: "nightly"}))).toThrow("local time of day");
    expect(() => validateHarness(withCurator({quietHours: {from: "22:00", to: "7:00"}}))).toThrow("22:00 to 07:00");
  });

  it("bounds the cooldown to whole days between one and ninety", () => {
    expect(() => validateHarness(withCurator({cooldownDays: 1}))).not.toThrow();
    expect(() => validateHarness(withCurator({cooldownDays: 90}))).not.toThrow();
    expect(() => validateHarness(withCurator({cooldownDays: 0}))).toThrow("between 1 and 90");
    expect(() => validateHarness(withCurator({cooldownDays: 91}))).toThrow("between 1 and 90");
    expect(() => validateHarness(withCurator({cooldownDays: 1.5}))).toThrow("between 1 and 90");
  });
});
