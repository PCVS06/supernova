import ConstantOrb from "@/components/brand/constant-orb";
import type {MathematicalConstant} from "@/components/brand/constant-identity";
import {cn} from "@/lib/cn";
import "@/features/harnesses/components/delegation-connection.css";

interface DelegationConnectionProps {
  source: MathematicalConstant;
  target: MathematicalConstant;
  sourceLabel: string;
  targetLabel: string;
  active: boolean;
  compact?: boolean;
}

/** A visible route from the delegating identity to its worker; only live work sends a pulse. */
export default function DelegationConnection(props: DelegationConnectionProps) {
  const {source, target, sourceLabel, targetLabel, active, compact = false} = props;
  return (
    <span className={cn("delegation-connection", compact && "delegation-connection-compact")} data-active={active} role="img" aria-label={`${sourceLabel} → ${targetLabel}`}>
      <ConstantOrb constant={source} className={compact ? "size-5" : "size-10"} state="still" />
      <span className="delegation-path" aria-hidden="true">
        <span className="delegation-pulse" />
      </span>
      <ConstantOrb constant={target} className={compact ? "size-5" : "size-10"} state={active ? "working" : "still"} />
    </span>
  );
}
