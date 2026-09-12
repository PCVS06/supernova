import {beforeEach, describe, expect, it} from "vitest";
import {useWorkspacePanelStore} from "@/features/workspace/stores/workspace-panel-store";

describe("workspace panel store", () => {
  beforeEach(() => {
    useWorkspacePanelStore.setState({
      activeFilePath: null,
      expandedPaths: [],
      filter: "",
      openFilePaths: [],
      pickerVisible: true,
      target: null,
      view: "files",
      visible: false,
      width: 288,
    });
  });

  it("opens several file tabs without changing the panel width", () => {
    useWorkspacePanelStore.getState().openFile("src/first.ts");
    useWorkspacePanelStore.getState().openFile("src/second.ts");

    const state = useWorkspacePanelStore.getState();
    expect(state.openFilePaths).toEqual(["src/first.ts", "src/second.ts"]);
    expect(state.activeFilePath).toBe("src/second.ts");
    expect(state.width).toBe(288);
  });

  it("returns to the nearest remaining tab when the active file closes", () => {
    useWorkspacePanelStore.getState().openFile("src/first.ts");
    useWorkspacePanelStore.getState().openFile("src/second.ts");

    useWorkspacePanelStore.getState().closeFile("src/second.ts");
    expect(useWorkspacePanelStore.getState().activeFilePath).toBe("src/first.ts");

    useWorkspacePanelStore.getState().closeFile("src/first.ts");
    expect(useWorkspacePanelStore.getState().activeFilePath).toBeNull();
    expect(useWorkspacePanelStore.getState().openFilePaths).toEqual([]);
  });

  it("reopens the last panel content instead of resetting its view", () => {
    useWorkspacePanelStore.getState().openView("context");
    useWorkspacePanelStore.getState().closePanel();
    useWorkspacePanelStore.getState().togglePanel();

    const state = useWorkspacePanelStore.getState();
    expect(state.visible).toBe(true);
    expect(state.pickerVisible).toBe(false);
    expect(state.view).toBe("context");
  });
});
