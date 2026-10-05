import type {ModelDetails} from "@supernova/contracts/sessions/schemas";
import type {MouseEvent} from "react";
import {useRef, useState} from "react";
import Icon from "@/components/ui/icon";
import IconButton from "@/components/ui/icon-button";
import {MenuItem, MenuLabel} from "@/components/ui/menu";
import SearchField from "@/components/ui/search-field";
import {getModelPickerSections} from "@/features/sessions/lib/composer/model-picker/model-picker";
import {modelKey} from "@/features/sessions/lib/composer/model-picker/model-utils";
import {useModelPickerStore} from "@/features/sessions/stores/model-picker-store";
import {cn} from "@/lib/cn";

export interface ModelPickerProps {
  selectedModel: ModelDetails | undefined;
  disabled: boolean;
  models: readonly ModelDetails[];
  onModelChange: (value: string) => void;
}

/** Lists searchable models and keeps favorites available inside chat settings. */
export default function ModelPicker(props: ModelPickerProps) {
  const {disabled, models, onModelChange, selectedModel} = props;
  const [search, setSearch] = useState("");
  const resultsRef = useRef<HTMLDivElement>(null);

  const favoriteModelKeys = useModelPickerStore((state) => state.favoriteModelKeys);
  const recentModelKeys = useModelPickerStore((state) => state.recentModelKeys);
  const toggleFavoriteModel = useModelPickerStore((state) => state.toggleFavoriteModel);

  const sections = getModelPickerSections({favoriteModelKeys, models, recentModelKeys, search});
  const favoriteKeySet = new Set(favoriteModelKeys);

  const selectedModelKey = selectedModel ? modelKey(selectedModel.providerId, selectedModel.id) : undefined;

  const handleFavoriteClick = (event: MouseEvent<HTMLButtonElement>, value: string): void => {
    event.preventDefault();
    event.stopPropagation();
    toggleFavoriteModel(value);
  };

  return (
    <>
      <SearchField
        data-settings-focus=""
        onChange={(event) => setSearch(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") return;
          event.stopPropagation();
          if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
          event.preventDefault();
          const results = resultsRef.current?.querySelectorAll<HTMLElement>('[role="menuitemradio"]:not([data-disabled])');
          const target = event.key === "ArrowDown" ? results?.[0] : results?.[results.length - 1];
          target?.focus({preventScroll: true});
        }}
        onPointerDown={(event) => event.stopPropagation()}
        placeholder="Search models"
        value={search}
      />

      <div className="relative">
        <div className="scroll-fade-b max-h-60 overflow-y-auto p-1 [overflow-anchor:none]" ref={resultsRef}>
          {sections.length === 0 && <div className="px-3 py-7 text-center text-sm text-ink-muted">No models found</div>}
          {sections.map((section) => (
            <div className="pb-1" key={section.title}>
              <MenuLabel className="pb-1 text-xs">{section.title}</MenuLabel>
              <div className="space-y-0.5">
                {section.models.map((model) => {
                  const value = modelKey(model.providerId, model.id);
                  const selected = value === selectedModelKey;
                  const favorite = favoriteKeySet.has(value);
                  const showProvider = section.title === "Favorites" || section.title === "Recents";

                  return (
                    <div
                      className={cn(
                        "group flex cursor-pointer items-center gap-1.5 rounded-xl corner-superellipse/1.3 pr-2 transition-colors",
                        selected ? "bg-surface-control hover:bg-surface-popover" : "hover:bg-overlay-pressed"
                      )}
                      key={`${section.title}-${value}`}
                    >
                      <MenuItem
                        aria-label={model.name}
                        aria-checked={selected}
                        className="min-w-0 flex-1"
                        disabled={disabled}
                        onClick={() => onModelChange(value)}
                        role="menuitemradio"
                      >
                        <span className="flex items-baseline gap-1.5">
                          <span className={cn("truncate text-sm leading-5 text-ink", selected && "font-medium")}>{model.name}</span>
                          {showProvider && <span className="shrink-0 text-xs text-ink-faint">{model.providerName}</span>}
                        </span>
                      </MenuItem>
                      <IconButton
                        label={favorite ? "Remove from favorites" : "Add to favorites"}
                        className={cn(
                          "grid size-6 place-items-center rounded-lg corner-superellipse/1.3 text-ink-faint opacity-0 transition hover:text-ink-strong focus-visible:opacity-100 group-hover:opacity-100",
                          favorite && "text-ink-muted opacity-100"
                        )}
                        onClick={(event) => handleFavoriteClick(event, value)}
                        onPointerDown={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                        }}
                        size="none"
                        variant="primary"
                      >
                        <Icon className={favorite ? "fill-current [stroke:none]" : undefined} name={favorite ? "star-filled" : "star"} size="xs" />
                      </IconButton>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
