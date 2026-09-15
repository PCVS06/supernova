import type {HarnessConfig} from "@supernova/contracts/harnesses/schemas";
import Input from "@/components/ui/input";
import Switch from "@/components/ui/switch";
import SettingsPageShell from "@/features/settings/components/settings-page-shell";
import {SettingsGroup, SettingsRow} from "@/features/settings/components/settings-group";
import InstructionHistory from "@/features/harnesses/components/instruction-history";
import PromptEditor from "@/features/harnesses/components/prompt-editor";

interface InstructionsPageProps {
  harness: HarnessConfig;
  onChange: (change: Partial<HarnessConfig>) => void;
}

/** Everything this harness says to its agents before a chat starts: the shared manual, the coordination role, the context. */
export default function InstructionsPage(props: InstructionsPageProps) {
  const {harness, onChange} = props;
  const context = harness.context;

  return (
    <SettingsPageShell testId="harness-instructions">
      <SettingsGroup title="Shared manual">
        <SettingsRow description="Every project of this harness inherits these instructions." title="Shared instructions">
          <PromptEditor label="Shared operating instructions" value={harness.systemPrompt} onChange={(systemPrompt) => onChange({systemPrompt})} />
        </SettingsRow>
        <InstructionHistory target={{kind: "harness", harnessId: harness.id}} onRestore={(systemPrompt) => onChange({systemPrompt})} />
      </SettingsGroup>
      <SettingsGroup title="Coordination role">
        <SettingsRow description="Only the main orchestrator reads this; specialists keep their own prompts." title="Coordination role">
          <PromptEditor label="Coordination role prompt" value={harness.orchestratorPrompt ?? ""} onChange={(value) => onChange({orchestratorPrompt: value || undefined})} />
        </SettingsRow>
      </SettingsGroup>
      <SettingsGroup title="Context rules">
        <SettingsRow description="Loaded into every chat of this harness, before the conversation starts." title="Shared context instructions">
          <PromptEditor label="Context instructions" size="sm" value={context.instructions} onChange={(instructions) => onChange({context: {...context, instructions}})} />
        </SettingsRow>
        <SettingsRow
          control={
            <Switch
              aria-label="Include project instructions"
              checked={context.includeProjectInstructions}
              onCheckedChange={(includeProjectInstructions) => onChange({context: {...context, includeProjectInstructions}})}
            />
          }
          description="Reads each project's own AGENTS.md alongside these instructions."
          title="Include project AGENTS.md"
        />
        <SettingsRow
          control={
            <Switch aria-label="Automatic compaction" checked={context.autoCompaction} onCheckedChange={(autoCompaction) => onChange({context: {...context, autoCompaction}})} />
          }
          description="Summarizes older turns when the context window fills up."
          title="Automatic compaction"
        />
      </SettingsGroup>
      <SettingsGroup title="Context files">
        <SettingsRow description="Paths relative to each project, one per line." title="Files for every chat">
          <PromptEditor
            label="Context files"
            size="sm"
            placeholder="docs/architecture.md"
            value={context.files.join("\n")}
            onChange={(value) =>
              onChange({
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
              className="sm:w-40"
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
