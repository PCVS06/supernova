import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

const storageKey = "supernova-appearance";

describe("appearance upgrade", () => {
  beforeEach(() => {
    const values = new Map<string, string>();
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
    vi.stubGlobal("window", {
      localStorage,
      matchMedia: () => ({addEventListener: vi.fn(), matches: false}),
    });
    vi.stubGlobal("document", {
      documentElement: {dataset: {}, style: {removeProperty: vi.fn(), setProperty: vi.fn()}},
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("starts dark and opaque even on a light operating system", async () => {
    const {initializeAppearance, useAppearanceStore} = await import("@/features/settings/stores/appearance-store");
    initializeAppearance();
    expect(useAppearanceStore.getState()).toMatchObject({mode: "dark", resolvedMode: "dark", themeId: "pi-retro", translucentSidebar: false});
  });

  it("upgrades the old appearance once while preserving custom fonts and unrelated storage", async () => {
    const projects = JSON.stringify({state: {projects: [{id: "existing-project"}]}, version: 0});
    localStorage.setItem("supernova-projects", projects);
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        state: {mode: "system", themeId: "supernova", translucentSidebar: true, codeFont: "Menlo", uiFont: "Inter", fontSmoothing: false},
        version: 0,
      })
    );

    const {useAppearanceStore} = await import("@/features/settings/stores/appearance-store");
    expect(useAppearanceStore.getState()).toMatchObject({
      mode: "dark",
      themeId: "pi-retro",
      translucentSidebar: false,
      codeFont: "Menlo",
      uiFont: "Inter",
      fontSmoothing: false,
    });
    expect(JSON.parse(localStorage.getItem(storageKey) ?? "{}").version).toBe(1);
    expect(localStorage.getItem("supernova-projects")).toBe(projects);
  });

  it("keeps a later appearance choice after reloading", async () => {
    const {useAppearanceStore} = await import("@/features/settings/stores/appearance-store");
    useAppearanceStore.getState().setMode("light");
    useAppearanceStore.getState().setTranslucentSidebar(true);

    vi.resetModules();
    const reloaded = await import("@/features/settings/stores/appearance-store");
    reloaded.initializeAppearance();
    expect(reloaded.useAppearanceStore.getState()).toMatchObject({mode: "light", resolvedMode: "light", translucentSidebar: true});
  });
});
