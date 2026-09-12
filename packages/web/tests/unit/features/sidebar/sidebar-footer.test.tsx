import type {ComponentProps, ReactNode} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {beforeEach, describe, expect, it, vi} from "vitest";
import type IconButton from "@/components/ui/icon-button";
import SidebarFooter from "@/features/sidebar/components/sidebar-footer";

const state = vi.hoisted(() => ({resolvedMode: "dark" as "dark" | "light", setMode: vi.fn()}));
const buttons = vi.hoisted(() => new Map<string, ComponentProps<typeof IconButton>>());

vi.mock("@tanstack/react-router", () => ({
  Link: (props: {readonly "aria-label"?: string; readonly children: ReactNode; readonly className?: string; readonly to: string}) => (
    <a aria-label={props["aria-label"]} className={props.className} href={props.to}>
      {props.children}
    </a>
  ),
}));
vi.mock("@/features/settings/stores/appearance-store", () => ({
  useAppearanceStore: (select: (value: typeof state) => unknown) => select(state),
}));
vi.mock("@/components/ui/icon-button", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/components/ui/icon-button")>();
  return {
    ...original,
    default: (props: ComponentProps<typeof IconButton>) => {
      buttons.set(props.label, props);
      return <original.default {...props} />;
    },
  };
});

describe("sidebar footer", () => {
  beforeEach(() => {
    state.resolvedMode = "dark";
    state.setMode.mockReset();
    buttons.clear();
  });

  it("keeps Settings, theme, and help as quiet icon-only actions", () => {
    const html = renderToStaticMarkup(<SidebarFooter settingsActive={false} />);

    expect(html).toContain('aria-label="Open settings"');
    expect(html).toContain('aria-label="Use light theme"');
    expect(html).toContain('aria-label="Open help"');
    expect(html).toContain("ui-icon");
    expect(html).not.toContain(">Settings<");
    buttons.get("Use light theme")!.onClick?.({} as never);
    expect(state.setMode).toHaveBeenCalledExactlyOnceWith("light");
  });
});
