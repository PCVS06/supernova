import {useId, useState} from "react";
import type {ReactNode} from "react";
import Button from "@/components/ui/button";
import Icon from "@/components/ui/icon";

interface ExpandableControlRowProps {
  readonly label: string;
  readonly status: string;
  readonly leading: ReactNode;
  readonly actions: ReactNode;
  readonly children: ReactNode;
}

/** Keeps the title, disclosure and actions aligned while details expand below the row. */
export default function ExpandableControlRow(props: ExpandableControlRowProps) {
  const {label, status, leading, actions, children} = props;
  const [expanded, setExpanded] = useState(false);
  const detailsId = useId();
  return (
    <div className="px-3 py-2">
      <div className="flex min-w-0 items-center gap-2">
        <span className="grid size-5 shrink-0 place-items-center text-ink-muted">{leading}</span>
        <Button className="flex min-w-0 flex-1 items-center gap-2 py-1 text-left" aria-expanded={expanded} aria-controls={detailsId} onClick={() => setExpanded((value) => !value)}>
          <span className="min-w-0 flex-1">
            <span className="line-clamp-2 wrap-anywhere text-sm font-medium text-ink">{label}</span>
            <span className="mt-0.5 block text-xs text-ink-muted">{status}</span>
          </span>
          <span className="grid size-8 shrink-0 place-items-center">
            <Icon className={expanded ? "rotate-90" : undefined} name="chevron-right" size="xs" />
          </span>
        </Button>
        <div className="flex shrink-0 items-center gap-1 [&>button]:h-8">{actions}</div>
      </div>
      <div hidden={!expanded} id={detailsId} className="max-h-48 overflow-y-auto overscroll-contain pb-1 pl-7 pt-2">
        {children}
      </div>
    </div>
  );
}
