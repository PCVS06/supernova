import {use, useRef, useState} from "react";
import Button from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import Menu, {MenuItem, MenuLabel} from "@/components/ui/menu";
import HarnessPicker from "@/features/sessions/components/composer/pickers/harness-picker";
import type {HarnessPickerProps} from "@/features/sessions/components/composer/pickers/harness-picker";
import ModelPicker from "@/features/sessions/components/composer/pickers/model-picker";
import type {ModelPickerProps} from "@/features/sessions/components/composer/pickers/model-picker";
import ThinkingLevelPicker from "@/features/sessions/components/composer/pickers/thinking-level-picker";
import type {ThinkingLevelPickerProps} from "@/features/sessions/components/composer/pickers/thinking-level-picker";
import {collaborationModes} from "@/features/sessions/components/composer/pickers/settings-options";
import {ComposerFocusContext} from "@/features/sessions/contexts/composer-focus-context";

type SettingsSection = "harness" | "mode" | "model" | "effort";

const sectionLabels: Record<SettingsSection, string> = {harness: "Harness", mode: "Team", model: "Model", effort: "Effort"};

/** Transfers focus within the same menu when its settings page is replaced. */
function focusSettingsSection(element: HTMLDivElement | null): void {
  if (!element) return;
  const target =
    element.querySelector<HTMLElement>("[data-settings-focus]:not([data-disabled])") ??
    element.querySelector<HTMLElement>('[role="menuitemradio"][aria-checked="true"]:not([data-disabled])') ??
    element.querySelector<HTMLElement>('[role="menuitem"]:not([data-disabled]), [role="menuitemradio"]:not([data-disabled])');
  target?.focus({preventScroll: true});
}

interface SettingsRowProps {
  readonly label: string;
  readonly value: string;
  readonly disabled: boolean;
  readonly restoreFocus?: boolean;
  readonly onClick: () => void;
}

function SettingsRow(props: SettingsRowProps) {
  const {label, value, disabled, restoreFocus, onClick} = props;
  return (
    <MenuItem
      aria-label={label}
      closeOnClick={false}
      data-settings-focus={restoreFocus ? "" : undefined}
      disabled={disabled}
      onClick={onClick}
      trailing={<Icon name="chevron-right" size="xs" />}
    >
      <span className="flex min-w-0 items-center gap-4">
        <span className="w-14 shrink-0 text-ink-muted">{label}</span>
        <span className="min-w-0 flex-1 truncate text-right">{value}</span>
      </span>
    </MenuItem>
  );
}

interface ComposerSettingsPickerProps {
  readonly harness: Omit<HarnessPickerProps, "section">;
  readonly model: ModelPickerProps;
  readonly thinking: ThinkingLevelPickerProps;
}

/** Keeps harness, team, model and effort choices behind one compact composer control. */
export default function ComposerSettingsPicker(props: ComposerSettingsPickerProps) {
  const {harness, model, thinking} = props;
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<{section: SettingsSection | null; returnTo: SettingsSection | null}>({section: null, returnTo: null});
  const {section} = view;
  const chosen = useRef(false);
  const escapeTrigger = useRef<HTMLElement | null>(null);
  const focusEditor = use(ComposerFocusContext);
  const mode = collaborationModes.find((item) => item.id === harness.selected?.mode)?.name ?? "Solo";
  const summary = [harness.selected?.name, mode, model.selectedModel?.name, thinking.thinkingLevels.length > 0 ? thinking.selectedThinkingLabel : undefined]
    .filter(Boolean)
    .join(" · ");

  const closeAfterChoice = (): void => {
    chosen.current = true;
    setOpen(false);
  };

  const showSection = (next: SettingsSection | null): void => {
    setView({section: next, returnTo: next ?? view.returnTo});
  };

  return (
    <Menu
      align="start"
      side="top"
      className="w-80 max-w-[calc(100vw-2rem)]"
      open={open}
      onOpenChange={(value, details) => {
        escapeTrigger.current = !value && details.reason === "escape-key" && details.trigger instanceof HTMLElement ? details.trigger : null;
        if (value) {
          chosen.current = false;
          setView({section: null, returnTo: null});
        }
        setOpen(value);
      }}
      onOpenChangeComplete={(value) => {
        if (value) return;
        // A quick Escape can close before the menu's default focus return is ready.
        const target = chosen.current ? focusEditor?.() : escapeTrigger.current;
        target?.focus({preventScroll: true});
      }}
      finalFocus={() => (chosen.current ? (focusEditor?.() ?? true) : (escapeTrigger.current ?? true))}
      triggerLabel="Chat settings"
      trigger={(triggerProps) => (
        <Button {...triggerProps} className="flex min-w-0 items-center gap-1.5 px-1.5 py-1 text-xs" disabled={harness.disabled && model.disabled} title={summary} variant="primary">
          <Icon name="settings" size="xs" />
          <span className="max-w-40 truncate">{model.selectedModel?.name ?? "Settings"}</span>
          {thinking.thinkingLevels.length > 0 && <span className="shrink-0 text-ink-muted">· {thinking.selectedThinkingLabel}</span>}
          {harness.pending && <span className="shrink-0 text-ink-muted">Next</span>}
          <Icon name="chevron-down" size="xs" />
        </Button>
      )}
    >
      <div key={section ?? "overview"} ref={focusSettingsSection}>
        {section === null ? (
          <>
            <MenuLabel>Chat settings</MenuLabel>
            <SettingsRow
              label="Harness"
              value={harness.selected?.name ?? "Unavailable"}
              disabled={harness.disabled || !harness.selected}
              restoreFocus={view.returnTo === "harness"}
              onClick={() => showSection("harness")}
            />
            <SettingsRow label="Team" value={mode} disabled={harness.disabled || !harness.selected} restoreFocus={view.returnTo === "mode"} onClick={() => showSection("mode")} />
            <SettingsRow
              label="Model"
              value={model.selectedModel?.name ?? "Select"}
              disabled={model.disabled || model.models.length === 0}
              restoreFocus={view.returnTo === "model"}
              onClick={() => showSection("model")}
            />
            {thinking.thinkingLevels.length > 0 && (
              <SettingsRow
                label="Effort"
                value={thinking.selectedThinkingLabel}
                disabled={thinking.disabled || thinking.thinkingLevels.length < 2}
                restoreFocus={view.returnTo === "effort"}
                onClick={() => showSection("effort")}
              />
            )}
            {harness.pending && (
              <p role="status" className="px-2 py-2 text-xs text-ink-muted">
                Harness change · next turn
              </p>
            )}
            {harness.pending && harness.onCancel && (
              <MenuItem
                disabled={harness.disabled}
                onClick={() => {
                  harness.onCancel?.();
                  closeAfterChoice();
                }}
              >
                Cancel setup change
              </MenuItem>
            )}
          </>
        ) : (
          <>
            <MenuItem aria-label="Back to chat settings" closeOnClick={false} icon={<Icon name="chevron-down" className="rotate-90" size="xs" />} onClick={() => showSection(null)}>
              {sectionLabels[section]}
            </MenuItem>
            {(section === "harness" || section === "mode") && (
              <HarnessPicker
                {...harness}
                section={section}
                onChange={(harnessId, mode) => {
                  if (harnessId !== harness.selected?.harnessId || mode !== harness.selected.mode) harness.onChange(harnessId, mode);
                  closeAfterChoice();
                }}
              />
            )}
            {section === "model" && (
              <ModelPicker
                {...model}
                onModelChange={(value) => {
                  model.onModelChange(value);
                  closeAfterChoice();
                }}
              />
            )}
            {section === "effort" && (
              <ThinkingLevelPicker
                {...thinking}
                onThinkingLevelChange={(value) => {
                  if (value !== thinking.selectedThinkingLevel) thinking.onThinkingLevelChange(value);
                  closeAfterChoice();
                }}
              />
            )}
          </>
        )}
      </div>
    </Menu>
  );
}
