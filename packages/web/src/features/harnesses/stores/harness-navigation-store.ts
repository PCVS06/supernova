import {create} from "zustand";
import {persist} from "zustand/middleware";

/** Stores navigation only; executable harness configuration remains on the server. */
export const useHarnessNavigationStore = create<{
  activeHarnessId: string;
  activeProjectId?: string;
  selectHarness: (id: string) => void;
  selectProject: (harnessId: string, projectId?: string) => void;
}>()(
  persist(
    (set) => ({
      activeHarnessId: "science",
      selectHarness: (activeHarnessId) => set({activeHarnessId, activeProjectId: undefined}),
      selectProject: (activeHarnessId, activeProjectId) => set({activeHarnessId, activeProjectId}),
    }),
    {name: "pi-plus-harness-navigation"}
  )
);
