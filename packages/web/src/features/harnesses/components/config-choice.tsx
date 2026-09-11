import {useState} from "react";
import Button from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import Menu, {MenuItem, MenuLabel} from "@/components/ui/menu";
import SearchField from "@/components/ui/search-field";

/** Keyboard-accessible dark choices using the same menu surface as the chat composer. */
export default function ConfigChoice({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly {value: string; label: string}[];
  onChange: (value: string) => void;
}) {
  const [query, setQuery] = useState("");
  const selected = options.find((item) => item.value === value);
  const filtered = options.filter((item) => item.label.toLowerCase().includes(query.toLowerCase()));
  return (
    <Menu
      align="start"
      triggerLabel={label}
      className="w-(--anchor-width) min-w-56 max-w-[calc(100vw-2rem)]"
      onOpenChange={(open) => {
        if (open) setQuery("");
      }}
      trigger={(props) => (
        <Button
          {...props}
          className="flex h-10 w-full min-w-0 items-center justify-between gap-3 rounded-lg border border-border bg-surface-control px-3 text-left text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ink-faint"
        >
          <span className="truncate">{selected?.label ?? `${value} · not supported by this model`}</span>
          <Icon name="chevron-down" size="xs" className="shrink-0 text-ink-muted" />
        </Button>
      )}
    >
      <MenuLabel>{label}</MenuLabel>
      {options.length > 12 && (
        <SearchField placeholder="Find option…" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => event.stopPropagation()} />
      )}
      <div className="max-h-64 overflow-y-auto overscroll-contain">
        {filtered.map((item) => (
          <MenuItem key={item.value} onClick={() => onChange(item.value)} trailing={item.value === value && <Icon name="check" size="xs" />}>
            {item.label}
          </MenuItem>
        ))}
        {!filtered.length && <p className="p-3 text-xs text-ink-muted">No matching options</p>}
      </div>
    </Menu>
  );
}
