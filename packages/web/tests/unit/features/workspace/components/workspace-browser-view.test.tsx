import {renderToStaticMarkup} from "react-dom/server";
import {beforeEach, describe, expect, it} from "vitest";
import WorkspaceBrowserView from "@/features/workspace/components/workspace-browser-view";
import {useWorkspacePanelStore} from "@/features/workspace/stores/workspace-panel-store";

describe("workspace browser", () => {
  beforeEach(() => useWorkspacePanelStore.setState({browserUrl: "https://pi.dev/docs"}));

  it("uses the native desktop browser surface instead of Electron's unstable webview tag", () => {
    const html = renderToStaticMarkup(<WorkspaceBrowserView appEnvironment="mac" />);

    expect(html).toContain('aria-label="Browser page"');
    expect(html).not.toContain("<webview");
    expect(html).not.toContain("<iframe");
  });

  it("keeps the sandboxed iframe fallback for the hosted web app", () => {
    const html = renderToStaticMarkup(<WorkspaceBrowserView appEnvironment="web" />);

    expect(html).toContain('<iframe class="size-full border-0"');
    expect(html).toContain('sandbox="allow-forms allow-popups allow-same-origin allow-scripts"');
  });
});
