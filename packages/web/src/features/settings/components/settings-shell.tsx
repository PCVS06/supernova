import type {ReactNode} from "react";
import SidebarLayout from "@/features/sidebar/components/sidebar-layout";
import SettingsSidebar from "@/features/settings/components/settings-sidebar";
import type {HarnessPageId, SettingsSectionId} from "@/features/settings/data/settings-tree";
import type {AppEnvironment} from "@/lib/app-environment";

const SETTINGS_SIDEBAR_WIDTH = 288;

interface SettingsShellProps {
  /** The App page that is open. Harness pages leave it out. */
  activeSectionId?: SettingsSectionId;
  activeHarnessId?: string;
  activePage?: HarnessPageId;
  appEnvironment: AppEnvironment;
  children: ReactNode;
  /** Where the page sits, outermost first: "Settings", "General" or a harness, its page and the open entry. */
  crumbs: readonly string[];
}

/** The settings frame: navigation on the left, a breadcrumb above, one page below it. */
export default function SettingsShell(props: SettingsShellProps) {
  const {activeSectionId, activeHarnessId, activePage, appEnvironment, children, crumbs} = props;

  return (
    <SidebarLayout
      appEnvironment={appEnvironment}
      className="select-text"
      sidebar={<SettingsSidebar activeHarnessId={activeHarnessId} activePage={activePage} activeSectionId={activeSectionId} />}
      sidebarWidth={SETTINGS_SIDEBAR_WIDTH}
    >
      <nav aria-label="Breadcrumb" className="flex h-12 shrink-0 items-center border-b border-border-muted px-5 [-webkit-app-region:drag] sm:px-8">
        <ol className="flex min-w-0 items-center gap-1.5 text-xs text-ink-faint">
          {crumbs.map((crumb, index) => (
            <li className="flex min-w-0 items-center gap-1.5" key={index}>
              {index > 0 && <span aria-hidden="true">›</span>}
              <span aria-current={index === crumbs.length - 1 ? "page" : undefined} className={index === crumbs.length - 1 ? "truncate text-ink-muted" : "truncate"}>
                {crumb}
              </span>
            </li>
          ))}
        </ol>
      </nav>
      {children}
    </SidebarLayout>
  );
}
