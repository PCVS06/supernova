import type {BrowserWindow, Rectangle} from "electron";
import {WebContentsView} from "electron";
import type {DesktopBrowserShowRequest} from "@supernova/contracts/desktop/api";

const HIDDEN_SCROLLBARS_CSS = "*{scrollbar-width:none!important}*::-webkit-scrollbar{display:none!important}";

function secureBrowserUrl(value: string): string {
  const url = new URL(value);
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("The workspace browser only opens web addresses.");
  return url.href;
}

function browserBounds(bounds: DesktopBrowserShowRequest["bounds"]): Rectangle {
  return {
    x: Math.max(0, Math.round(bounds.x)),
    y: Math.max(0, Math.round(bounds.y)),
    width: Math.max(1, Math.round(bounds.width)),
    height: Math.max(1, Math.round(bounds.height)),
  };
}

export interface WorkspaceBrowserController {
  readonly show: (request: DesktopBrowserShowRequest) => Promise<void>;
  readonly hide: () => void;
  readonly navigate: (url: string) => Promise<void>;
  readonly goBack: () => void;
  readonly goForward: () => void;
  readonly reload: () => Promise<void>;
  readonly dispose: () => void;
}

class ElectronWorkspaceBrowser implements WorkspaceBrowserController {
  private view: WebContentsView | undefined;
  private visible = false;
  private url = "";
  private loadedUrl = "";
  private bounds: Rectangle = {x: 0, y: 0, width: 1, height: 1};

  constructor(private readonly window: BrowserWindow) {}

  /** Lazily creates the isolated browser surface and locks it to web URLs. */
  private getView(): WebContentsView {
    if (this.view && !this.view.webContents.isDestroyed()) return this.view;

    const view = new WebContentsView({webPreferences: {contextIsolation: true, nodeIntegration: false, sandbox: true}});
    view.setBackgroundColor("#000000");
    view.webContents.setWindowOpenHandler(({url}) => {
      void this.navigate(url).catch(() => undefined);
      return {action: "deny"};
    });
    view.webContents.on("will-navigate", (event, url) => {
      try {
        secureBrowserUrl(url);
      } catch {
        event.preventDefault();
      }
    });
    view.webContents.on("did-finish-load", () => {
      void view.webContents.insertCSS(HIDDEN_SCROLLBARS_CSS).catch(() => undefined);
    });
    view.webContents.on("render-process-gone", () => {
      if (this.view !== view) return;
      view.setVisible(false);
      this.window.contentView.removeChildView(view);
      this.view = undefined;
      this.loadedUrl = "";
    });
    this.window.contentView.addChildView(view);
    this.view = view;
    return view;
  }

  /** Loads a URL once even when resize observations repeat while navigation is pending. */
  private async load(view: WebContentsView, url: string): Promise<void> {
    if (this.loadedUrl === url) return;
    this.loadedUrl = url;
    try {
      await view.webContents.loadURL(url);
    } catch (cause) {
      if (this.loadedUrl === url) this.loadedUrl = "";
      throw cause;
    }
  }

  async show(request: DesktopBrowserShowRequest): Promise<void> {
    this.bounds = browserBounds(request.bounds);
    this.url = secureBrowserUrl(request.url);
    this.visible = true;
    const view = this.getView();
    view.setBounds(this.bounds);
    view.setVisible(true);
    await this.load(view, this.url);
  }

  hide(): void {
    this.visible = false;
    this.view?.setVisible(false);
  }

  async navigate(url: string): Promise<void> {
    this.url = secureBrowserUrl(url);
    const view = this.getView();
    view.setBounds(this.bounds);
    view.setVisible(this.visible);
    await this.load(view, this.url);
  }

  goBack(): void {
    if (this.view?.webContents.canGoBack()) this.view.webContents.goBack();
  }

  goForward(): void {
    if (this.view?.webContents.canGoForward()) this.view.webContents.goForward();
  }

  async reload(): Promise<void> {
    if (this.view && !this.view.webContents.isDestroyed()) {
      this.view.webContents.reload();
      return;
    }
    if (this.url) await this.show({bounds: this.bounds, url: this.url});
  }

  dispose(): void {
    const view = this.view;
    this.view = undefined;
    this.loadedUrl = "";
    if (!view) return;
    view.setVisible(false);
    this.window.contentView.removeChildView(view);
    if (!view.webContents.isDestroyed()) view.webContents.close();
  }
}

/** Creates one reusable native browser surface for a desktop window. */
export function createWorkspaceBrowser(window: BrowserWindow): WorkspaceBrowserController {
  return new ElectronWorkspaceBrowser(window);
}
