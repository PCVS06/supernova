import type {ThinkingLevelOption} from "@supernova/contracts/sessions/schemas";
import Icon from "@/components/ui/icon";
import {MenuItem} from "@/components/ui/menu";

export interface ThinkingLevelPickerProps {
  readonly disabled: boolean;
  readonly onThinkingLevelChange: (value: string) => void;
  readonly selectedThinkingLabel: string;
  readonly selectedThinkingLevel: string | undefined;
  readonly thinkingLevels: readonly ThinkingLevelOption[];
}

/** Renders the selected model's supported effort choices in chat settings. */
export default function ThinkingLevelPicker(props: ThinkingLevelPickerProps) {
  const {disabled, onThinkingLevelChange, selectedThinkingLevel, thinkingLevels} = props;

  return thinkingLevels.map((level) => (
    <MenuItem
      key={level.value}
      disabled={disabled}
      role="menuitemradio"
      aria-checked={level.value === selectedThinkingLevel}
      trailing={level.value === selectedThinkingLevel ? <Icon name="check" size="xs" /> : undefined}
      onClick={() => onThinkingLevelChange(level.value)}
    >
      {level.label}
    </MenuItem>
  ));
}
