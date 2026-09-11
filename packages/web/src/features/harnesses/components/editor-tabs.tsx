import type {ReactNode} from "react";
import Button from "@/components/ui/button";
import {cn} from "@/lib/cn";

interface EditorTabsProps<Value extends string> {
  label: string;
  value: Value;
  items: readonly {value: Value; label: string; icon?: ReactNode; count?: number; disabled?: boolean}[];
  onChange: (value: Value) => void;
}

/** One tab treatment for role navigation and every agent detail panel. */
export default function EditorTabs<Value extends string>(props: EditorTabsProps<Value>) {
  const {label, value, items, onChange} = props;
  return (
    <nav aria-label={label} className="flex shrink-0 gap-5 overflow-x-auto">
      {items.map((item) => (
        <Button
          key={item.value}
          aria-label={item.label}
          aria-pressed={item.value === value}
          disabled={item.disabled}
          onClick={() => onChange(item.value)}
          className={cn(
            "agent-editor-tab flex shrink-0 items-center gap-2 border-b-2 border-transparent py-3 text-sm text-ink-muted outline-none hover:text-ink",
            item.value === value && "border-ink text-ink"
          )}
        >
          {item.icon}
          <span>{item.label}</span>
          {item.count !== undefined && <span className="text-xs text-ink-faint">{item.count}</span>}
        </Button>
      ))}
    </nav>
  );
}
