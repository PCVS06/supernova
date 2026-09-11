import PiOrb from "@/components/brand/pi-orb";
import {agentColor} from "@/features/harnesses/lib/agent-identity";
import {cn} from "@/lib/cn";

/** The app's existing pi logo with a stable role color. */
export default function AgentMark(props: {name: string; color?: string; className?: string; working?: boolean; kind?: "lead" | "specialist"}) {
  const {name, color, className, working, kind = "specialist"} = props;
  return (
    <span title={kind === "lead" ? "Project lead" : "Specialist worker"} className={cn("relative inline-flex", className ?? "size-8")}>
      <PiOrb color={agentColor(name, color)} className="size-full" state={working ? "working" : "still"} variant={kind === "specialist" ? "specialist" : "orb"} />
    </span>
  );
}
