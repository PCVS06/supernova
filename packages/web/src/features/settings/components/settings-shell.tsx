import type {ReactNode} from "react";
import SidebarLayout from "@/features/sidebar/components/sidebar-layout";
import SettingsSidebar from "@/features/settings/components/settings-sidebar";
import type {HarnessPageId, SettingsSectionId} from "@/features/settings/data/settings-tree";
import type {AppEnvironment} from "@/lib/app-environment";

const SETTINGS_SIDEBAR_WIDTH = 288;

interface SettingsShellProps {
  activeSectionId: SettingsSectionId;
  activeHarnessId?: string;
  activePage?: HarnessPageId;
  appEnvironment: AppEnvironment;
  children: ReactNode;
  /** The harness a page belongs to. App pages leave it out. */
  owner?: string;
  /** The name of the page itself. */
  title: string;
}

/** The settings frame: the tree on the left, one page header, one page. */
export default function SettingsShell(props: SettingsShellProps) {
  const {activeSectionId, activeHarnessId, activePage, appEnvironment, children, owner, title} = props;

  return (
    <SidebarLayout
      appEnvironment={appEnvironment}
      className="select-text"
      sidebar={<SettingsSidebar activeHarnessId={activeHarnessId} activePage={activePage} activeSectionId={activeSectionId} />}
      sidebarWidth={SETTINGS_SIDEBAR_WIDTH}
    >
      <header className="flex h-12 shrink-0 items-baseline gap-2 border-b border-border px-5 [-webkit-app-region:drag] sm:px-6">
        {owner && <span className="truncate text-xs text-ink-faint">{owner}</span>}
        <h1 className="truncate text-sm font-medium text-ink-strong">{title}</h1>
      </header>
      {children}
    </SidebarLayout>
  );
}
