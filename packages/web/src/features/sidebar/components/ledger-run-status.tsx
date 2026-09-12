import type {HarnessRunSummary} from "@supernova/contracts/harnesses/schemas";
import Icon, {type IconName} from "@/components/ui/icon";
import {cn} from "@/lib/cn";

const statuses: Record<HarnessRunSummary["status"], {label: string; icon: IconName}> = {
  starting: {label: "Starting", icon: "loader"},
  running: {label: "Working", icon: "loader"},
  completed: {label: "Completed", icon: "check"},
  failed: {label: "Failed", icon: "alert"},
  cancelled: {label: "Cancelled", icon: "stop"},
  interrupted: {label: "Interrupted", icon: "alert"},
};

/** Text and shape communicate recorded status without relying on color or animation alone. */
export default function LedgerRunStatus(props: {status: HarnessRunSummary["status"]; compact?: boolean; stale?: boolean}) {
  const {status, compact = false, stale = false} = props;
  const active = status === "starting" || status === "running";
  const attention = status === "failed" || status === "interrupted";
  return (
    <span
      aria-label={stale ? `${statuses[status].label} · last observed` : undefined}
      className={cn("inline-flex shrink-0 items-center gap-1 text-xs", active ? "text-ink-muted" : "text-ink-faint", attention && "text-danger-ink")}
    >
      {!compact && <Icon name={statuses[status].icon} size="xs" className={cn(active && !stale && "animate-spin motion-reduce:animate-none")} />}
      {statuses[status].label}
    </span>
  );
}
