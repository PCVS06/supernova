import PiOrb from "@/components/brand/pi-orb";
import {agentColor} from "@/features/harnesses/lib/agent-identity";
import {cn} from "@/lib/cn";

export type AgentMarkKind = "lead" | "specialist";

interface AgentMarkProps {
  name: string;
  color?: string;
  className?: string;
  working?: boolean;
  kind?: AgentMarkKind;
}

/** The app's rune ring with a stable role color. Leads and specialists share one shape and differ by color only. */
export default function AgentMark(props: AgentMarkProps) {
  const {name, color, className, working, kind = "specialist"} = props;

  return (
    <span data-kind={kind} title={kind === "lead" ? "Project lead" : "Specialist worker"} className={cn("relative inline-flex", className ?? "size-8")}>
      <PiOrb color={agentColor(name, color)} className="size-full" state={working ? "working" : "still"} />
    </span>
  );
}
