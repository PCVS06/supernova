import type {ReactNode} from "react";
import Icon from "@/components/ui/icon";
import SidebarLayout from "@/features/sidebar/components/sidebar-layout";
import SettingsSidebar from "@/features/settings/components/settings-sidebar";
import type {SettingsSectionId} from "@/features/settings/data/settings-sections";
import type {AppEnvironment} from "@/lib/app-environment";

const SETTINGS_SIDEBAR_WIDTH = 288;

interface SettingsShellProps {
  activeSectionId: SettingsSectionId;
  appEnvironment: AppEnvironment;
  /** Trail after the leading "Settings" crumb. Plain text, or a `Link` when the crumb is navigable. */
  breadcrumb: readonly ReactNode[];
  children: ReactNode;
}

/** The settings frame: one sidebar, one breadcrumb, one page rhythm for every settings surface. */
export default function SettingsShell(props: SettingsShellProps) {
  const {activeSectionId, appEnvironment, breadcrumb, children} = props;

  return (
    <SidebarLayout appEnvironment={appEnvironment} className="select-text" sidebar={<SettingsSidebar activeSectionId={activeSectionId} />} sidebarWidth={SETTINGS_SIDEBAR_WIDTH}>
      <nav aria-label="Settings breadcrumb" className="flex h-12 shrink-0 items-center gap-1.5 border-b border-border px-5 text-xs [-webkit-app-region:drag] sm:px-6">
        <span className="text-ink-faint">Settings</span>
        {breadcrumb.map((crumb, index) => (
          <span className="flex min-w-0 items-center gap-1.5" key={index}>
            <Icon aria-hidden="true" className="text-ink-faint" name="chevron-right" size="xs" />
            <span className={index === breadcrumb.length - 1 ? "truncate text-ink" : "truncate text-ink-faint"}>{crumb}</span>
          </span>
        ))}
      </nav>
      {children}
    </SidebarLayout>
  );
}
