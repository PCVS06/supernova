import type {CollaborationMode, HarnessConfig} from "@supernova/contracts/harnesses/schemas";
import Icon from "@/components/ui/icon";
import {MenuItem} from "@/components/ui/menu";
import {collaborationModes} from "@/features/sessions/components/composer/pickers/settings-options";

export interface HarnessPickerProps {
  readonly harnesses: readonly Pick<HarnessConfig, "id" | "name" | "description">[];
  readonly selected: {readonly harnessId: string; readonly name: string; readonly mode: CollaborationMode} | undefined;
  readonly disabled: boolean;
  readonly pending?: boolean;
  readonly onChange: (harnessId: string, mode: CollaborationMode) => void;
  readonly onCancel?: () => void;
  readonly section: "harness" | "mode";
}

/** Renders harness or collaboration choices inside the shared chat settings menu. */
export default function HarnessPicker(props: HarnessPickerProps) {
  const {harnesses, selected, disabled, onChange, section} = props;
  const choices = section === "harness" ? harnesses : collaborationModes;

  return (
    <div className="max-h-60 overflow-y-auto">
      {choices.map((item) => {
        const checked = section === "harness" ? item.id === selected?.harnessId : item.id === selected?.mode;
        return (
          <MenuItem
            key={item.id}
            disabled={disabled || !selected}
            role="menuitemradio"
            aria-checked={checked}
            trailing={checked ? <Icon name="check" size="xs" /> : undefined}
            onClick={() => {
              if (!selected) return;
              onChange(section === "harness" ? item.id : selected.harnessId, section === "mode" ? (item.id as CollaborationMode) : selected.mode);
            }}
          >
            {item.name}
          </MenuItem>
        );
      })}
      {section === "mode" && <p className="px-2 py-2 text-xs text-ink-muted">Team modes: read-only · $3 / 5 min per turn, plus final answer.</p>}
    </div>
  );
}
