import type {HarnessConfig} from "@supernova/contracts/harnesses/schemas";
import Input from "@/components/ui/input";
import Switch from "@/components/ui/switch";
import SettingsPageShell from "@/features/settings/components/settings-page-shell";
import {SettingsGroup, SettingsRow} from "@/features/settings/components/settings-group";
import InstructionHistory from "@/features/harnesses/components/instruction-history";
import PromptEditor from "@/features/harnesses/components/prompt-editor";
import {resolveHarnessPage} from "@/features/harnesses/lib/harness-sections";

interface InstructionsPageProps {
  harness: HarnessConfig;
  onChange: (change: Partial<HarnessConfig>) => void;
}

/**
 * What every chat of this harness is told, in the order the runtime assembles it:
 * the shared instructions, the lead role, then the context rules and files, with compaction last.
 */
export default function InstructionsPage(props: InstructionsPageProps) {
  const {harness, onChange} = props;
  const context = harness.context;
  const page = resolveHarnessPage("instructions");

  return (
    <SettingsPageShell description={page.description} testId="harness-instructions" title={page.label}>
      <SettingsGroup description="Read first by every agent in every project. A project adds its own on its Instructions tab." title="Shared instructions">
        <div className="p-3">
          <PromptEditor label="Shared operating instructions" size="lg" value={harness.systemPrompt} onChange={(systemPrompt) => onChange({systemPrompt})} />
        </div>
        <InstructionHistory target={{kind: "harness", harnessId: harness.id}} onRestore={(systemPrompt) => onChange({systemPrompt})} />
      </SettingsGroup>
      <SettingsGroup
        description="How a project's main chat agent leads it, unless the project sets its own role on its Lead tab. Specialists have their own role under Agents."
        title="Lead role"
      >
        <div className="p-3">
          <PromptEditor
            label="Default lead role prompt"
            placeholder="Lead this project's work and review any delegated results."
            value={harness.orchestratorPrompt ?? ""}
            onChange={(value) => onChange({orchestratorPrompt: value || undefined})}
          />
        </div>
      </SettingsGroup>
      <SettingsGroup title="Context">
        <SettingsRow description="Added after the role in every chat of this harness. A project appends its own on its Instructions tab." title="Context rules">
          <PromptEditor label="Context instructions" size="sm" value={context.instructions} onChange={(instructions) => onChange({context: {...context, instructions}})} />
        </SettingsRow>
        <SettingsRow description="Loaded into every chat, one path per line, relative to the project folder." title="Context files">
          <PromptEditor
            label="Context files"
            size="sm"
            placeholder="docs/architecture.md"
            value={context.files.join("\n")}
            onChange={(value) =>
              onChange({
                context: {
                  ...context,
                  files: value.split("\n"),
                },
              })
            }
          />
        </SettingsRow>
        <SettingsRow
          control={
            <Switch
              aria-label="Include project instructions"
              checked={context.includeProjectInstructions}
              onCheckedChange={(includeProjectInstructions) => onChange({context: {...context, includeProjectInstructions}})}
            />
          }
          description="Reads each project folder's own AGENTS.md alongside these instructions."
          title="Include project AGENTS.md"
        />
      </SettingsGroup>
      <SettingsGroup collapsible description={context.autoCompaction ? "On · older turns are summarized when the context fills up" : "Off"} title="Compaction">
        <SettingsRow
          control={
            <Switch aria-label="Automatic compaction" checked={context.autoCompaction} onCheckedChange={(autoCompaction) => onChange({context: {...context, autoCompaction}})} />
          }
          description="Summarizes older turns when the context window fills up."
          title="Automatic compaction"
        />
        <SettingsRow
          control={
            <Input
              aria-label="Reserved tokens"
              className="@xl:w-40"
              type="number"
              min={1024}
              max={100000}
              value={context.reserveTokens}
              onChange={(event) => onChange({context: {...context, reserveTokens: Number(event.target.value)}})}
            />
          }
          description="Held back for the model's reply."
          title="Reserved tokens"
        />
        <SettingsRow
          control={
            <Input
              aria-label="Recent tokens to keep"
              className="@xl:w-40"
              type="number"
              min={1024}
              max={100000}
              value={context.keepRecentTokens}
              onChange={(event) => onChange({context: {...context, keepRecentTokens: Number(event.target.value)}})}
            />
          }
          description="Never compacted, so the latest turns stay verbatim."
          title="Recent tokens to keep"
        />
      </SettingsGroup>
    </SettingsPageShell>
  );
}
