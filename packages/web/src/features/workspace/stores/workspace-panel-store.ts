import {create} from "zustand";
import {createJSONStorage, persist} from "zustand/middleware";
import {ancestorDirectories} from "@/features/workspace/lib/workspace-paths";

const WORKSPACE_PANEL_STORAGE_KEY = "supernova-workspace-panel-v3";
const DEFAULT_WORKSPACE_PANEL_WIDTH = 288;
const DEFAULT_FILE_WORKSPACE_WIDTH = 760;
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
  readonly activeView: WorkspaceView | null;
  readonly browserUrl: string;
  readonly expandedPaths: readonly string[];
  readonly filter: string;
  readonly pickerVisible: boolean;
  readonly tabs: readonly WorkspaceView[];
  readonly target: WorkspaceTarget | null;
  readonly visible: boolean;
  readonly width: number;
  readonly closeView: (view: WorkspaceView) => void;
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
}

export const useWorkspacePanelStore = create<WorkspacePanelState>()(
  persist(
    (set) => ({
      activeFilePath: null,
      activeView: null,
      browserUrl: DEFAULT_BROWSER_URL,
      expandedPaths: [],
      filter: "",
      pickerVisible: true,
      tabs: [],
      target: null,
      visible: false,
      width: DEFAULT_WORKSPACE_PANEL_WIDTH,
      closeView: (view) => {
        set((state) => {
          const closedIndex = state.tabs.indexOf(view);
          if (closedIndex === -1) return state;

          const tabs = state.tabs.filter((item) => item !== view);
          if (tabs.length === 0) {
            return {
              activeFilePath: view === "files" ? null : state.activeFilePath,
              activeView: null,
              pickerVisible: true,
              tabs,
              visible: false,
              width: DEFAULT_WORKSPACE_PANEL_WIDTH,
            };
          }

          return {
            activeFilePath: view === "files" ? null : state.activeFilePath,
            activeView: state.activeView === view ? (tabs[Math.min(closedIndex, tabs.length - 1)] ?? null) : state.activeView,
            pickerVisible: false,
            tabs,
          };
        });
      },
      openFile: (path) => {
        set((state) => ({
          activeFilePath: path,
          activeView: "files",
          expandedPaths: [...new Set([...state.expandedPaths, ...ancestorDirectories(path)])],
          pickerVisible: false,
          tabs: state.tabs.includes("files") ? state.tabs : [...state.tabs, "files"],
          visible: true,
          width: Math.max(state.width, DEFAULT_FILE_WORKSPACE_WIDTH),
        }));
      },
      openView: (view) => {
        set((state) => ({activeView: view, pickerVisible: false, tabs: state.tabs.includes(view) ? state.tabs : [...state.tabs, view], visible: true}));
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
        set((state) => ({
          activeFilePath: path,
          activeView: "files",
          pickerVisible: false,
          tabs: state.tabs.includes("files") ? state.tabs : [...state.tabs, "files"],
          visible: true,
        }));
      },
      setTarget: (target) => {
        set((state) => {
          if (state.target?.sessionId === target.sessionId && state.target.projectPath === target.projectPath) return state;
          // A different project has a different tree, so revealed paths and the
          // selected file belong to the chat that was replaced.
          const sameProject = state.target?.projectPath === target.projectPath;
          return sameProject ? {target} : {activeFilePath: null, expandedPaths: [], filter: "", target};
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
        set((state) => ({pickerVisible: state.visible ? state.pickerVisible : state.tabs.length === 0 || state.pickerVisible, visible: !state.visible}));
      },
    }),
    {
      name: WORKSPACE_PANEL_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        activeView: state.activeView,
        browserUrl: state.browserUrl,
        pickerVisible: state.pickerVisible,
        tabs: state.tabs,
        visible: state.visible,
        width: state.width,
      }),
    }
  )
);
