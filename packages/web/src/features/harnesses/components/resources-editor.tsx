import {useState} from "react";
import type {HarnessConfig} from "@supernova/contracts/harnesses/schemas";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import SettingsPageShell from "@/features/settings/components/settings-page-shell";
import {SettingsGroup, SettingsRow} from "@/features/settings/components/settings-group";
import ConfigCard from "@/features/harnesses/components/config-card";
import SkillsEditor from "@/features/harnesses/components/skills-editor";
import {useHarnessResources} from "@/features/harnesses/hooks/api/use-harness-resources";

interface ResourcesEditorProps {
  harness: HarnessConfig;
  onChangeHarness: (change: Partial<HarnessConfig>) => void;
  onOpenProviders: () => void;
}

/** What an agent of this harness may reach for: the skills it may use, and the tools its extensions registered. */
export default function ResourcesEditor(props: ResourcesEditorProps) {
  const {harness, onChangeHarness, onOpenProviders} = props;
  const [query, setQuery] = useState("");
  const resources = useHarnessResources(harness.id);
  const tools = resources.data?.tools.filter((tool) => `${tool.name} ${tool.description} ${tool.group}`.toLowerCase().includes(query.toLowerCase())) ?? [];

  return (
    <SettingsPageShell testId="harness-skills">
      {resources.isPending && <p className="px-3 text-sm text-ink-muted sm:px-4">Inspecting configured resources…</p>}
      {resources.isError && (
        <p className="px-3 text-sm text-danger-ink sm:px-4" role="alert">
          Could not inspect resources.{" "}
          <Button className="underline" onClick={() => void resources.refetch()}>
            Retry
          </Button>
        </p>
      )}
      {!!resources.data?.warnings.length && (
        <details className="mx-3 rounded-xl border border-border p-4 text-xs text-danger-ink sm:mx-4" role="alert">
          <summary className="cursor-pointer">{resources.data.warnings.length} extensions unavailable</summary>
          <ul className="mt-3 space-y-2">
            {resources.data.extensions
              .filter((extension) => !extension.loaded)
              .map((extension, index) => (
                <li key={index}>{extension.name}</li>
              ))}
          </ul>
        </details>
      )}

      <SettingsGroup title="Skills">
        <SkillsEditor harnessId={harness.id} value={harness.enabledSkills} onChange={(enabledSkills) => onChangeHarness({enabledSkills})} />
      </SettingsGroup>

      {resources.data && (
        <SettingsGroup title="Registered tools · read-only">
          <SettingsRow
            control={<Input aria-label="Search tools" className="sm:w-64" placeholder="Search tools…" value={query} onChange={(event) => setQuery(event.target.value)} />}
            description="Registered by the connected extensions, so they cannot be edited here."
            title={`${resources.data.tools.length} registered tools`}
          />
          <div className="space-y-2 px-3 sm:px-4">
            {tools.map((tool) => (
              <ConfigCard key={tool.group + tool.name}>
                <p className="text-xs text-ink-muted">{tool.group}</p>
                <h3 className="mt-1 break-all font-mono text-sm text-ink-strong">{tool.name}</h3>
                <p className="mt-2 text-xs leading-relaxed text-ink-muted">{tool.description}</p>
              </ConfigCard>
            ))}
            {!tools.length && <ConfigCard className="text-sm text-ink-muted">No matching tools. Clear the search to see every tool.</ConfigCard>}
          </div>
        </SettingsGroup>
      )}

      {resources.data && (
        <SettingsGroup title="Extensions · read-only">
          <SettingsRow description="Loaded by the server; each one registers the tools above." title={`${resources.data.extensions.length} connected extensions`}>
            <div className="space-y-3">
              {resources.data.extensions.map((extension, index) => (
                <ConfigCard key={index} className="text-xs">
                  <p>
                    {extension.name} · {extension.loaded ? `${extension.toolCount} tools registered` : "Load failed"}
                  </p>
                  {extension.commands.length > 0 && <p className="mt-1 text-ink-muted">{extension.commands.map((name) => `/${name}`).join(", ")}</p>}
                </ConfigCard>
              ))}
              {!resources.data.extensions.length && <p className="text-xs text-ink-muted">No extensions connected.</p>}
            </div>
          </SettingsRow>
        </SettingsGroup>
      )}

      <SettingsGroup title="Set elsewhere">
        <SettingsRow
          control={
            <Button className="rounded-lg border border-border px-3 py-2 text-xs text-ink-muted hover:text-ink" onClick={onOpenProviders}>
              Open Providers &amp; keys
            </Button>
          }
          description="Connector keys are saved once for every harness of this app."
          title="Tool credentials"
        />
      </SettingsGroup>
    </SettingsPageShell>
  );
}
