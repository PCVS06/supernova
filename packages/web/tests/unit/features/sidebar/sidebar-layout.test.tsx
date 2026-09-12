import {renderToStaticMarkup} from "react-dom/server";
import {describe, expect, it, vi} from "vitest";
import SidebarLayout from "@/features/sidebar/components/sidebar-layout";

vi.mock("@/features/settings/stores/appearance-store", () => ({
  useAppearanceStore: (select: (state: {readonly translucentSidebar: boolean}) => unknown) => select({translucentSidebar: true}),
}));

describe("sidebar layout surfaces", () => {
  it("keeps the workspace black while desktop chrome uses the glass treatment", () => {
    const html = renderToStaticMarkup(
      <SidebarLayout appEnvironment="mac" sidebar={<div>Sidebar</div>} sidebarWidth={280} titlebarActions={<button type="button">Toggle</button>}>
        <div>Workspace</div>
      </SidebarLayout>
    );

    expect(html).toContain("app-glass-chrome");
    expect(html).toContain("bg-surface");
  });
});
