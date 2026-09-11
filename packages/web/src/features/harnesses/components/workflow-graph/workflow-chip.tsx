import type {ReactNode} from "react";
import {cn} from "@/lib/cn";

const toneClasses = {
  accent: "border-ink-faint text-ink",
  danger: "border-danger-ink/60 text-danger-ink",
  muted: "border-border text-ink-muted",
} as const;

interface WorkflowChipProps {
  children: ReactNode;
  className?: string;
  tone?: keyof typeof toneClasses;
  title?: string;
}

/** One chip shape for output fields, effect badges, override hints and edge labels. */
export default function WorkflowChip(props: WorkflowChipProps) {
  const {children, className, tone = "muted", title} = props;

  return (
    <span className={cn("inline-flex max-w-full items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-xs leading-5", toneClasses[tone], className)} title={title}>
      {children}
    </span>
  );
}
