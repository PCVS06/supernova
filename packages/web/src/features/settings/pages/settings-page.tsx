import type {AppEnvironment} from "@/lib/app-environment";
import SettingsPageShell from "@/features/settings/components/settings-page-shell";
import SettingsShell from "@/features/settings/components/settings-shell";
import {getSettingsAppPage} from "@/features/settings/data/settings-tree";

interface SettingsPageProps {
  appEnvironment: AppEnvironment;
  sectionId: string;
}

export default function SettingsPage(props: SettingsPageProps) {
  const {appEnvironment, sectionId} = props;
  const page = getSettingsAppPage(sectionId);

  return (
    <SettingsShell activeSectionId={page.id} appEnvironment={appEnvironment} crumbs={["Settings", page.label]}>
      <SettingsPageShell description={page.description} title={page.label}>
        <page.Component key={page.id} />
      </SettingsPageShell>
    </SettingsShell>
  );
}
