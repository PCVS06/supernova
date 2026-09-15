import {create} from "zustand";
import type {DesktopServerState} from "@supernova/contracts/desktop/api";

/** Connection state is separate from agent progress; losing a socket does not prove work stopped. */
export const useConnectionStore = create<{
  status: "connecting" | "connected" | "reconnecting";
  server: DesktopServerState | null;
  setStatus: (status: "connecting" | "connected" | "reconnecting") => void;
  setServer: (server: DesktopServerState) => void;
}>()((set) => ({
  status: "connecting",
  server: null,
  setStatus: (status) => set({status}),
  setServer: (server) => set((current) => (current.server && current.server.revision > server.revision ? current : {server})),
}));
