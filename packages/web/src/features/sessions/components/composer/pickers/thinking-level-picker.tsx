import type {ThinkingLevelOption} from "@supernova/contracts/sessions/schemas";
import {use, useRef, useState} from "react";
import {ComposerFocusContext} from "@/features/sessions/contexts/composer-focus-context";
import Button from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import Menu, {MenuItem} from "@/components/ui/menu";
import "@/features/sessions/components/composer/pickers/thinking-level-picker.css";

interface ThinkingLevelPickerProps {
  disabled: boolean;
  onThinkingLevelChange: (value: string) => void;
  selectedThinkingLabel: string;
  selectedThinkingLevel: string | undefined;
  thinkingLevels: readonly ThinkingLevelOption[];
}

/** Opens the model's effort levels on click and returns focus to the draft after selection. */
export default function ThinkingLevelPicker(props: ThinkingLevelPickerProps) {
  const {disabled, onThinkingLevelChange, selectedThinkingLabel, selectedThinkingLevel, thinkingLevels} = props;
  const focusEditor = use(ComposerFocusContext);
  const [open, setOpen] = useState(false);
  const selectedOption = useRef(false);
  const current = Math.max(
    0,
    thinkingLevels.findIndex((level) => level.value === selectedThinkingLevel)
  );
  const maximum = Math.max(1, thinkingLevels.length - 1);

  return (
    <Menu
      align="start"
      side="top"
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) selectedOption.current = false;
        setOpen(nextOpen);
      }}
      onOpenChangeComplete={(nextOpen) => {
        if (!nextOpen && selectedOption.current) {
          focusEditor?.()?.focus({preventScroll: true});
        }
      }}
      finalFocus={() => (selectedOption.current ? (focusEditor?.() ?? true) : true)}
      triggerLabel="Reasoning effort"
      trigger={(triggerProps) => (
        <Button
          {...triggerProps}
          disabled={disabled || thinkingLevels.length < 2}
          className="effort-dial flex shrink-0 items-center gap-1.5 rounded-lg px-1.5 py-1 text-xs"
          title="Choose reasoning effort"
        >
          <svg className="size-6 shrink-0" viewBox="0 0 32 32" fill="none" aria-hidden="true">
            <circle cx="16" cy="16" r="10" stroke="currentColor" strokeOpacity="0.4" />
            <g className="effort-dial-needle" style={{transform: `rotate(${-135 + (current / maximum) * 270}deg)`}}>
              <path d="M16 13V8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </g>
          </svg>
          <span className="min-w-10 text-left">{selectedThinkingLabel}</span>
          <Icon name="chevron-down" size="xs" />
        </Button>
      )}
    >
      {thinkingLevels.map((level) => (
        <MenuItem
          key={level.value}
          role="menuitemradio"
          aria-checked={level.value === selectedThinkingLevel}
          trailing={level.value === selectedThinkingLevel ? <Icon name="check" size="xs" /> : undefined}
          onClick={() => {
            selectedOption.current = true;
            if (level.value !== selectedThinkingLevel) onThinkingLevelChange(level.value);
            setOpen(false);
          }}
        >
          {level.label}
        </MenuItem>
      ))}
    </Menu>
  );
}
