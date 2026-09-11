import {create} from "zustand";
import {createJSONStorage, persist} from "zustand/middleware";
import {ancestorDirectories} from "@/features/workspace/lib/workspace-paths";

const WORKSPACE_PANEL_STORAGE_KEY = "supernova-workspace-panel";
const DEFAULT_WORKSPACE_PANEL_WIDTH = 420;
const MIN_WORKSPACE_PANEL_WIDTH = 300;
const MAX_WORKSPACE_PANEL_WIDTH = 900;
const DEFAULT_BROWSER_URL = "https://pi.dev/docs";

export type WorkspaceView = "browser" | "files";

/** The chat whose project the panel browses and whose composer receives file references. */
export interface WorkspaceTarget {
  readonly projectPath: string;
  readonly sessionId: string;
}

interface WorkspacePanelState {
  readonly browserUrl: string;
  readonly expandedPaths: readonly string[];
  readonly filter: string;
  readonly openFilePath: string | null;
  readonly target: WorkspaceTarget | null;
  readonly view: WorkspaceView;
  readonly visible: boolean;
  readonly width: number;
  readonly closeFile: () => void;
  readonly closePanel: () => void;
  readonly openFile: (path: string) => void;
  readonly setBrowserUrl: (url: string) => void;
  readonly setFilter: (filter: string) => void;
  readonly setTarget: (target: WorkspaceTarget) => void;
  readonly setWidth: (width: number) => void;
  readonly toggleDirectory: (path: string) => void;
  readonly toggleView: (view: WorkspaceView) => void;
}

export const useWorkspacePanelStore = create<WorkspacePanelState>()(
  persist(
    (set) => ({
      browserUrl: DEFAULT_BROWSER_URL,
      expandedPaths: [],
      filter: "",
      openFilePath: null,
      target: null,
      view: "files",
      visible: false,
      width: DEFAULT_WORKSPACE_PANEL_WIDTH,
      closeFile: () => {
        set({openFilePath: null});
      },
      closePanel: () => {
        set({visible: false});
      },
      openFile: (path) => {
        set((state) => ({
          expandedPaths: [...new Set([...state.expandedPaths, ...ancestorDirectories(path)])],
          openFilePath: path,
          view: "files",
          visible: true,
        }));
      },
      setBrowserUrl: (browserUrl) => {
        set({browserUrl});
      },
      setFilter: (filter) => {
        set({filter});
      },
      setTarget: (target) => {
        set((state) => {
          if (state.target?.sessionId === target.sessionId && state.target.projectPath === target.projectPath) return state;
          // A different project has a different tree, so the revealed paths and
          // the open file belong to the chat that was replaced.
          const sameProject = state.target?.projectPath === target.projectPath;
          return sameProject ? {target} : {expandedPaths: [], filter: "", openFilePath: null, target};
        });
      },
      setWidth: (width) => {
        set({width: Math.min(Math.max(Math.round(width), MIN_WORKSPACE_PANEL_WIDTH), MAX_WORKSPACE_PANEL_WIDTH)});
      },
      toggleDirectory: (path) => {
        set((state) => ({
          expandedPaths: state.expandedPaths.includes(path) ? state.expandedPaths.filter((item) => item !== path) : [...state.expandedPaths, path],
        }));
      },
      toggleView: (view) => {
        set((state) => (state.visible && state.view === view ? {visible: false} : {view, visible: true}));
      },
    }),
    {
      name: WORKSPACE_PANEL_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({browserUrl: state.browserUrl, view: state.view, visible: state.visible, width: state.width}),
    }
  )
);
