import {create} from "zustand";
import {persist} from "zustand/middleware";

/** The harness the app is on: the stored choice while the library still has it, otherwise the first harness. */
export function activeHarness<T extends {id: string}>(harnesses: readonly T[], storedId?: string): T | undefined {
  return harnesses.find((harness) => harness.id === storedId) ?? harnesses[0];
}

/** Stores navigation only; executable harness configuration remains on the server. A fresh profile has no choice yet. */
export const useHarnessNavigationStore = create<{
  activeHarnessId?: string;
  activeProjectId?: string;
  selectHarness: (id: string) => void;
  selectProject: (harnessId: string, projectId?: string) => void;
}>()(
  persist(
    (set) => ({
      selectHarness: (activeHarnessId) => set({activeHarnessId, activeProjectId: undefined}),
      selectProject: (activeHarnessId, activeProjectId) => set({activeHarnessId, activeProjectId}),
    }),
    {name: "pi-plus-harness-navigation"}
  )
);
