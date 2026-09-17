import type {ReactNode} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {beforeEach, describe, expect, it, vi} from "vitest";
import SettingsSidebar from "@/features/settings/components/settings-sidebar";

const state = vi.hoisted(() => ({
  harnesses: [] as {id: string; name: string}[],
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
  useHarnessLibrary: () => ({data: state.loaded ? {revision: 1, harnesses: state.harnesses, projects: []} : undefined}),
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
      {id: "coding", name: "Coding"},
      {id: "science", name: "Bachelor Thesis"},
    ];
    state.loaded = true;
    state.storedHarnessId = "science";
    state.navigated = [];
    state.selected = [];
  });

  it("shows two flat groups: the App pages, then the pages of the harness in the URL", () => {
    const html = renderToStaticMarkup(<SettingsSidebar activeHarnessId="science" activePage="agents" />);
    expect(rows(html)).toEqual([
      "/",
      "/settings/general",
      "/settings/appearance",
      "/settings/providers",
      "/settings/harnesses",
      "/settings/about",
      "/settings/harness/science/overview",
      "/settings/harness/science/instructions",
      "/settings/harness/science/agents",
      "/settings/harness/science/skills",
      "/settings/harness/science/workflows",
      "/settings/harness/science/projects",
      "/settings/harness/science/curator",
    ]);
    expect(html).toMatch(/aria-current="page"[^>]*href="\/settings\/harness\/science\/agents"/);
    expect(html).not.toMatch(/aria-current="page"[^>]*href="\/settings\/general"/);
    // The harness pages are never nested under a collapsible library node.
    expect(html).not.toContain("aria-expanded");
  });

  it("names the open harness on the switcher and lists every harness plus the library behind it", () => {
    const html = renderToStaticMarkup(<SettingsSidebar activeHarnessId="science" activePage="overview" />);
    expect(html).toMatch(/aria-label="Switch harness"[^>]*>[\s\S]*Bachelor Thesis/);
    expect(html).toContain(">Coding<");
    expect(html).toContain("Manage harnesses…");
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
