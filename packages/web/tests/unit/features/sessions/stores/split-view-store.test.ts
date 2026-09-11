import {beforeEach, describe, expect, it} from "vitest";
import {DEFAULT_SPLIT_PANE_WIDTH, MAX_SPLIT_PANES, useSplitViewStore} from "@/features/sessions/stores/split-view-store";

function openPanes(...sessionIds: readonly string[]): void {
  for (const sessionId of sessionIds) useSplitViewStore.getState().openPane(sessionId);
}

function paneSessionIds(): readonly string[] {
  return useSplitViewStore.getState().panes.map((pane) => pane.sessionId);
}

describe("split view store", () => {
  beforeEach(() => {
    useSplitViewStore.setState({panes: []});
  });

  it("opens a chat beside the routed one at the default width", () => {
    openPanes("chat-2");

    expect(useSplitViewStore.getState().panes).toEqual([{sessionId: "chat-2", width: DEFAULT_SPLIT_PANE_WIDTH}]);
  });

  it("keeps one pane per chat", () => {
    openPanes("chat-2", "chat-2");

    expect(paneSessionIds()).toEqual(["chat-2"]);
  });

  it("refuses a fourth chat because the routed chat owns the first pane", () => {
    openPanes("chat-2", "chat-3", "chat-4");

    expect(paneSessionIds()).toEqual(["chat-2", "chat-3"]);
    expect(useSplitViewStore.getState().panes).toHaveLength(MAX_SPLIT_PANES);
  });

  it("closes only the pane that was closed", () => {
    openPanes("chat-2", "chat-3");

    useSplitViewStore.getState().closePane("chat-2");

    expect(paneSessionIds()).toEqual(["chat-3"]);
  });

  it("closes every pane at once", () => {
    openPanes("chat-2", "chat-3");

    useSplitViewStore.getState().closeAllPanes();

    expect(paneSessionIds()).toEqual([]);
  });

  it("resizes one pane and clamps widths the layout cannot render", () => {
    openPanes("chat-2", "chat-3");

    useSplitViewStore.getState().setPaneWidth("chat-2", 640);
    useSplitViewStore.getState().setPaneWidth("chat-3", 20);

    expect(useSplitViewStore.getState().panes[0]).toEqual({sessionId: "chat-2", width: 640});
    expect(useSplitViewStore.getState().panes[1]?.width).toBeGreaterThanOrEqual(300);

    useSplitViewStore.getState().setPaneWidth("chat-3", 4_000);

    expect(useSplitViewStore.getState().panes[1]?.width).toBeLessThanOrEqual(900);
  });

  it("ignores a width for a chat without a pane", () => {
    openPanes("chat-2");

    useSplitViewStore.getState().setPaneWidth("chat-9", 700);

    expect(useSplitViewStore.getState().panes).toEqual([{sessionId: "chat-2", width: DEFAULT_SPLIT_PANE_WIDTH}]);
  });
});
