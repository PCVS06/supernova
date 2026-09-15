import {execFile} from "node:child_process";
import {existsSync, readFileSync} from "node:fs";
import {join, resolve} from "node:path";
import {app} from "electron";
import {autoUpdater} from "electron-updater";
import type {DesktopUpdateState} from "@supernova/contracts/desktop/api";
import type {UpdaterEvent} from "@/updates/state";
import {INITIAL_UPDATE_STATE, isAdhocSignature, isSignatureValidationFailure, reduceUpdateState, releasesUrlFrom} from "@/updates/state";

const STARTUP_CHECK_DELAY_MS = 15_000;
const CHECK_INTERVAL_MS = 60 * 60 * 1_000;

interface CreateDesktopUpdaterOptions {
  readonly nightly: boolean;
  readonly onStateChange: (state: DesktopUpdateState) => void;
}

export interface DesktopUpdater {
  readonly getState: () => DesktopUpdateState;
  readonly start: () => void;
  readonly check: () => void;
  readonly download: () => Promise<void>;
  readonly quitAndInstall: () => void;
}

/** Updates require a packaged build with bundled updater metadata, and on Linux the AppImage distribution. */
function isAutoUpdateSupported(): boolean {
  if (!app.isPackaged) return false;
  if (process.platform === "linux" && !process.env.APPIMAGE) return false;
  return existsSync(join(process.resourcesPath, "app-update.yml"));
}

function releasesUrl(): string {
  try {
    return releasesUrlFrom(readFileSync(join(process.resourcesPath, "app-update.yml"), "utf8"));
  } catch {
    return releasesUrlFrom("");
  }
}

/** Squirrel.Mac validates a downloaded app against the running one, and an ad-hoc signed copy can never pass. */
function detectAdhocBundle(): Promise<boolean> {
  if (process.platform !== "darwin" || !app.isPackaged) return Promise.resolve(false);
  const bundle = resolve(process.execPath, "../../..");
  return new Promise((done) => {
    execFile("/usr/bin/codesign", ["-dv", "--verbose=2", bundle], (error, stdout, stderr) => {
      done(!error && isAdhocSignature(`${stdout}\n${stderr}`));
    });
  });
}

const adhocReason = "This copy of Radian is not code-signed, so macOS refuses to replace it in place. Download the new version and replace the app yourself.";
const mismatchReason = "macOS refused to install the update because its code signature does not match this copy of Radian. Download the new version and replace the app yourself.";

/**
 * Creates the desktop auto-updater with two-step semantics: updates are never downloaded or
 * installed automatically. The renderer downloads on request and installs with an explicit restart.
 * Nightly builds follow the dedicated nightly prerelease channel.
 */
export function createDesktopUpdater({nightly, onStateChange}: CreateDesktopUpdaterOptions): DesktopUpdater {
  const supported = isAutoUpdateSupported();
  let state = INITIAL_UPDATE_STATE;

  const setState = (next: DesktopUpdateState): void => {
    if (next === state) return;
    state = next;
    onStateChange(state);
  };

  const applyEvent = (event: UpdaterEvent): void => {
    setState(reduceUpdateState(state, event));
  };

  const checkForUpdates = (): void => {
    if (!supported || state.status === "downloading" || state.status === "downloaded") return;
    // Failures surface through the updater "error" event.
    void autoUpdater.checkForUpdates().catch(() => undefined);
  };

  return {
    getState: () => state,

    check: checkForUpdates,

    start: () => {
      if (!supported) return;

      autoUpdater.autoDownload = false;
      autoUpdater.autoInstallOnAppQuit = false;
      if (nightly) {
        autoUpdater.channel = "nightly";
        autoUpdater.allowPrerelease = true;
        autoUpdater.allowDowngrade = true;
      }

      autoUpdater.on("checking-for-update", () => applyEvent({type: "checking"}));
      autoUpdater.on("update-available", (info) => applyEvent({type: "available", version: info.version}));
      autoUpdater.on("update-not-available", () => applyEvent({type: "not-available"}));
      autoUpdater.on("download-progress", (progress) => applyEvent({type: "download-progress", percent: Math.round(progress.percent)}));
      autoUpdater.on("update-downloaded", (info) => applyEvent({type: "downloaded", version: info.version}));
      autoUpdater.on("error", (error) => {
        applyEvent({type: "error", message: error.message});
        if (isSignatureValidationFailure(error.message)) applyEvent({type: "install-blocked", reason: mismatchReason, downloadUrl: releasesUrl()});
      });

      void detectAdhocBundle().then((adhoc) => {
        if (adhoc) applyEvent({type: "install-blocked", reason: adhocReason, downloadUrl: releasesUrl()});
      });

      setTimeout(checkForUpdates, STARTUP_CHECK_DELAY_MS);
      setInterval(checkForUpdates, CHECK_INTERVAL_MS);
    },

    download: async () => {
      const canDownload = state.status === "available" || (state.status === "error" && state.version !== null);
      // A blocked copy is replaced by hand from the releases page; downloading here would only fail at install.
      if (!supported || !canDownload || state.installBlocked) return;

      setState({status: "downloading", version: state.version, downloadPercent: 0, message: null, installBlocked: null});
      // Failures surface through the updater "error" event.
      await autoUpdater.downloadUpdate().catch(() => undefined);
    },

    quitAndInstall: () => {
      if (state.status !== "downloaded") return;
      autoUpdater.quitAndInstall(true, true);
    },
  };
}
