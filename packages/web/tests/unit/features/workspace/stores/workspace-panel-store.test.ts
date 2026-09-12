import {beforeEach, describe, expect, it} from "vitest";
import {useWorkspacePanelStore} from "@/features/workspace/stores/workspace-panel-store";

describe("workspace panel store", () => {
  beforeEach(() => {
    useWorkspacePanelStore.setState({
      activeFilePath: null,
      activeView: null,
      expandedPaths: [],
      filter: "",
      pickerVisible: true,
      target: null,
      tabs: [],
      visible: false,
      width: 288,
    });
  });

  it("keeps different workspace types as tabs and reuses an existing type", () => {
    useWorkspacePanelStore.getState().openView("files");
    useWorkspacePanelStore.getState().openView("browser");
    useWorkspacePanelStore.getState().openView("files");

    const state = useWorkspacePanelStore.getState();
    expect(state.tabs).toEqual(["files", "browser"]);
    expect(state.activeView).toBe("files");
    expect(state.width).toBe(288);
  });

  it("closes a workspace tab and closes the panel when the last tab is gone", () => {
    useWorkspacePanelStore.getState().openView("files");
    useWorkspacePanelStore.getState().openView("context");

    useWorkspacePanelStore.getState().closeView("context");
    expect(useWorkspacePanelStore.getState().tabs).toEqual(["files"]);
    expect(useWorkspacePanelStore.getState().activeView).toBe("files");
    expect(useWorkspacePanelStore.getState().visible).toBe(true);

    useWorkspacePanelStore.getState().closeView("files");
    expect(useWorkspacePanelStore.getState().tabs).toEqual([]);
    expect(useWorkspacePanelStore.getState().activeView).toBeNull();
    expect(useWorkspacePanelStore.getState().visible).toBe(false);
    expect(useWorkspacePanelStore.getState().pickerVisible).toBe(true);
  });

  it("reopens hidden tabs while a closed last tab reopens the picker", () => {
    useWorkspacePanelStore.getState().openView("context");
    useWorkspacePanelStore.getState().togglePanel();
    useWorkspacePanelStore.getState().togglePanel();

    expect(useWorkspacePanelStore.getState()).toMatchObject({activeView: "context", pickerVisible: false, tabs: ["context"], visible: true});

    useWorkspacePanelStore.getState().closeView("context");
    useWorkspacePanelStore.getState().togglePanel();
    expect(useWorkspacePanelStore.getState()).toMatchObject({activeView: null, pickerVisible: true, tabs: [], visible: true, width: 288});
  });

  it("opens a file inside the Files tab and widens the document workspace", () => {
    useWorkspacePanelStore.getState().openView("context");
    useWorkspacePanelStore.getState().openFile("src/first.ts");

    expect(useWorkspacePanelStore.getState()).toMatchObject({activeFilePath: "src/first.ts", activeView: "files", tabs: ["context", "files"], width: 760});
  });
});
