import type {ReactNode} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {beforeEach, describe, expect, it, vi} from "vitest";
import SettingsSidebar from "@/features/settings/components/settings-sidebar";

interface SidebarHarness {
  id: string;
  name: string;
  agents: {name: string; description: string}[];
  workflows: {id: string; name: string; description: string}[];
}

const state = vi.hoisted(() => ({
  harnesses: [] as SidebarHarness[],
  projects: [] as {id: string; harnessId: string; name: string; path: string}[],
  loaded: true,
  storedHarnessId: undefined as string | undefined,
  navigated: [] as unknown[],
  selected: [] as string[],
}));

function MockLink(props: {
  readonly "aria-current"?: string;
  readonly children: ReactNode;
  readonly className?: string;
  readonly params?: Record<string, string>;
  readonly to: string;
}) {
  const {children, className, params, to} = props;
  const href = Object.entries(params ?? {}).reduce((current, [key, value]) => current.replace(`$${key}`, value), to);

  return (
    <a aria-current={props["aria-current"] as "page" | undefined} className={className} href={href}>
      {children}
    </a>
  );
}

vi.mock("@tanstack/react-router", () => ({
  Link: MockLink,
  useNavigate: () => (options: unknown) => {
    state.navigated.push(options);
  },
}));
vi.mock("@/components/brand/radian-brand", () => ({default: () => <div>Radian</div>}));
vi.mock("@/components/ui/menu", () => ({
  default: (props: {children: ReactNode; trigger: (triggerProps: {readonly "aria-label": string}) => ReactNode; triggerLabel: string}) => (
    <>
      {props.trigger({"aria-label": props.triggerLabel})}
      <div role="menu">{props.children}</div>
    </>
  ),
  MenuItem: (props: {children: ReactNode; onClick?: () => void}) => (
    <button role="menuitem" type="button" onClick={props.onClick}>
      {props.children}
    </button>
  ),
  MenuLabel: (props: {children: ReactNode}) => <div>{props.children}</div>,
}));
vi.mock("@/features/harnesses/hooks/api/use-harnesses", () => ({
  useHarnessLibrary: () => ({data: state.loaded ? {revision: 1, harnesses: state.harnesses, projects: state.projects} : undefined}),
}));
vi.mock("@/features/harnesses/stores/harness-navigation-store", () => ({
  activeHarness: (harnesses: readonly {id: string}[], storedId?: string) => harnesses.find((harness) => harness.id === storedId) ?? harnesses[0],
  useHarnessNavigationStore: (select: (store: Record<string, unknown>) => unknown) =>
    select({
      activeHarnessId: state.storedHarnessId,
      selectHarness: (id: string) => {
        state.selected.push(id);
      },
    }),
}));

const rows = (html: string): string[] => Array.from(html.matchAll(/<a [^>]*href="([^"]+)"/g), (match) => match[1]!);

describe("settings sidebar", () => {
  beforeEach(() => {
    state.harnesses = [
      {id: "coding", name: "Coding", agents: [], workflows: []},
      {
        id: "science",
        name: "Bachelor Thesis",
        agents: [
          {name: "academic-editor", description: "Revises German academic text"},
          {name: "data-steward", description: "Audits inputs"},
        ],
        workflows: [{id: "review", name: "Literature review", description: "Scoped discovery"}],
      },
    ];
    state.projects = [{id: "lab", harnessId: "science", name: "MES Thesis Lab", path: "/thesis"}];
    state.loaded = true;
    state.storedHarnessId = "science";
    state.navigated = [];
    state.selected = [];
  });

  it("shows two flat groups: the App pages, then the pages of the harness in the URL with the library last", () => {
    const html = renderToStaticMarkup(<SettingsSidebar activeHarnessId="science" activePage="agents" />);
    expect(rows(html)).toEqual([
      "/",
      "/settings/general",
      "/settings/appearance",
      "/settings/providers",
      "/settings/about",
      "/settings/harness/science/overview",
      "/settings/harness/science/instructions",
      "/settings/harness/science/agents",
      "/settings/harness/science/skills",
      "/settings/harness/science/workflows",
      "/settings/harness/science/projects",
      "/settings/harness/science/curator",
      "/settings/harnesses",
    ]);
    expect(html).toContain('aria-label="Search settings"');
    expect(html).toMatch(/aria-current="page"[^>]*href="\/settings\/harness\/science\/agents"/);
    expect(html).not.toMatch(/aria-current="page"[^>]*href="\/settings\/general"/);
    // The harness pages are never nested under a collapsible library node.
    expect(html).not.toContain("aria-expanded");
  });

  it("names the open harness on the switcher, lists every harness behind it, and counts its collections", () => {
    const html = renderToStaticMarkup(<SettingsSidebar activeHarnessId="science" activePage="overview" />);
    expect(html).toMatch(/aria-label="Switch harness"[^>]*>[\s\S]*Bachelor Thesis/);
    expect(html).toContain(">Coding<");
    expect(html).toContain(">All harnesses<");
    // Agents 2, Workflows 1, Projects 1: the size of each collection before it is opened.
    expect(html).toMatch(/>Agents<\/span><span[^>]*>2</);
    expect(html).toMatch(/>Workflows<\/span><span[^>]*>1</);
    expect(html).toMatch(/>Projects<\/span><span[^>]*>1</);
  });

  it("shows the harness the app is on while an App page is open and marks that page", () => {
    const html = renderToStaticMarkup(<SettingsSidebar activeSectionId="appearance" />);
    expect(html).toMatch(/aria-current="page"[^>]*href="\/settings\/appearance"/);
    expect(html).toContain('href="/settings/harness/science/overview"');
    expect(html).not.toMatch(/aria-current="page"[^>]*href="\/settings\/harness/);
  });

  it("falls back to the first harness when nothing was chosen and offers to create one when there is none", () => {
    state.storedHarnessId = undefined;
    expect(renderToStaticMarkup(<SettingsSidebar activeSectionId="general" />)).toContain('href="/settings/harness/coding/overview"');

    state.harnesses = [];
    const empty = renderToStaticMarkup(<SettingsSidebar activeSectionId="general" />);
    expect(empty).toContain("Create a harness");
    expect(empty).not.toContain('aria-label="Switch harness"');
    expect(empty).not.toContain("/settings/harness/");
  });
});

describe("settings search", () => {
  it("finds a setting by its name, by another word for it, and an entry of the harness by its name", async () => {
    const {harnessEntrySearchIndex, searchSettings, settingsSearchIndex} = await import("@/features/settings/data/settings-search");
    const entries = [
      ...settingsSearchIndex,
      ...harnessEntrySearchIndex(
        {
          agents: [{name: "academic-editor", description: "Revises German academic text"}],
          workflows: [{id: "review", name: "Literature review", description: "Scoped discovery"}],
        } as never,
        [{id: "lab", harnessId: "science", name: "MES Thesis Lab", path: "/thesis"}] as never
      ),
    ];
    expect(searchSettings(entries, "font")[0]).toMatchObject({where: "Appearance"});
    expect(searchSettings(entries, "api key")[0]).toMatchObject({label: "Tool keys", target: {kind: "app", sectionId: "providers"}});
    expect(searchSettings(entries, "academic")[0]).toMatchObject({label: "Academic editor", target: {kind: "harness", page: "agents", search: {agent: "academic-editor"}}});
    expect(searchSettings(entries, "thesis lab")[0]).toMatchObject({target: {kind: "harness", page: "projects", search: {project: "lab"}}});
    expect(searchSettings(entries, "literature")[0]).toMatchObject({target: {kind: "harness", page: "workflows", search: {workflow: "review"}}});
    expect(searchSettings(entries, "   ")).toEqual([]);
    expect(searchSettings(entries, "zzzz")).toEqual([]);
  });

  it("points every entry at a page that exists", async () => {
    const {settingsSearchIndex} = await import("@/features/settings/data/settings-search");
    const {harnessPages, settingsAppPages} = await import("@/features/settings/data/settings-tree");
    for (const entry of settingsSearchIndex) {
      if (entry.target.kind === "app") expect(settingsAppPages.map((page) => page.id)).toContain(entry.target.sectionId);
      else expect(harnessPages.map((page) => page.id)).toContain(entry.target.page);
    }
  });
});
