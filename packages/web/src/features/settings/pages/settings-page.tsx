import type {AppEnvironment} from "@/lib/app-environment";
import SettingsPageShell from "@/features/settings/components/settings-page-shell";
import SettingsShell from "@/features/settings/components/settings-shell";
import {getSettingsSection} from "@/features/settings/data/settings-sections";

interface SettingsPageProps {
  appEnvironment: AppEnvironment;
  sectionId: string;
}

export default function SettingsPage(props: SettingsPageProps) {
  const {appEnvironment, sectionId} = props;
  const section = getSettingsSection(sectionId);

  return (
    <SettingsShell activeSectionId={section.id} appEnvironment={appEnvironment} breadcrumb={[section.label]}>
      <SettingsPageShell>
        <section.Component key={section.id} />
      </SettingsPageShell>
    </SettingsShell>
  );
}
