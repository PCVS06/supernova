import {useState} from "react";
import type {DesktopUpdateState} from "@supernova/contracts/desktop/api";
import Button from "@/components/ui/button";
import {showToast} from "@/components/ui/toast-manager";
import {SettingsGroup, SettingsRow} from "@/features/settings/components/settings-group";
import UpdateInstallDialog from "@/features/updates/components/update-install-dialog";
import {useDesktopUpdate} from "@/features/updates/hooks/use-desktop-update";

/** One sentence for the update state the desktop app reports. */
function updateSentence(state: DesktopUpdateState | undefined): string {
  if (!state) return "The desktop app reports update state.";
  if (state.installBlocked) return state.installBlocked.reason;
  const version = state.version ?? "the new version";
  switch (state.status) {
    case "checking":
      return "Looking for a newer version.";
    case "available":
      return `Version ${version} is ready to download.`;
    case "downloading":
      return `Downloading version ${version}, ${state.downloadPercent ?? 0}% done.`;
    case "downloaded":
      return `Version ${version} is downloaded and installs on restart.`;
    case "error":
      return state.message ?? "The last update check failed.";
    default:
      return "No update is waiting.";
  }
}

/** What this copy of Radian is and where it talks to: version, channel, updates, and the server endpoint. */
export default function AboutSection() {
  const host = typeof window === "undefined" ? undefined : window;
  const desktop = host?.desktopApi;
  const update = useDesktopUpdate();
  const [pending, setPending] = useState(false);
  const [installDialogOpen, setInstallDialogOpen] = useState(false);
  const state = update.state;
  const blocked = state?.installBlocked;
  const version = desktop?.appVersion || __APP_VERSION__;
  // The same endpoint the RPC client resolves: the desktop server, the configured API, or this origin.
  const endpoint = desktop?.serverUrl || import.meta.env.VITE_SUPERNOVA_SERVER_URL || host?.location?.origin || "";

  const run = (action: () => Promise<void>, failure: string): void => {
    setPending(true);
    void action()
      .catch(() => showToast(failure, "Restart Radian and try again."))
      .finally(() => setPending(false));
  };

  const action = ((): {label: string; onClick: () => void; disabled?: boolean} => {
    if (blocked) return {label: "Open releases page", onClick: () => window.open(blocked.downloadUrl, "_blank", "noopener,noreferrer")};
    if (state?.status === "downloaded") return {label: "Install update", onClick: () => setInstallDialogOpen(true)};
    if (state?.status === "downloading") return {label: "Download update", onClick: () => undefined, disabled: true};
    if (state?.status === "available" || (state?.status === "error" && state.version)) {
      return {label: "Download update", onClick: () => run(update.download, "Could not download the update")};
    }
    return {label: "Check for updates", onClick: () => run(update.check, "Could not check for updates")};
  })();

  return (
    <>
      <SettingsGroup title="Radian">
        <SettingsRow control={<span className="font-mono text-xs text-ink">{version}</span>} description="The version of Radian you are running." title="Version" />
        {desktop && (
          <SettingsRow
            control={<span className="text-xs text-ink">{desktop.nightly ? "Nightly" : "Stable"}</span>}
            description="Nightly builds follow the prerelease feed, stable builds the release feed."
            title="Release channel"
          />
        )}
      </SettingsGroup>

      {desktop && (
        <SettingsGroup title="Updates">
          <SettingsRow
            control={
              <Button className="rounded-lg border border-border px-3 py-2 text-xs text-ink-muted hover:text-ink" disabled={action.disabled || pending} onClick={action.onClick}>
                {action.label}
              </Button>
            }
            description={updateSentence(state)}
            title="Update status"
          />
        </SettingsGroup>
      )}

      <SettingsGroup title="Connection">
        <SettingsRow
          control={<span className="break-all font-mono text-xs text-ink">{endpoint}</span>}
          description={desktop ? "The local API this window talks to." : "The API this browser talks to; the data folder is shown in the desktop app."}
          title="Server endpoint"
        />
        {desktop?.dataDirectory && (
          <SettingsRow
            control={
              <Button
                className="rounded-lg border border-border px-3 py-2 text-xs text-ink-muted hover:text-ink"
                onClick={() => run(async () => desktop.openDirectory(desktop.dataDirectory), "Could not open the data folder")}
              >
                Open folder
              </Button>
            }
            description="Where Radian keeps your chats, checkpoints and saved credentials."
            title="Data folder"
          >
            <p className="break-all font-mono text-xs text-ink-muted">{desktop.dataDirectory}</p>
          </SettingsRow>
        )}
      </SettingsGroup>

      <UpdateInstallDialog
        onCancel={() => setInstallDialogOpen(false)}
        onConfirm={() => {
          setInstallDialogOpen(false);
          run(update.install, "Could not install the update");
        }}
        open={installDialogOpen}
        version={state?.version ?? null}
      />
    </>
  );
}
