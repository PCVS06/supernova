import type {ComponentType} from "react";
import type {IconName} from "@/components/ui/icon";
import HarnessesPage from "@/features/harnesses/pages/harnesses-page";
import {defaultHarnessPage, harnessPages} from "@/features/harnesses/lib/harness-sections";
import type {HarnessPage, HarnessPageId} from "@/features/harnesses/lib/harness-sections";
import AboutSection from "@/features/settings/pages/sections/about-section";
import AppearanceSection from "@/features/settings/pages/sections/appearance-section";
import GeneralSection from "@/features/settings/pages/sections/general-section";
import ProvidersSection from "@/features/settings/pages/sections/providers-section";

export type SettingsSectionId = "about" | "appearance" | "general" | "harnesses" | "providers";

export interface SettingsAppPage {
  Component: ComponentType;
  icon: IconName;
  id: SettingsSectionId;
  label: string;
}

/** The App branch of the settings tree. The Harnesses branch is built from the library at render time. */
export const settingsAppPages: readonly SettingsAppPage[] = [
  {
    Component: GeneralSection,
    icon: "settings",
    id: "general",
    label: "General",
  },
  {
    Component: AppearanceSection,
    icon: "palette",
    id: "appearance",
    label: "Appearance",
  },
  {
    Component: ProvidersSection,
    icon: "key",
    id: "providers",
    label: "Providers & keys",
  },
  {
    Component: AboutSection,
    icon: "monitor",
    id: "about",
    label: "About",
  },
  {
    Component: HarnessesPage,
    icon: "workflow",
    id: "harnesses",
    label: "Harnesses",
  },
];

export const defaultSettingsSectionId: SettingsSectionId = "general";

/** Returns the App page for the given id. Throws for unknown ids. */
export function getSettingsAppPage(sectionId: string): SettingsAppPage {
  const page = settingsAppPages.find((candidate) => candidate.id === sectionId);
  if (!page) throw new Error(`Unknown settings section: ${sectionId}`);
  return page;
}

export {defaultHarnessPage, harnessPages};
export type {HarnessPage, HarnessPageId};
