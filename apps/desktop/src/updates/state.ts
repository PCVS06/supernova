import type {DesktopUpdateState} from "@supernova/contracts/desktop/api";

export type UpdaterEvent =
  | {type: "checking"}
  | {type: "available"; version: string}
  | {type: "not-available"}
  | {type: "download-progress"; percent: number}
  | {type: "downloaded"; version: string}
  | {type: "error"; message: string}
  | {type: "install-blocked"; reason: string; downloadUrl: string};

export const INITIAL_UPDATE_STATE: DesktopUpdateState = {status: "idle", version: null, downloadPercent: null, message: null, installBlocked: null};

/** Squirrel.Mac reports a signature mismatch between the running app and the downloaded one with this phrase. */
export function isSignatureValidationFailure(message: string): boolean {
  return /did not pass validation/i.test(message);
}

/** An ad-hoc signed bundle has a cdhash designated requirement no other build can satisfy, so it can never be updated in place. */
export function isAdhocSignature(codesignOutput: string): boolean {
  return /^Signature=adhoc$/m.test(codesignOutput) || /^TeamIdentifier=not set$/m.test(codesignOutput);
}

/** Reads the GitHub releases page from electron-builder's bundled feed description, falling back to the project's page. */
export function releasesUrlFrom(appUpdateYml: string, fallback = "https://github.com/mattiacerutti/supernova/releases"): string {
  const read = (key: string): string | undefined => appUpdateYml.match(new RegExp(`^${key}:\\s*['"]?([^'"\\s]+)`, "m"))?.[1];
  const owner = read("owner");
  const repo = read("repo");
  return owner && repo && read("provider") === "github" ? `https://github.com/${owner}/${repo}/releases` : fallback;
}

/** Nightly builds carry a `-nightly.<date>.<run>` prerelease suffix produced by the release workflow. */
export function isNightlyVersion(version: string): boolean {
  return version.includes("-nightly.");
}

/**
 * Applies an electron-updater event to the renderer-facing update state.
 * Background checks never demote an in-flight download or a downloaded update.
 */
export function reduceUpdateState(state: DesktopUpdateState, event: UpdaterEvent): DesktopUpdateState {
  // A blocked install is a property of the running copy, so every transition carries it forward.
  const installBlocked = state.installBlocked;
  switch (event.type) {
    case "checking":
      return state.status === "idle" || state.status === "error" ? {...state, status: "checking", message: null} : state;
    case "available":
      if (state.status === "downloading") return state;
      if (state.status === "downloaded" && state.version === event.version) return state;
      return {status: "available", version: event.version, downloadPercent: null, message: null, installBlocked};
    case "not-available":
      return state.status === "downloading" || state.status === "downloaded" ? state : {...INITIAL_UPDATE_STATE, installBlocked};
    case "download-progress":
      return {status: "downloading", version: state.version, downloadPercent: event.percent, message: null, installBlocked};
    case "downloaded":
      return {status: "downloaded", version: event.version, downloadPercent: null, message: null, installBlocked};
    case "error":
      return {status: "error", version: state.version, downloadPercent: null, message: event.message, installBlocked};
    case "install-blocked":
      return {...state, installBlocked: {reason: event.reason, downloadUrl: event.downloadUrl}};
  }
}
