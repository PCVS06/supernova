import type {DesktopApi, DesktopUpdateState, DesktopServerState} from "@supernova/contracts/desktop/api";
import type {IpcRendererEvent} from "electron";
import {contextBridge, ipcRenderer} from "electron";
import {DESKTOP_IPC_CHANNELS} from "@/ipc";

function readArgument(prefix: string): string | undefined {
  return process.argv.find((argument) => argument.startsWith(prefix))?.slice(prefix.length);
}

const desktopApi = {
  environment: process.platform === "darwin" ? "mac" : process.platform === "win32" ? "windows" : "linux",
  serverUrl: readArgument("--supernova-server-url=") ?? "",
  dataDirectory: readArgument("--supernova-data-directory=") ?? "",
  appVersion: readArgument("--supernova-app-version=") ?? "",
  nightly: process.argv.includes("--supernova-nightly"),
  getServerState: () => ipcRenderer.invoke(DESKTOP_IPC_CHANNELS.getServerState),
  restartServer: () => ipcRenderer.invoke(DESKTOP_IPC_CHANNELS.restartServer),
  onServerState: (listener) => {
    const handler = (_: IpcRendererEvent, state: DesktopServerState): void => listener(state);
    ipcRenderer.on(DESKTOP_IPC_CHANNELS.serverState, handler);
    return () => ipcRenderer.removeListener(DESKTOP_IPC_CHANNELS.serverState, handler);
  },

  openDirectory: (path) => ipcRenderer.invoke(DESKTOP_IPC_CHANNELS.openDirectory, path),
  setNativeTheme: (theme) => ipcRenderer.invoke(DESKTOP_IPC_CHANNELS.setNativeTheme, theme),
  showWorkspaceBrowser: (request) => ipcRenderer.invoke(DESKTOP_IPC_CHANNELS.showWorkspaceBrowser, request),
  hideWorkspaceBrowser: () => ipcRenderer.invoke(DESKTOP_IPC_CHANNELS.hideWorkspaceBrowser),
  navigateWorkspaceBrowser: (url) => ipcRenderer.invoke(DESKTOP_IPC_CHANNELS.navigateWorkspaceBrowser, url),
  goBackWorkspaceBrowser: () => ipcRenderer.invoke(DESKTOP_IPC_CHANNELS.goBackWorkspaceBrowser),
  goForwardWorkspaceBrowser: () => ipcRenderer.invoke(DESKTOP_IPC_CHANNELS.goForwardWorkspaceBrowser),
  reloadWorkspaceBrowser: () => ipcRenderer.invoke(DESKTOP_IPC_CHANNELS.reloadWorkspaceBrowser),

  getUpdateState: () => ipcRenderer.invoke(DESKTOP_IPC_CHANNELS.getUpdateState),
  checkForUpdates: () => ipcRenderer.invoke(DESKTOP_IPC_CHANNELS.checkForUpdates),
  downloadUpdate: () => ipcRenderer.invoke(DESKTOP_IPC_CHANNELS.downloadUpdate),
  installUpdate: () => ipcRenderer.invoke(DESKTOP_IPC_CHANNELS.installUpdate),
  onUpdateState: (listener) => {
    const handler = (_: IpcRendererEvent, state: DesktopUpdateState): void => listener(state);
    ipcRenderer.on(DESKTOP_IPC_CHANNELS.updateState, handler);
    return () => ipcRenderer.removeListener(DESKTOP_IPC_CHANNELS.updateState, handler);
  },
} satisfies DesktopApi;

contextBridge.exposeInMainWorld("desktopApi", desktopApi);
