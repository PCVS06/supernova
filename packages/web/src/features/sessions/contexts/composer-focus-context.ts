import {createContext} from "react";

/** Lets composer popups restore the existing editor and its selection after choosing an option. */
export const ComposerFocusContext = createContext<(() => HTMLElement | null) | undefined>(undefined);
