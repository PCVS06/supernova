import type {DetailedHTMLProps, HTMLAttributes} from "react";

/** Electron's `<webview>` element, available in the desktop renderer because the window enables `webviewTag`. */
export interface ElectronWebViewElement extends HTMLElement {
  goBack: () => void;
  goForward: () => void;
  reload: () => void;
}

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      webview: DetailedHTMLProps<HTMLAttributes<ElectronWebViewElement>, ElectronWebViewElement> & {
        readonly allowpopups?: string;
        readonly partition?: string;
        readonly src?: string;
      };
    }
  }
}
