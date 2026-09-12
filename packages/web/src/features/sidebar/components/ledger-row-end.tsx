import type {ReactNode} from "react";
import {ledgerActionsClassName} from "@/features/sidebar/lib/ledger-styles";

interface LedgerRowEndProps {
  actions: ReactNode;
}

/** Keeps quiet row actions visible in a fixed slot without shifting on hover. */
export default function LedgerRowEnd(props: LedgerRowEndProps) {
  const {actions} = props;
  return (
    <span className="grid w-14 shrink-0 items-center pr-1" onPointerDown={(event) => event.stopPropagation()}>
      <span className={ledgerActionsClassName}>{actions}</span>
    </span>
  );
}
