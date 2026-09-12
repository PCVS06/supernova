export type DesktopEnvironment = "mac" | "windows" | "linux";

export type DesktopTheme = "dark" | "light" | "system";

export type DesktopUpdateStatus = "idle" | "checking" | "available" | "downloading" | "downloaded" | "error";

/** Why an update cannot be installed in place, with where to fetch it by hand instead. */
export interface DesktopUpdateInstallBlock {
  readonly reason: string;
  readonly downloadUrl: string;
}

export interface DesktopUpdateState {
  readonly status: DesktopUpdateStatus;
  /** Version offered by the update feed, kept across download and error states. */
  readonly version: string | null;
  readonly downloadPercent: number | null;
  readonly message: string | null;
  /** Set when the running copy can never be replaced by the updater, such as an unsigned macOS build. */
  readonly installBlocked: DesktopUpdateInstallBlock | null;
}

export interface DesktopApi {
  readonly environment: DesktopEnvironment;
  readonly serverUrl: string;
  readonly appVersion: string;
  readonly nightly: boolean;
  readonly openDirectory: (path: string) => Promise<void>;
  readonly setNativeTheme: (theme: DesktopTheme) => Promise<void>;
  readonly getUpdateState: () => Promise<DesktopUpdateState>;
  readonly downloadUpdate: () => Promise<void>;
  readonly installUpdate: () => Promise<void>;
  readonly onUpdateState: (listener: (state: DesktopUpdateState) => void) => () => void;
}
