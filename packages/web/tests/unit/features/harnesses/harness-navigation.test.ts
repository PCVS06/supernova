import {beforeEach, describe, expect, it, vi} from "vitest";

type NavigationStore = typeof import("@/features/harnesses/stores/harness-navigation-store");

/** Loads the store against an empty profile, the way a first start reads it. */
async function loadStore(stored?: string): Promise<NavigationStore> {
  const values = new Map<string, string>();
  if (stored) values.set("pi-plus-harness-navigation", JSON.stringify({state: {activeHarnessId: stored}, version: 0}));
  const localStorage = {
    clear: () => values.clear(),
    getItem: (key: string) => values.get(key) ?? null,
    key: (index: number) => Array.from(values.keys())[index] ?? null,
    get length() {
      return values.size;
    },
    removeItem: (key: string) => values.delete(key),
    setItem: (key: string, value: string) => values.set(key, value),
  } satisfies Storage;

  vi.resetModules();
  vi.stubGlobal("localStorage", localStorage);
  return import("@/features/harnesses/stores/harness-navigation-store");
}

const harnesses = [{id: "coding"}, {id: "science"}];

describe("harness navigation", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("opens the first harness of the library when nothing was chosen yet", async () => {
    const {activeHarness, useHarnessNavigationStore} = await loadStore();

    expect(useHarnessNavigationStore.getState().activeHarnessId).toBeUndefined();
    expect(activeHarness(harnesses)?.id).toBe("coding");
    expect(activeHarness([])).toBeUndefined();
  });

  it("keeps the stored choice while the library still has it", async () => {
    const {activeHarness} = await loadStore("science");

    expect(activeHarness(harnesses, "science")?.id).toBe("science");
    expect(activeHarness(harnesses, "gone")?.id).toBe("coding");
  });

  it("remembers the harness a selection names", async () => {
    const {activeHarness, useHarnessNavigationStore} = await loadStore();

    useHarnessNavigationStore.getState().selectProject("science", "lab");

    expect(useHarnessNavigationStore.getState()).toMatchObject({activeHarnessId: "science", activeProjectId: "lab"});
    expect(activeHarness(harnesses, useHarnessNavigationStore.getState().activeHarnessId)?.id).toBe("science");
  });
});
