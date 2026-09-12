import {useState} from "react";
import type {HarnessAgent, HarnessConfig} from "@supernova/contracts/harnesses/schemas";
import Button from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import {SettingsGroup, SettingsRow} from "@/features/settings/components/settings-group";
import ConfigCard from "@/features/harnesses/components/config-card";
import ConfigChoice from "@/features/harnesses/components/config-choice";
import {agentLabel} from "@/features/harnesses/lib/agent-identity";

interface ProjectOverridesEditorProps {
  harness: HarnessConfig;
  overrides: readonly HarnessAgent[];
  onChange: (overrides: readonly HarnessAgent[]) => void;
  onOpenSpecialists: () => void;
}

/** Specialists this project defines differently from the harness. The definitions themselves are edited in Agents. */
export default function ProjectOverridesEditor(props: ProjectOverridesEditorProps) {
  const {harness, overrides, onChange, onOpenSpecialists} = props;
  const [overrideName, setOverrideName] = useState(harness.agents[0]?.name ?? "");

  return (
    <SettingsGroup title="Specialist overrides">
      <SettingsRow
        control={
          <Button className="rounded-lg border border-border px-3 py-2 text-xs text-ink-muted hover:text-ink" onClick={onOpenSpecialists}>
            Edit in Agents
          </Button>
        }
        description="Specialists follow the harness unless this project overrides them by name."
        title={`${overrides.length} overridden specialists`}
      >
        <div className="space-y-2">
          {overrides.map((agent) => (
            <ConfigCard className="flex items-center gap-2" key={agent.name}>
              <span className="min-w-0 flex-1 truncate font-mono text-xs text-ink-muted">{agent.name}</span>
              <Button
                aria-label={`Remove ${agent.name} override`}
                className="grid size-7 shrink-0 place-items-center rounded-md hover:bg-overlay-hover"
                onClick={() => onChange(overrides.filter((item) => item.name !== agent.name))}
              >
                <Icon name="x" size="xs" />
              </Button>
            </ConfigCard>
          ))}
        </div>
      </SettingsRow>
      <SettingsRow description="Copies the harness definition into this project so you can change it here." title="Add an override">
        <div className="flex flex-wrap items-center gap-2">
          <ConfigChoice
            className="sm:w-56"
            label="Agent to override"
            value={overrideName}
            options={harness.agents.length ? harness.agents.map((agent) => ({value: agent.name, label: agentLabel(agent.name)})) : [{value: "", label: "No specialists yet"}]}
            onChange={setOverrideName}
          />
          <Button
            className="px-3 py-2 text-xs"
            variant="filled"
            disabled={!overrideName || overrides.some((agent) => agent.name === overrideName)}
            onClick={() => {
              const agent = harness.agents.find((item) => item.name === overrideName);
              if (agent) onChange([...overrides, agent]);
            }}
          >
            Override specialist
          </Button>
        </div>
      </SettingsRow>
    </SettingsGroup>
  );
}
