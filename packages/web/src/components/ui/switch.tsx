import {Switch as BaseSwitch} from "@base-ui/react/switch";
import type {ComponentProps} from "react";
import {cn} from "@/lib/cn";

type SwitchProps = ComponentProps<typeof BaseSwitch.Root>;

/** Keyboard-accessible monochrome switch with subtly rounded geometry. */
export default function Switch(props: SwitchProps) {
  const {className, ...switchProps} = props;

  return (
    <BaseSwitch.Root
      className={cn(
        "relative inline-flex h-6 w-10 shrink-0 cursor-pointer items-center rounded-md border border-border-strong bg-surface-raised outline-none transition-colors data-checked:border-ink data-checked:bg-ink focus-visible:ring-2 focus-visible:ring-accent-focus/60 data-disabled:cursor-default data-disabled:opacity-50",
        className
      )}
      {...switchProps}
    >
      <BaseSwitch.Thumb className="block size-4 translate-x-0.5 rounded-xs bg-ink-muted transition-transform data-checked:translate-x-4.5 data-checked:bg-ink-inverse motion-reduce:transition-none" />
    </BaseSwitch.Root>
  );
}
