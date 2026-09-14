import {create} from "zustand";
import {persist} from "zustand/middleware";

interface WorkspaceMapState {
  orbitDensity: "compact" | "balanced";
  orbitMotion: boolean;
  setOrbitDensity: (density: "compact" | "balanced") => void;
  setOrbitMotion: (moving: boolean) => void;
  sidebarDetail: boolean;
  readAt: Record<string, string>;
  requested?: {sessionId: string; nodeId?: string; nonce: number};
  setSidebarDetail: (sidebarDetail: boolean) => void;
  markRead: (id: string, at: string) => void;
  requestFocus: (sessionId: string, nodeId?: string) => void;
  consumeFocus: () => void;
}

/** Preferences persist; opening a map remains an explicit action for this chat visit. */
export const useWorkspaceMapStore = create<WorkspaceMapState>()(
  persist(
    (set) => ({
      orbitDensity: "balanced",
      orbitMotion: true,
      setOrbitDensity: (orbitDensity) => set({orbitDensity}),
      setOrbitMotion: (orbitMotion) => set({orbitMotion}),
      sidebarDetail: false,
      readAt: {},
      setSidebarDetail: (sidebarDetail) => set({sidebarDetail}),
      markRead: (id, at) => set((state) => ({readAt: {...state.readAt, [id]: state.readAt[id] && state.readAt[id]! > at ? state.readAt[id]! : at}})),
      requestFocus: (sessionId, nodeId) => set({requested: {sessionId, nodeId, nonce: Date.now()}}),
      consumeFocus: () => set({requested: undefined}),
    }),
    {
      name: "radian-workspace-map",
      partialize: ({orbitDensity, orbitMotion, sidebarDetail, readAt}) => ({orbitDensity, orbitMotion, sidebarDetail, readAt}),
    }
  )
);
