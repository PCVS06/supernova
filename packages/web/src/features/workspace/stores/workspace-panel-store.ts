import {create} from "zustand";
import {createJSONStorage, persist} from "zustand/middleware";
import {ancestorDirectories} from "@/features/workspace/lib/workspace-paths";

const WORKSPACE_PANEL_STORAGE_KEY = "supernova-workspace-panel-v2";
const DEFAULT_WORKSPACE_PANEL_WIDTH = 288;
const MIN_WORKSPACE_PANEL_WIDTH = 240;
const MAX_WORKSPACE_PANEL_WIDTH = 900;
const DEFAULT_BROWSER_URL = "https://pi.dev/docs";

export type WorkspaceView = "browser" | "context" | "files" | "terminal";

/** The chat whose project the panel browses and whose composer receives file references. */
export interface WorkspaceTarget {
  readonly projectPath: string;
  readonly sessionId: string;
}

interface WorkspacePanelState {
  readonly activeFilePath: string | null;
  readonly browserUrl: string;
  readonly expandedPaths: readonly string[];
  readonly filter: string;
  readonly openFilePaths: readonly string[];
  readonly pickerVisible: boolean;
  readonly target: WorkspaceTarget | null;
  readonly view: WorkspaceView;
  readonly visible: boolean;
  readonly width: number;
  readonly closeFile: (path: string) => void;
  readonly closePanel: () => void;
  readonly openFile: (path: string) => void;
  readonly openView: (view: WorkspaceView) => void;
  readonly showViewPicker: () => void;
  readonly setBrowserUrl: (url: string) => void;
  readonly setFilter: (filter: string) => void;
  readonly selectFile: (path: string | null) => void;
  readonly setTarget: (target: WorkspaceTarget) => void;
  readonly setWidth: (width: number) => void;
  readonly toggleDirectory: (path: string) => void;
  readonly togglePanel: () => void;
  readonly toggleView: (view: WorkspaceView) => void;
}

export const useWorkspacePanelStore = create<WorkspacePanelState>()(
  persist(
    (set) => ({
      activeFilePath: null,
      browserUrl: DEFAULT_BROWSER_URL,
      expandedPaths: [],
      filter: "",
      openFilePaths: [],
      pickerVisible: true,
      target: null,
      view: "files",
      visible: false,
      width: DEFAULT_WORKSPACE_PANEL_WIDTH,
      closeFile: (path) => {
        set((state) => {
          const closedIndex = state.openFilePaths.indexOf(path);
          if (closedIndex === -1) return state;

          const openFilePaths = state.openFilePaths.filter((item) => item !== path);
          const activeFilePath = state.activeFilePath === path ? (openFilePaths[Math.min(closedIndex, openFilePaths.length - 1)] ?? null) : state.activeFilePath;
          return {activeFilePath, openFilePaths};
        });
      },
      closePanel: () => {
        set({visible: false});
      },
      openFile: (path) => {
        set((state) => ({
          activeFilePath: path,
          expandedPaths: [...new Set([...state.expandedPaths, ...ancestorDirectories(path)])],
          openFilePaths: state.openFilePaths.includes(path) ? state.openFilePaths : [...state.openFilePaths, path],
          pickerVisible: false,
          view: "files",
          visible: true,
        }));
      },
      openView: (view) => {
        set(view === "files" ? {activeFilePath: null, pickerVisible: false, view, visible: true} : {pickerVisible: false, view, visible: true});
      },
      showViewPicker: () => {
        set({pickerVisible: true, visible: true});
      },
      setBrowserUrl: (browserUrl) => {
        set({browserUrl});
      },
      setFilter: (filter) => {
        set({filter});
      },
      selectFile: (path) => {
        set((state) => {
          if (path !== null && !state.openFilePaths.includes(path)) return state;
          return {activeFilePath: path, pickerVisible: false, view: "files", visible: true};
        });
      },
      setTarget: (target) => {
        set((state) => {
          if (state.target?.sessionId === target.sessionId && state.target.projectPath === target.projectPath) return state;
          // A different project has a different tree, so the revealed paths and
          // the open file belong to the chat that was replaced.
          const sameProject = state.target?.projectPath === target.projectPath;
          return sameProject ? {target} : {activeFilePath: null, expandedPaths: [], filter: "", openFilePaths: [], target};
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
      togglePanel: () => {
        set((state) => ({visible: !state.visible}));
      },
      toggleView: (view) => {
        set((state) => (state.visible && !state.pickerVisible && state.view === view ? {visible: false} : {pickerVisible: false, view, visible: true}));
      },
    }),
    {
      name: WORKSPACE_PANEL_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({browserUrl: state.browserUrl, view: state.view, visible: state.visible, width: state.width}),
    }
  )
);
