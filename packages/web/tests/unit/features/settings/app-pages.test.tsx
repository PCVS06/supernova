import {renderToStaticMarkup} from "react-dom/server";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import AboutSection from "@/features/settings/pages/sections/about-section";
import AppearanceSection from "@/features/settings/pages/sections/appearance-section";
import GeneralSection from "@/features/settings/pages/sections/general-section";
import ProvidersSection from "@/features/settings/pages/sections/providers-section";
import {useAppearanceStore} from "@/features/settings/stores/appearance-store";

vi.mock("@/features/settings/hooks/api/providers/use-list-providers", () => ({
  useListProviders: () => ({data: [], error: undefined, isPending: false, refetch: vi.fn()}),
}));
vi.mock("@/features/settings/hooks/api/providers/use-logout-provider", () => ({useLogoutProvider: () => ({mutateAsync: vi.fn()})}));
vi.mock("@/features/settings/hooks/providers/use-provider-connect-flow", () => ({
  useProviderConnectFlow: () => ({
    chooseMethod: vi.fn(),
    closeDialog: vi.fn(),
    connect: vi.fn(),
    dialogOpen: false,
    handleDialogOpenChangeComplete: vi.fn(),
    loginSession: undefined,
    loginSessionId: undefined,
    pendingAuthType: undefined,
    selectedProvider: undefined,
    startLoginError: undefined,
    view: "method",
  }),
}));
vi.mock("@/features/harnesses/hooks/api/use-harness-resources", () => ({
  useToolCredentials: () => ({
    data: [{id: "search", name: "Web search", fields: [{name: "SEARCH_KEY", label: "Search key", configured: false, optional: false, source: "none"}]}],
    isPending: false,
    isError: false,
  }),
  useSaveToolCredential: () => ({mutateAsync: vi.fn(), reset: vi.fn(), isPending: false}),
}));

/** A browser window: no desktop bridge, so the About page knows only the version and the endpoint. */
function stubBrowser(): void {
  vi.stubGlobal("window", {location: {origin: "http://127.0.0.1:4317"}, open: vi.fn()});
}

/** The desktop bridge, with the update state only reachable through its subscription. */
function stubDesktop(): void {
  vi.stubGlobal("window", {
    location: {origin: "supernova://app"},
    open: vi.fn(),
    desktopApi: {
      appVersion: "9.9.9",
      dataDirectory: "/Users/test/.supernova",
      environment: "mac",
      nightly: true,
      serverUrl: "http://127.0.0.1:52001",
      checkForUpdates: vi.fn(async () => undefined),
      openDirectory: vi.fn(async () => undefined),
      downloadUpdate: vi.fn(async () => undefined),
      getUpdateState: vi.fn(async () => undefined),
      installUpdate: vi.fn(async () => undefined),
      onUpdateState: vi.fn(() => () => undefined),
    },
  });
}

describe("About", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("names the version and the endpoint in the browser", () => {
    stubBrowser();
    const html = renderToStaticMarkup(<AboutSection />);
    expect(html).toContain(__APP_VERSION__);
    expect(html).toContain("http://127.0.0.1:4317");
    expect(html).toContain("Server endpoint");
    expect(html).not.toContain("Release channel");
    expect(html).not.toContain("Check for updates");
    expect(html).not.toContain("Data folder");
  });

  it("adds the channel and an update action in the desktop app", () => {
    stubDesktop();
    const html = renderToStaticMarkup(<AboutSection />);
    expect(html).toContain("9.9.9");
    expect(html).toContain("Release channel");
    expect(html).toContain("Nightly");
    expect(html).toContain("Check for updates");
    expect(html).toContain("http://127.0.0.1:52001");
    expect(html).toContain("Data folder");
    expect(html).toContain("/Users/test/.supernova");
  });
});

describe("Providers & keys", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("keeps the tool credentials on the page and says they save at once", () => {
    stubBrowser();
    const html = renderToStaticMarkup(<ProvidersSection />);
    expect(html).toContain("Tool credentials");
    expect(html).toContain("Connector keys");
    expect(html).toContain("saved as soon as you enter it");
    expect(html).toContain("Search key");
  });
});

describe("General", () => {
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
    vi.stubGlobal("localStorage", localStorage);
    vi.stubGlobal("window", {localStorage});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("owns the workspace behaviour rows next to the checkpoint switches", () => {
    const html = renderToStaticMarkup(<GeneralSection />);
    expect(html).toContain("Git checkpoints");
    expect(html).toContain("Workspace behaviour");
    for (const label of ["Orbital motion", "Orbit detail", "Detailed sidebar activity"]) {
      expect(html).toContain(`aria-label="${label}"`);
    }
  });
});

describe("Appearance", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    useAppearanceStore.setState({resolvedMode: "dark"});
  });

  it("folds the preview away and leaves the moved rows behind", () => {
    const html = renderToStaticMarkup(<AppearanceSection />);
    expect(html).toContain("<details");
    expect(html).not.toContain("<details open");
    expect(html).toContain("Show preview");
    expect(html).not.toContain('aria-label="Orbital motion"');
    expect(html).not.toContain('aria-label="Detailed sidebar activity"');
  });

  it("lists the translucent sidebar and disables it in dark mode", () => {
    const dark = renderToStaticMarkup(<AppearanceSection />);
    expect(useAppearanceStore.getInitialState().resolvedMode).toBe("dark");
    expect(dark).toContain('aria-label="Translucent sidebar"');
    expect(dark).toContain("light mode only");
    expect(dark).toMatch(/aria-disabled="true"[^>]*aria-label="Translucent sidebar"/);
  });

  it("hands the translucent sidebar back in light mode", async () => {
    vi.resetModules();
    vi.doMock("@/features/settings/stores/appearance-store", () => ({
      DEFAULT_CODE_FONT: "monospace",
      DEFAULT_UI_FONT: "sans-serif",
      useAppearanceStore: (select: (state: Record<string, unknown>) => unknown) =>
        select({
          codeFont: undefined,
          fontSmoothing: true,
          mathematicalMotion: "playful",
          mode: "light",
          resolvedMode: "light",
          setCodeFont: vi.fn(),
          setFontSmoothing: vi.fn(),
          setMathematicalMotion: vi.fn(),
          setMode: vi.fn(),
          setThemeId: vi.fn(),
          setTranslucentSidebar: vi.fn(),
          setUiFont: vi.fn(),
          setWhiteGlow: vi.fn(),
          themeId: "pi-retro",
          translucentSidebar: false,
          uiFont: undefined,
          whiteGlow: "balanced",
        }),
    }));
    const {default: LightAppearance} = await import("@/features/settings/pages/sections/appearance-section");
    const light = renderToStaticMarkup(<LightAppearance />);
    expect(light).not.toMatch(/aria-disabled="true"[^>]*aria-label="Translucent sidebar"/);
    expect(light).toContain("show through the sidebar");
    vi.doUnmock("@/features/settings/stores/appearance-store");
    vi.resetModules();
  });
});
