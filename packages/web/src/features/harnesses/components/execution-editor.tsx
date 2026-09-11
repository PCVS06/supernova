import type {HarnessExecution} from "@supernova/contracts/harnesses/schemas";
import {useSessionModels} from "@/features/sessions/hooks/api/use-session-models";
import {SettingsRow} from "@/features/settings/components/settings-group";
import ConfigChoice from "@/features/harnesses/components/config-choice";

const fallbackLevels = ["off", "minimal", "low", "medium", "high", "xhigh", "max"];

interface ExecutionEditorProps {
  value?: HarnessExecution;
  onChange: (value: HarnessExecution) => void;
  inheritLabel?: string;
  inherited?: HarnessExecution;
}

/** Uses the same connected model catalogue as chat, with model-native effort options. */
export default function ExecutionEditor(props: ExecutionEditorProps) {
  const {value, onChange, inherited, inheritLabel = "Use chat model"} = props;
  const models = useSessionModels();
  const selected = value?.model ?? inherited?.model;
  const model = models.data?.find((item) => item.id === selected?.id && item.providerId === selected?.providerId);
  const key = value?.model ? `${value.model.providerId}/${value.model.id}` : "";
  const levels =
    model?.thinkingLevels ??
    fallbackLevels.map((level) => ({
      value: level,
      label: level === "xhigh" ? "Extra high" : level.charAt(0).toUpperCase() + level.slice(1),
    }));

  return (
    <>
      <SettingsRow
        control={
          <ConfigChoice
            className="sm:w-64"
            label="Agent model"
            value={key}
            options={[
              {value: "", label: inheritLabel},
              ...(key && !models.data?.some((item) => `${item.providerId}/${item.id}` === key) ? [{value: key, label: `${selected?.id} · unavailable`}] : []),
              ...(models.data?.map((item) => ({value: `${item.providerId}/${item.id}`, label: `${item.name} · ${item.providerName}`})) ?? []),
            ]}
            onChange={(valueKey) => {
              const next = models.data?.find((item) => `${item.providerId}/${item.id}` === valueKey);
              onChange({
                ...value,
                model: next ? {id: next.id, providerId: next.providerId} : undefined,
                effort: next?.thinkingLevels.some((level) => level.value === value?.effort) ? value?.effort : undefined,
              });
            }}
          />
        }
        description={models.isError ? undefined : "Chosen from your connected providers."}
        title="Model"
      >
        {models.isError && <span className="text-xs text-danger-ink">Models unavailable. Check your provider connection.</span>}
      </SettingsRow>
      <SettingsRow
        control={
          <ConfigChoice
            className="sm:w-64"
            label="Agent reasoning effort"
            value={value?.effort ?? ""}
            options={[{value: "", label: inherited?.effort ? `Use project default · ${inherited.effort}` : "Use chat effort"}, ...levels]}
            onChange={(effort) => onChange({...value, effort: effort || undefined})}
          />
        }
        description="Only levels the selected model supports are offered."
        title="Reasoning effort"
      />
    </>
  );
}
