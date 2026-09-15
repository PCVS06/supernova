import ConstantOrb from "@/components/brand/constant-orb";
import {agentColor, agentMarks} from "@/features/harnesses/lib/agent-identity";
import {cn} from "@/lib/cn";

export type AgentMarkKind = keyof typeof agentMarks;

interface AgentMarkProps {
  name: string;
  color?: string;
  className?: string;
  working?: boolean;
  kind?: AgentMarkKind;
  colorPreview?: boolean;
}

/** Identifies each role with its mathematical symbol and animated number field. */
export default function AgentMark(props: AgentMarkProps) {
  const {name, color, className, working, kind = "specialist", colorPreview = false} = props;

  return (
    <span data-kind={kind} title={agentMarks[kind].label} className={cn("relative inline-flex", className ?? "size-8")}>
      <ConstantOrb constant={agentMarks[kind].constant} color={colorPreview ? agentColor(name, color) : undefined} className="size-full" state={working ? "working" : "idle"} />
    </span>
  );
}
