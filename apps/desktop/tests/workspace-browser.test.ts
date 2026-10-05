import {beforeEach, describe, expect, mock, test} from "bun:test";
import {EventEmitter} from "node:events";
import type {BrowserWindow} from "electron";
import type {DesktopBrowserState} from "@supernova/contracts/desktop/api";

class BrowserContents extends EventEmitter {
  history: string[] = [];
  position = -1;
  destroyed = false;
  loadURL = mock(async (url: string) => {
    this.history.splice(++this.position, Infinity, url);
    this.emit("did-navigate", {}, url);
  });
  setWindowOpenHandler = mock();
  insertCSS = mock(async () => "style");
  reload = mock();
  isDestroyed(): boolean {
    return this.destroyed;
  }
  canGoBack(): boolean {
    return this.position > 0;
  }
  canGoForward(): boolean {
    return this.position < this.history.length - 1;
  }
  goBack(): void {
    this.emit("did-navigate", {}, this.history[--this.position]);
  }
  goForward(): void {
    this.emit("did-navigate", {}, this.history[++this.position]);
  }
  close(): void {
    this.destroyed = true;
  }
}

const views: BrowserView[] = [];
class BrowserView {
  webContents = new BrowserContents();
  setBackgroundColor = mock();
  setBounds = mock();
  setVisible = mock();
  constructor() {
    views.push(this);
  }
}
mock.module("electron", () => ({WebContentsView: BrowserView}));
const {createWorkspaceBrowser} = await import("@/workspace-browser");

describe("native workspace browser", () => {
  beforeEach(() => {
    views.length = 0;
  });
  const bounds = {x: 20, y: 40, width: 400, height: 500};

  test("retains navigation and history across resize, hide and show", async () => {
    const states: DesktopBrowserState[] = [];
    const window = {contentView: {addChildView: mock(), removeChildView: mock()}} as unknown as BrowserWindow;
    const browser = createWorkspaceBrowser(window, (state) => states.push(state));
    try {
      await browser.show({bounds, url: "https://example.com/a"});
      await browser.navigate("https://example.com/b");
      await browser.show({bounds: {...bounds, width: 600}, url: "https://example.com/a"});
      browser.hide();
      const restored = await browser.show({bounds, url: "https://example.com/a"});
      expect(restored).toEqual({url: "https://example.com/b", canGoBack: true, canGoForward: false});
      expect(views[0]!.webContents.loadURL.mock.calls).toEqual([["https://example.com/a"], ["https://example.com/b"]]);
      browser.goBack();
      expect(states.at(-1)).toEqual({url: "https://example.com/a", canGoBack: false, canGoForward: true});
      browser.goForward();
      expect(states.at(-1)?.url).toBe("https://example.com/b");
      await browser.reload();
      expect(views[0]!.webContents.reload).toHaveBeenCalledTimes(1);
    } finally {
      browser.dispose();
    }
  });

  test("keeps links and same-page navigation authoritative and recovers the latest page after a renderer crash", async () => {
    const states: DesktopBrowserState[] = [];
    const window = {contentView: {addChildView: mock(), removeChildView: mock()}} as unknown as BrowserWindow;
    const browser = createWorkspaceBrowser(window, (state) => states.push(state));
    try {
      await browser.show({bounds, url: "https://example.com/a"});
      await views[0]!.webContents.loadURL("https://example.com/linked");
      views[0]!.webContents.emit("did-navigate-in-page", {}, "https://example.com/linked#section", true);
      await browser.show({bounds, url: "https://example.com/a"});
      expect(views[0]!.webContents.loadURL).toHaveBeenCalledTimes(2);
      expect(states.at(-1)?.url).toBe("https://example.com/linked#section");
      views[0]!.webContents.emit("render-process-gone");
      await browser.reload();
      expect(views[1]!.webContents.loadURL.mock.calls).toEqual([["https://example.com/linked#section"]]);
      await expect(browser.navigate("file:///etc/passwd")).rejects.toThrow("only opens web addresses");
    } finally {
      browser.dispose();
    }
  });
});
