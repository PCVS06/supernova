import type {ReactNode} from "react";
import {cn} from "@/lib/cn";

export function ConfigField(props: {label: string; description?: string; children: ReactNode}) {
  const {label, description, children} = props;
  return (
    <label className="block space-y-2">
      <span className="block text-sm font-medium text-ink">{label}</span>
      {description && <span className="block text-xs leading-relaxed text-ink-muted">{description}</span>}
      {children}
    </label>
  );
}

export function PromptEditor(props: {label: string; value: string; onChange: (value: string) => void; compact?: boolean}) {
  const {label, value, onChange, compact} = props;
  return (
    <textarea
      aria-label={label}
      className={cn(
        "w-full resize-none overflow-y-auto overscroll-contain rounded-lg border border-border bg-surface-raised p-4 font-mono text-xs leading-relaxed text-ink outline-none focus-visible:border-ink-faint",
        compact ? "h-28" : "h-80"
      )}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      spellCheck={false}
    />
  );
}
