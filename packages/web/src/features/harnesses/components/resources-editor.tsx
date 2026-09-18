import {useState} from "react";
import type {HarnessConfig} from "@supernova/contracts/harnesses/schemas";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import SettingsPageShell from "@/features/settings/components/settings-page-shell";
import {SettingsGroup, SettingsNote, SettingsRow} from "@/features/settings/components/settings-group";
import SkillsEditor from "@/features/harnesses/components/skills-editor";
import {useHarnessResources} from "@/features/harnesses/hooks/api/use-harness-resources";
import {resolveHarnessPage} from "@/features/harnesses/lib/harness-sections";

interface ResourcesEditorProps {
  harness: HarnessConfig;
  onChangeHarness: (change: Partial<HarnessConfig>) => void;
  onOpenProviders: () => void;
}

/** What an agent of this harness may reach for: the skills it may use, and, for reference, the tools its extensions registered. */
export default function ResourcesEditor(props: ResourcesEditorProps) {
  const {harness, onChangeHarness, onOpenProviders} = props;
  const [query, setQuery] = useState("");
  const resources = useHarnessResources(harness.id);
  const page = resolveHarnessPage("skills");
  const tools = resources.data?.tools.filter((tool) => `${tool.name} ${tool.description} ${tool.group}`.toLowerCase().includes(query.toLowerCase())) ?? [];
  const failed = resources.data?.extensions.filter((extension) => !extension.loaded) ?? [];

  return (
    <SettingsPageShell description={page.description} testId="harness-skills" title={page.label}>
      {resources.isError && (
        <p className="px-1 text-sm text-danger-ink" role="alert">
          Could not inspect the tools of this harness.{" "}
          <Button className="underline" onClick={() => void resources.refetch()}>
            Retry
          </Button>
        </p>
      )}
      {failed.length > 0 && (
        <p className="rounded-xl border border-border px-4 py-3 text-xs leading-relaxed text-danger-ink" role="alert">
          {failed.length === 1 ? "One extension" : `${failed.length} extensions`} could not be loaded, so their tools are missing:{" "}
          {failed.map((extension) => extension.name).join(", ")}.
        </p>
      )}

      <SettingsGroup description="Switch off what this harness should never use. Agents and projects can narrow the list further." title="Skills">
        <SkillsEditor harnessId={harness.id} value={harness.enabledSkills} onChange={(enabledSkills) => onChangeHarness({enabledSkills})} />
      </SettingsGroup>

      <SettingsGroup title="Tool keys">
        <SettingsRow
          control={
            <Button className="rounded-lg border border-border px-3 py-2 text-xs text-ink-muted hover:text-ink" onClick={onOpenProviders}>
              Open Models &amp; keys
            </Button>
          }
          description="Keys for web search and other connectors are saved once for every harness."
          title="Tool credentials"
        />
      </SettingsGroup>

      <SettingsGroup
        collapsible
        description={resources.data ? `${resources.data.tools.length} registered by the extensions below` : resources.isPending ? "Inspecting…" : undefined}
        readOnly
        title="Tools"
      >
        <div className="px-4 py-3">
          <Input aria-label="Search tools" placeholder="Search tools…" value={query} onChange={(event) => setQuery(event.target.value)} />
        </div>
        {tools.map((tool) => (
          <div className="px-4 py-2.5" key={tool.group + tool.name}>
            <p className="flex flex-wrap items-baseline gap-x-2">
              <span className="break-all font-mono text-xs text-ink-strong">{tool.name}</span>
              <span className="text-xs text-ink-faint">{tool.group}</span>
            </p>
            <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-ink-muted" title={tool.description}>
              {tool.description}
            </p>
          </div>
        ))}
        {resources.data && !tools.length && <SettingsNote>No matching tools. Clear the search to see every tool.</SettingsNote>}
      </SettingsGroup>

      <SettingsGroup collapsible description={resources.data ? `${resources.data.extensions.length} connected` : undefined} readOnly title="Extensions">
        {resources.data?.extensions.map((extension, index) => (
          <div className="px-4 py-2.5 text-xs" key={index}>
            <p className="break-all text-ink-strong">{extension.name}</p>
            <p className="mt-0.5 text-ink-muted">
              {extension.loaded ? `${extension.toolCount} tools registered` : "Load failed"}
              {extension.commands.length > 0 && ` · ${extension.commands.map((name) => `/${name}`).join(", ")}`}
            </p>
          </div>
        ))}
        {resources.data && !resources.data.extensions.length && <SettingsNote>No extensions connected.</SettingsNote>}
      </SettingsGroup>
    </SettingsPageShell>
  );
}
