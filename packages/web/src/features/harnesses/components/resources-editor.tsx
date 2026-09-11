import {useState} from "react";
import type {HarnessConfig, HarnessProject} from "@supernova/contracts/harnesses/schemas";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Switch from "@/components/ui/switch";
import SettingsPageShell from "@/features/settings/components/settings-page-shell";
import {SettingsGroup, SettingsRow} from "@/features/settings/components/settings-group";
import ConfigCard from "@/features/harnesses/components/config-card";
import PromptEditor from "@/features/harnesses/components/prompt-editor";
import SkillsEditor from "@/features/harnesses/components/skills-editor";
import ToolCredentialsEditor from "@/features/harnesses/components/tool-credentials-editor";
import {useHarnessResources} from "@/features/harnesses/hooks/api/use-harness-resources";
import type {HarnessSectionId} from "@/features/harnesses/lib/harness-sections";

interface ResourcesEditorProps {
  harness: HarnessConfig;
  project?: HarnessProject;
  section: HarnessSectionId;
  /** Leaves the project scope so harness-wide context can be edited. */
  onOpenShared: () => void;
  onChangeHarness: (change: Partial<HarnessConfig>) => void;
  onChangeProject: (change: Partial<HarnessProject>) => void;
}

/** Everything an agent may reach for: skills, tools, connectors, and the context it always loads. */
export default function ResourcesEditor(props: ResourcesEditorProps) {
  const {harness, project, section, onOpenShared, onChangeHarness, onChangeProject} = props;
  const [query, setQuery] = useState("");
  const resources = useHarnessResources(harness.id, project?.id);
  const tools = resources.data?.tools.filter((tool) => `${tool.name} ${tool.description} ${tool.group}`.toLowerCase().includes(query.toLowerCase())) ?? [];
  const research = resources.data?.tools.some((tool) => tool.name === "research_literature_search");
  const context = harness.context;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <SettingsPageShell>
        {section !== "skills" && section !== "context" && resources.isPending && <p className="px-3 text-sm text-ink-muted sm:px-4">Inspecting configured resources…</p>}
        {section !== "skills" && section !== "context" && resources.isError && (
          <p className="px-3 text-sm text-danger-ink sm:px-4" role="alert">
            Could not inspect resources.{" "}
            <Button className="underline" onClick={() => void resources.refetch()}>
              Retry
            </Button>
          </p>
        )}
        {!!resources.data?.warnings.length && section !== "skills" && section !== "context" && (
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

        {section === "skills" && (
          <SettingsGroup title="Skills">
            <SkillsEditor
              harnessId={harness.id}
              inherited={project ? harness.enabledSkills : undefined}
              value={project ? project.enabledSkills : harness.enabledSkills}
              onChange={(enabledSkills) => (project ? onChangeProject({enabledSkills}) : onChangeHarness({enabledSkills}))}
            />
          </SettingsGroup>
        )}

        {section === "tools" && resources.data && (
          <SettingsGroup title="Tools">
            <SettingsRow
              control={<Input aria-label="Search tools" className="sm:w-64" placeholder="Search tools…" value={query} onChange={(event) => setQuery(event.target.value)} />}
              description="Registered by the connected extensions. Tools are read-only here."
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
              {!tools.length && <ConfigCard className="text-sm text-ink-muted">No matching tools.</ConfigCard>}
              <details className="rounded-xl border border-border p-4">
                <summary className="cursor-pointer text-sm">Connected extensions · {resources.data.extensions.length}</summary>
                <div className="mt-4 space-y-3">
                  {resources.data.extensions.map((extension, index) => (
                    <div key={index} className="text-xs">
                      <p>
                        {extension.name} · {extension.loaded ? `${extension.toolCount} tools registered` : "Load failed"}
                      </p>
                      {extension.commands.length > 0 && <p className="mt-1 text-ink-muted">{extension.commands.map((name) => `/${name}`).join(", ")}</p>}
                    </div>
                  ))}
                </div>
              </details>
            </div>
          </SettingsGroup>
        )}

        {section === "connectors" &&
          resources.data &&
          (research ? (
            <SettingsGroup title="Connectors & API keys">
              <div className="px-3 sm:px-4">
                <ToolCredentialsEditor />
              </div>
            </SettingsGroup>
          ) : (
            <SettingsGroup title="Connectors & API keys">
              <SettingsRow description="Connect an extension that requires credentials and its keys appear here." title="No supported external connectors registered" />
            </SettingsGroup>
          ))}

        {section === "context" && (
          <>
            <SettingsGroup title="Context rules">
              <SettingsRow
                description={
                  project ? "Added to the shared context instructions for this project's chats only." : "Loaded into every chat of this harness, before the conversation starts."
                }
                title={project ? "Additional project context" : "Shared context instructions"}
              >
                <PromptEditor
                  label="Context instructions"
                  size="sm"
                  value={project?.contextInstructions ?? context.instructions}
                  onChange={(instructions) => (project ? onChangeProject({contextInstructions: instructions}) : onChangeHarness({context: {...context, instructions}}))}
                />
              </SettingsRow>
              {!project && (
                <>
                  <SettingsRow
                    control={
                      <Switch
                        aria-label="Include project instructions"
                        checked={context.includeProjectInstructions}
                        onCheckedChange={(includeProjectInstructions) => onChangeHarness({context: {...context, includeProjectInstructions}})}
                      />
                    }
                    description="Reads each project's own AGENTS.md alongside these instructions."
                    title="Include project AGENTS.md"
                  />
                  <SettingsRow
                    control={
                      <Switch
                        aria-label="Automatic compaction"
                        checked={context.autoCompaction}
                        onCheckedChange={(autoCompaction) => onChangeHarness({context: {...context, autoCompaction}})}
                      />
                    }
                    description="Summarizes older turns when the context window fills up."
                    title="Automatic compaction"
                  />
                </>
              )}
            </SettingsGroup>
            {!project && (
              <>
                <SettingsGroup title="Context files">
                  <SettingsRow description="Paths relative to each project, one per line. Loaded at chat startup." title="Files loaded into every chat">
                    <PromptEditor
                      label="Context files"
                      size="sm"
                      placeholder="docs/architecture.md"
                      value={context.files.join("\n")}
                      onChange={(value) =>
                        onChangeHarness({
                          context: {
                            ...context,
                            files: value
                              .split("\n")
                              .map((file) => file.trim())
                              .filter(Boolean),
                          },
                        })
                      }
                    />
                  </SettingsRow>
                </SettingsGroup>
                <SettingsGroup title="Context budget">
                  <SettingsRow
                    control={
                      <Input
                        aria-label="Reserved tokens"
                        className="sm:w-40"
                        type="number"
                        min={1024}
                        max={100000}
                        value={context.reserveTokens}
                        onChange={(event) => onChangeHarness({context: {...context, reserveTokens: Number(event.target.value)}})}
                      />
                    }
                    description="Held back for the model's reply."
                    title="Reserved tokens"
                  />
                  <SettingsRow
                    control={
                      <Input
                        aria-label="Recent tokens to keep"
                        className="sm:w-40"
                        type="number"
                        min={1024}
                        max={100000}
                        value={context.keepRecentTokens}
                        onChange={(event) => onChangeHarness({context: {...context, keepRecentTokens: Number(event.target.value)}})}
                      />
                    }
                    description="Never compacted, so the latest turns stay verbatim."
                    title="Recent tokens to keep"
                  />
                </SettingsGroup>
              </>
            )}
            {project && (
              <SettingsGroup title="Shared context">
                <SettingsRow
                  control={
                    <Button className="rounded-lg border border-border px-3 py-2 text-xs text-ink-muted hover:text-ink" onClick={onOpenShared}>
                      Open shared context
                    </Button>
                  }
                  description="Context files, AGENTS.md loading and the context budget are shared by every project."
                  title="Harness-wide context settings"
                />
              </SettingsGroup>
            )}
          </>
        )}
      </SettingsPageShell>
    </div>
  );
}
