import {useId, useState} from "react";
import type {ReactNode} from "react";
import Button from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import {cn} from "@/lib/cn";

interface DisclosureProps {
  readonly label: string;
  readonly children: ReactNode;
  readonly className?: string;
  readonly lazy?: boolean;
  readonly defaultOpen?: boolean;
}

/** Reveals detail in place, mounting expensive content only after its first deliberate opening. */
export default function Disclosure(props: DisclosureProps) {
  const {label, children, className, lazy = false, defaultOpen = false} = props;
  const [open, setOpen] = useState(defaultOpen);
  const [visited, setVisited] = useState(defaultOpen);
  const id = useId();
  return (
    <div className={cn("ui-disclosure text-xs", className)} data-open={open}>
      <Button
        data-preserve-scroll=""
        aria-expanded={open}
        aria-controls={id}
        className="flex w-full items-center gap-2 rounded-lg py-2 text-left text-ink-muted hover:text-ink"
        onClick={() => {
          setVisited(true);
          setOpen(!open);
        }}
      >
        <Icon name="chevron-right" size="xs" className={cn("ui-disclosure-chevron", open && "rotate-90")} />
        {label}
      </Button>
      <div id={id} className="ui-disclosure-reveal" inert={!open} aria-hidden={!open}>
        <div className="min-h-0 overflow-hidden">{(!lazy || visited) && <div className="pb-3 pt-1">{children}</div>}</div>
      </div>
    </div>
  );
}
