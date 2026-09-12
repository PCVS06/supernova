import type {ReactNode} from "react";
import {ledgerActionsClassName} from "@/features/sidebar/lib/ledger-styles";
import {cn} from "@/lib/cn";

interface LedgerRowEndProps {
  children: ReactNode;
  actions: ReactNode;
  menuOpen?: boolean;
}

/** Metadata and actions share one reserved column; neither can cover the row's name. */
export default function LedgerRowEnd(props: LedgerRowEndProps) {
  const {children, actions, menuOpen = false} = props;
  return (
    <span className="grid w-14 shrink-0 items-center pr-1" onPointerDown={(event) => event.stopPropagation()}>
      <span
        className={cn(
          "col-start-1 row-start-1 flex items-center justify-end gap-1.5 pr-1 text-xs tabular-nums text-ink-faint group-hover/ledger:invisible group-focus-within/ledger:invisible group-has-[[data-popup-open]]/ledger:invisible",
          menuOpen && "invisible"
        )}
      >
        {children}
      </span>
      <span className={cn(ledgerActionsClassName, menuOpen && "opacity-100")}>{actions}</span>
    </span>
  );
}
