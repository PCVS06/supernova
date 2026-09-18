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
  /** One sentence under the page title. */
  description: string;
  /** The sidebar group the page is listed in. The harness library belongs with the harness it manages. */
  group: "app" | "harness";
}

/** The pages that are not about one harness. The harness pages are built from the library at render time. */
export const settingsAppPages: readonly SettingsAppPage[] = [
  {
    Component: GeneralSection,
    icon: "settings",
    id: "general",
    label: "General",
    description: "How Radian behaves while you work.",
    group: "app",
  },
  {
    Component: AppearanceSection,
    icon: "palette",
    id: "appearance",
    label: "Appearance",
    description: "Colors, type, light and motion.",
    group: "app",
  },
  {
    Component: ProvidersSection,
    icon: "key",
    id: "providers",
    label: "Models & keys",
    description: "Sign in to the AI providers whose models you want to use, and store the keys your tools need.",
    group: "app",
  },
  {
    Component: AboutSection,
    icon: "monitor",
    id: "about",
    label: "About",
    description: "Version, updates, and where your data lives.",
    group: "app",
  },
  {
    Component: HarnessesPage,
    icon: "columns",
    id: "harnesses",
    label: "All harnesses",
    description: "A harness is one way of working: its instructions, agents, skills, workflows and projects.",
    group: "harness",
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
