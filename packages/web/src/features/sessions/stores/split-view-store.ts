import {create} from "zustand";

/** Chats visible at once, including the routed chat. */
export const MAX_CHAT_PANES = 3;
/** Secondary panes the routed chat can be split with. */
export const MAX_SPLIT_PANES = MAX_CHAT_PANES - 1;
export const DEFAULT_SPLIT_PANE_WIDTH = 460;
export const MIN_SPLIT_PANE_WIDTH = 320;
export const MAX_SPLIT_PANE_WIDTH = 900;

/** One chat opened beside the routed chat. */
export interface SplitViewPane {
  readonly sessionId: string;
  readonly width: number;
}

interface SplitViewState {
  /** Secondary chats, ordered left to right after the routed chat. */
  readonly panes: readonly SplitViewPane[];
  readonly closeAllPanes: () => void;
  readonly closePane: (sessionId: string) => void;
  readonly openPane: (sessionId: string) => void;
  readonly setPaneWidth: (sessionId: string, width: number) => void;
}

/** Keeps a split pane within the widths the chat layout can still render. */
function clampPaneWidth(width: number): number {
  return Math.min(Math.max(Math.round(width), MIN_SPLIT_PANE_WIDTH), MAX_SPLIT_PANE_WIDTH);
}

export const useSplitViewStore = create<SplitViewState>()((set) => ({
  panes: [],
  closeAllPanes: () => {
    set((state) => (state.panes.length === 0 ? state : {panes: []}));
  },
  closePane: (sessionId) => {
    set((state) => {
      const panes = state.panes.filter((pane) => pane.sessionId !== sessionId);
      return panes.length === state.panes.length ? state : {panes};
    });
  },
  openPane: (sessionId) => {
    set((state) => {
      // One chat belongs to one pane, and the routed chat already owns the first.
      if (sessionId.length === 0 || state.panes.length >= MAX_SPLIT_PANES) return state;
      if (state.panes.some((pane) => pane.sessionId === sessionId)) return state;

      return {panes: [...state.panes, {sessionId, width: DEFAULT_SPLIT_PANE_WIDTH}]};
    });
  },
  setPaneWidth: (sessionId, width) => {
    set((state) => {
      const clampedWidth = clampPaneWidth(width);
      const panes = state.panes.map((pane) => (pane.sessionId === sessionId ? {...pane, width: clampedWidth} : pane));
      return panes.some((pane, index) => pane !== state.panes[index]) ? {panes} : state;
    });
  },
}));
