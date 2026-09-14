import type {UseQueryResult} from "@tanstack/react-query";
import type {KeyboardEvent, ReactNode, RefObject} from "react";
import {useRef, useState} from "react";
import {Popover} from "@base-ui/react/popover";
import Button from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import {MenuLabel} from "@/components/ui/menu";
import type {ComposerSuggestionItem} from "@/features/sessions/types/composer-suggestion";
import {cn} from "@/lib/cn";

interface ComposerSuggestionSection {
  readonly items: readonly (ComposerSuggestionItem & {readonly index: number})[];
  readonly title: string;
}

function suggestionSections(items: readonly ComposerSuggestionItem[]): readonly ComposerSuggestionSection[] {
  const indexedItems = items.map((item, index) => ({...item, index}));

  return [
    {items: indexedItems.filter((item) => item.kind === "file"), title: "Files"},
    {items: indexedItems.filter((item) => item.kind === "skill"), title: "Skills"},
    {items: indexedItems.filter((item) => item.kind === "prompt-template"), title: "Prompts"},
    {items: indexedItems.filter((item) => item.kind === "slash-command"), title: "Commands"},
  ].filter((section) => section.items.length > 0);
}

function SuggestionIcon(props: {readonly item: ComposerSuggestionItem}) {
  const {item} = props;

  if (item.kind === "file") return <Icon className="shrink-0 text-ink-muted" name={item.path.endsWith("/") ? "folder" : "file"} size="xs" />;
  if (item.kind === "skill") return <Icon className="shrink-0 text-ink-muted" name="skill" size="xs" />;
  if (item.kind === "slash-command" && item.icon) return <Icon className="shrink-0 text-ink-muted" name={item.icon} size="xs" />;

  return <span className="w-3 shrink-0 text-center text-xs font-medium text-ink-muted">{item.kind.slice(0, 1).toUpperCase()}</span>;
}

interface SuggestionPanelProps {
  readonly children: ReactNode;
  readonly className?: string;
  readonly anchor: RefObject<HTMLDivElement | null>;
  readonly onDismiss: () => void;
}

function SuggestionPanel(props: SuggestionPanelProps) {
  const {children, className, anchor, onDismiss} = props;

  return (
    <Popover.Root
      open
      modal={false}
      onOpenChange={(open) => {
        if (!open) onDismiss();
      }}
    >
      <Popover.Portal>
        <Popover.Positioner
          anchor={() => anchor.current?.closest('[aria-label="Message composer"]') ?? anchor.current}
          side="top"
          align="start"
          sideOffset={8}
          collisionPadding={12}
          positionMethod="fixed"
          className="z-50"
          style={{width: "var(--anchor-width)"}}
        >
          <Popover.Popup
            initialFocus={false}
            finalFocus={false}
            aria-label="Composer suggestions"
            className={cn("overflow-hidden rounded-xl border border-border bg-surface-drawer text-ink", className)}
          >
            <div data-suggestion-scroll className="overflow-y-auto overscroll-contain p-1" style={{maxHeight: "min(16rem, var(--available-height))"}}>
              {children}
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

interface ComposerSuggestionItemRowProps {
  readonly highlighted: boolean;
  readonly item: ComposerSuggestionItem;
  readonly onHoverEnd: () => void;
  readonly onPointerHover: () => void;
  readonly onSelect: () => void;
  readonly shouldScrollIntoView: boolean;
}

function ComposerSuggestionItemRow(props: ComposerSuggestionItemRowProps) {
  const {highlighted, item, onHoverEnd, onPointerHover, onSelect, shouldScrollIntoView} = props;
  const detail = item.subtitle;

  return (
    <div
      className={cn("group flex items-center gap-1 rounded-xl corner-superellipse/1.3", highlighted && "bg-overlay-pressed")}
      onMouseLeave={onHoverEnd}
      onPointerMove={onPointerHover}
      ref={(element) => {
        if (shouldScrollIntoView && element) {
          const viewport = element.closest<HTMLElement>("[data-suggestion-scroll]");
          if (!viewport) return;
          const row = element.getBoundingClientRect();
          const bounds = viewport.getBoundingClientRect();
          if (row.top < bounds.top) viewport.scrollTop -= bounds.top - row.top;
          else if (row.bottom > bounds.bottom) viewport.scrollTop += row.bottom - bounds.bottom;
        }
      }}
    >
      <Button
        className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 px-2 py-1.5 text-left"
        onClick={onSelect}
        onPointerDown={(event) => event.preventDefault()}
        variant="bare"
      >
        <SuggestionIcon item={item} />
        <span className="flex min-w-0 flex-1 items-baseline gap-2 text-sm">
          <span className="shrink-0 font-medium text-ink">{item.title}</span>
          {detail && <span className="min-w-0 flex-1 truncate text-ink-muted">{detail}</span>}
        </span>
      </Button>
    </div>
  );
}

interface ComposerSuggestionMenuProps {
  readonly children: ReactNode;
  readonly onSelect: (item: ComposerSuggestionItem) => void;
  readonly onSubmit: () => void;
  readonly onDismiss: () => void;
  readonly open: boolean;
  readonly query: Pick<UseQueryResult<readonly ComposerSuggestionItem[]>, "data" | "isLoading" | "isError" | "isSuccess" | "error">;
}

export default function ComposerSuggestionMenu(props: ComposerSuggestionMenuProps) {
  const {children, onSelect, onSubmit, onDismiss, open, query} = props;
  const anchor = useRef<HTMLDivElement>(null);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
  const [hoveredSuggestionIndex, setHoveredSuggestionIndex] = useState<number | null>(null);
  const [selectionSource, setSelectionSource] = useState<"keyboard" | "mouse">("keyboard");
  const [previousOpen, setPreviousOpen] = useState(open);

  if (open !== previousOpen) {
    setPreviousOpen(open);
    setActiveSuggestionIndex(0);
    setHoveredSuggestionIndex(null);
    setSelectionSource("keyboard");
  }

  const items = query.data ?? [];
  const sections = suggestionSections(items);
  const showLoadingPanel = open && query.isLoading;
  const showSettledPanel = open && !query.isLoading && (query.isError || items.length > 0 || query.isSuccess);
  const highlightedIndex = items.length === 0 ? -1 : Math.min(activeSuggestionIndex, items.length - 1);
  const activeSuggestion = highlightedIndex >= 0 ? items[highlightedIndex] : undefined;
  const visibleHighlightIndex = hoveredSuggestionIndex ?? highlightedIndex;

  const handleSuggestionHoverStart = (index: number): void => {
    setHoveredSuggestionIndex(index);
    setSelectionSource("mouse");
    setActiveSuggestionIndex(index);
  };

  const handleKeyDownCapture = (event: KeyboardEvent<HTMLElement>): void => {
    if (open && event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      onDismiss();
      return;
    }
    if (event.metaKey || event.ctrlKey || event.shiftKey) return;
    if (open && items.length > 0 && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      event.preventDefault();
      event.stopPropagation();
      setHoveredSuggestionIndex(null);
      setSelectionSource("keyboard");
      setActiveSuggestionIndex((current) => {
        const delta = event.key === "ArrowDown" ? 1 : -1;
        const selectedIndex = Math.max(0, Math.min(current, items.length - 1));
        return (selectedIndex + delta + items.length) % items.length;
      });
      return;
    }

    if (open && activeSuggestion && (event.key === "Tab" || event.key === "Enter")) {
      event.preventDefault();
      event.stopPropagation();
      onSelect(activeSuggestion);
      return;
    }

    if (event.key !== "Enter" || event.shiftKey) return;

    event.preventDefault();
    event.stopPropagation();
    onSubmit();
  };

  return (
    <div className="relative" ref={anchor} onKeyDownCapture={handleKeyDownCapture}>
      {showLoadingPanel && (
        <SuggestionPanel anchor={anchor} onDismiss={onDismiss} className="opacity-100 delay-200 starting:opacity-0">
          <p className="px-3 py-2 text-sm text-ink-faint">Loading suggestions...</p>
        </SuggestionPanel>
      )}
      {showSettledPanel && (
        <SuggestionPanel anchor={anchor} onDismiss={onDismiss}>
          {query.isError && <p className="px-3 py-2 text-sm text-danger-ink">{query.error instanceof Error ? query.error.message : "Unable to load suggestions."}</p>}
          {!query.isError && items.length === 0 && <p className="px-3 py-2 text-sm text-ink-faint">No items</p>}

          {!query.isError &&
            sections.map((section) => (
              <div className="pb-1" key={section.title}>
                <MenuLabel>{section.title}</MenuLabel>
                {section.items.map((item) => (
                  <ComposerSuggestionItemRow
                    highlighted={item.index === visibleHighlightIndex}
                    item={item}
                    key={`${item.kind}-${item.id}`}
                    onHoverEnd={() => setHoveredSuggestionIndex(null)}
                    onPointerHover={() => handleSuggestionHoverStart(item.index)}
                    onSelect={() => onSelect(item)}
                    shouldScrollIntoView={selectionSource === "keyboard" && hoveredSuggestionIndex === null && item.index === highlightedIndex}
                  />
                ))}
              </div>
            ))}
        </SuggestionPanel>
      )}
      {children}
    </div>
  );
}
