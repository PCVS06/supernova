import type {HarnessConfig, HarnessProject} from "@supernova/contracts/harnesses/schemas";
import Input from "@/components/ui/input";
import SettingsPageShell from "@/features/settings/components/settings-page-shell";
import {SettingsGroup, SettingsRow} from "@/features/settings/components/settings-group";
import ConfigChoice from "@/features/harnesses/components/config-choice";
import ExecutionEditor from "@/features/harnesses/components/execution-editor";
import PromptEditor from "@/features/harnesses/components/prompt-editor";
import RunLimitsEditor from "@/features/harnesses/components/run-limits-editor";
import {agentLabel} from "@/features/harnesses/lib/agent-identity";

interface OverviewPageProps {
  harness: HarnessConfig;
  projects: readonly HarnessProject[];
  onChange: (change: Partial<HarnessConfig>) => void;
}

/** What the harness is and how hard it runs. Every chat of this harness starts from here. */
export default function OverviewPage(props: OverviewPageProps) {
  const {harness, projects, onChange} = props;

  return (
    <SettingsPageShell testId="harness-overview">
      <SettingsGroup title="Harness">
        <SettingsRow
          control={<Input aria-label="Harness name" className="sm:w-64" value={harness.name} onChange={(event) => onChange({name: event.target.value})} />}
          description="Shown in the sidebar and above every page of this harness."
          title="Name"
        />
        <SettingsRow description="One sentence on what this harness is for." title="Description">
          <PromptEditor label="Harness description" size="sm" value={harness.description} onChange={(description) => onChange({description})} />
        </SettingsRow>
      </SettingsGroup>
      <SettingsGroup title="Default model">
        <ExecutionEditor inheritLabel="Use chat model" value={harness.execution} onChange={(execution) => onChange({execution})} />
      </SettingsGroup>
      <RunLimitsEditor harness={harness} onChange={onChange} />
      <SettingsGroup title="Coordination">
        <SettingsRow
          control={
            <ConfigChoice
              className="sm:w-64"
              label="Coordinating project"
              value={harness.coordinatorProjectId ?? ""}
              options={[
                {value: "", label: projects.length ? "No coordinating project" : "No projects yet"},
                ...projects.map((project) => ({value: project.id, label: agentLabel(project.name)})),
              ]}
              onChange={(value) => onChange({coordinatorProjectId: value || undefined})}
            />
          }
          description="Its chats coordinate the other projects of this harness."
          title="Coordinating project"
        />
      </SettingsGroup>
    </SettingsPageShell>
  );
}
