import {renderToStaticMarkup} from "react-dom/server";
import {describe, expect, it, vi} from "vitest";
import ScienceImport from "@/features/harnesses/components/science-import";

vi.mock("@tanstack/react-router", () => ({useNavigate: () => () => undefined}));
vi.mock("@/features/harnesses/hooks/api/use-harnesses", () => ({
  useImportScienceHarness: () => ({mutate: vi.fn(), isPending: false, error: undefined}),
}));
vi.mock("@/features/harnesses/stores/harness-navigation-store", () => ({
  useHarnessNavigationStore: (select: (store: Record<string, unknown>) => unknown) => select({selectHarness: () => undefined}),
}));

const render = (open: boolean) => renderToStaticMarkup(<ScienceImport open={open} revision={1} onToggle={() => undefined} />);

describe("science import", () => {
  it("starts with empty path fields that only suggest their shape", () => {
    const html = render(true);

    expect(html).toContain('placeholder="~/pi-scientific-tools"');
    expect(html).toContain('placeholder="~/Science-Space"');
    expect(html).not.toContain("~/Developer");
    expect(html.match(/value=""/g)).toHaveLength(2);
    // Nothing can be imported before both folders are named.
    expect(html).toContain('disabled=""');
  });

  it("keeps the fields behind the disclosure until the import is set up", () => {
    const html = render(false);

    expect(html).toContain("Set up import");
    expect(html).not.toContain("placeholder=");
  });
});
