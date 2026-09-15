import type {FormEvent} from "react";
import {useRef, useState} from "react";
import Icon from "@/components/ui/icon";
import IconButton from "@/components/ui/icon-button";
import Input from "@/components/ui/input";
import type {AppEnvironment} from "@/lib/app-environment";
import {isDesktopEnvironment} from "@/lib/app-environment";
import {useMountEffect} from "@/lib/use-mount-effect";
import {useWorkspacePanelStore} from "@/features/workspace/stores/workspace-panel-store";

/** Accepts what people actually type into an address field. */
function normalizeUrl(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) return "";

  return /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

interface WorkspaceBrowserViewProps {
  readonly appEnvironment: AppEnvironment;
}

/** Keeps a reference page beside the chat: a real browser view on the desktop, an embedded frame on the web. */
export default function WorkspaceBrowserView(props: WorkspaceBrowserViewProps) {
  const {appEnvironment} = props;
  const browserUrl = useWorkspacePanelStore((state) => state.browserUrl);
  const setBrowserUrl = useWorkspacePanelStore((state) => state.setBrowserUrl);
  const nativeHostRef = useRef<HTMLDivElement | null>(null);
  const [draftUrl, setDraftUrl] = useState(browserUrl);
  const [reloadToken, setReloadToken] = useState(0);
  const [nativeError, setNativeError] = useState<string | null>(null);
  const embedded = !isDesktopEnvironment(appEnvironment);

  useMountEffect(() => {
    if (embedded) return;
    const host = nativeHostRef.current;
    const api = window.desktopApi;
    if (!host || !api) {
      setNativeError("Browser unavailable.");
      return;
    }

    const show = (): void => {
      const bounds = host.getBoundingClientRect();
      void api
        .showWorkspaceBrowser({bounds: {x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height}, url: browserUrl})
        .then(() => setNativeError(null))
        .catch(() => setNativeError("Browser unavailable."));
    };
    const observer = new ResizeObserver(show);
    observer.observe(host);
    show();

    return () => {
      observer.disconnect();
      void api.hideWorkspaceBrowser();
    };
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const nextUrl = normalizeUrl(draftUrl);
    if (nextUrl.length === 0) return;

    setDraftUrl(nextUrl);
    setBrowserUrl(nextUrl);
    if (!embedded) void window.desktopApi?.navigateWorkspaceBrowser(nextUrl).catch(() => setNativeError("Page unavailable."));
  };

  // Remounting the frame is the only reload an embedded page can be given, and
  // it is also the cheapest one for the desktop view.
  const handleReload = (): void => {
    if (!embedded) {
      void window.desktopApi?.reloadWorkspaceBrowser().catch(() => setNativeError("Page unavailable."));
      return;
    }

    setReloadToken((token) => token + 1);
  };

  const handleBack = (): void => {
    if (!embedded) void window.desktopApi?.goBackWorkspaceBrowser();
  };

  const handleForward = (): void => {
    if (!embedded) void window.desktopApi?.goForwardWorkspaceBrowser();
  };

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <form className="flex shrink-0 items-center gap-1 border-b border-border-muted px-2 py-1.5" onSubmit={handleSubmit}>
        <IconButton className="size-7 shrink-0" disabled={embedded} label="Go back" onClick={handleBack} title="Go back">
          <Icon name="arrow-left" size="sm" />
        </IconButton>
        <IconButton className="size-7 shrink-0" disabled={embedded} label="Go forward" onClick={handleForward} title="Go forward">
          <Icon name="arrow-right" size="sm" />
        </IconButton>
        <IconButton className="size-7 shrink-0" label="Reload page" onClick={handleReload} title="Reload page">
          <Icon name="reload" size="sm" />
        </IconButton>
        <Input
          aria-label="Page address"
          className="min-w-0 flex-1 px-2 py-1 text-xs"
          inputMode="url"
          onChange={(event) => setDraftUrl(event.target.value)}
          placeholder="https://"
          spellCheck={false}
          value={draftUrl}
        />
      </form>

      {embedded && <p className="shrink-0 border-b border-border-muted px-3 py-1.5 text-xs text-ink-faint">Some sites refuse to be embedded and stay blank here.</p>}

      <div className="min-h-0 min-w-0 flex-1 bg-surface-deep">
        {embedded ? (
          <iframe
            className="size-full border-0"
            key={`${browserUrl}:${reloadToken}`}
            referrerPolicy="no-referrer"
            sandbox="allow-forms allow-popups allow-same-origin allow-scripts"
            src={browserUrl}
            title="Workspace browser"
          />
        ) : (
          <div aria-label="Browser page" className="grid size-full place-items-center" ref={nativeHostRef}>
            {nativeError && <p className="text-xs text-ink-faint">{nativeError}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
