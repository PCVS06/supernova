import {cn} from "@/lib/cn";

const heightClasses = {lg: "h-96", md: "h-64", sm: "h-28"} as const;

interface PromptEditorProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  size?: keyof typeof heightClasses;
}

/** The one prose surface for instructions, prompts, path lists and Markdown documents. */
export default function PromptEditor(props: PromptEditorProps) {
  const {label, value, onChange, disabled, placeholder, size = "md"} = props;

  return (
    <textarea
      aria-label={label}
      className={cn(
        "w-full resize-none overflow-y-auto overscroll-contain rounded-xl corner-superellipse/1.3 border border-border bg-surface-raised/70 p-4 font-mono text-xs leading-relaxed text-ink outline-none placeholder:text-ink-faint focus:border-border-strong disabled:opacity-60",
        heightClasses[size]
      )}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      spellCheck={false}
      value={value}
    />
  );
}
