import {cn} from "@/lib/cn";

/** The box grows with its text up to a ceiling, then scrolls, so a short prompt is short and a long one stays on the page. */
const sizeClasses = {lg: "min-h-64 max-h-[70vh]", md: "min-h-40 max-h-[60vh]", sm: "min-h-20 max-h-64"} as const;

interface PromptEditorProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  size?: keyof typeof sizeClasses;
}

/** The one prose surface for instructions, prompts, path lists and Markdown documents. */
export default function PromptEditor(props: PromptEditorProps) {
  const {label, value, onChange, disabled, placeholder, size = "md"} = props;

  return (
    <textarea
      aria-label={label}
      className={cn(
        "field-sizing-content block w-full resize-y overflow-y-auto overscroll-contain rounded-xl corner-superellipse/1.3 border border-border bg-surface/60 p-3.5 font-mono text-xs leading-relaxed text-ink outline-none placeholder:text-ink-faint focus:border-border-strong disabled:opacity-60",
        sizeClasses[size]
      )}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      spellCheck={false}
      value={value}
    />
  );
}
