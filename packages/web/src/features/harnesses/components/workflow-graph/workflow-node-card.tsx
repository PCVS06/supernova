import type {HarnessAgent, WorkflowStep} from "@supernova/contracts/harnesses/schemas";
import Button from "@/components/ui/button";
import {configCardClass} from "@/features/harnesses/components/config-card";
import AgentMark from "@/features/harnesses/components/agent-mark";
import WorkflowChip from "@/features/harnesses/components/workflow-graph/workflow-chip";
import {agentLabel} from "@/features/harnesses/lib/agent-identity";
import {workflowEffectsLabels} from "@/features/harnesses/lib/workflow-draft";
import {cn} from "@/lib/cn";

interface WorkflowNodeCardProps {
  step: WorkflowStep;
  index: number;
  agent?: HarnessAgent;
  selected: boolean;
  onSelect: () => void;
}

/** One node of the graph: who runs, what it promises to return, what it touches, and what it overrides. */
export default function WorkflowNodeCard(props: WorkflowNodeCardProps) {
  const {step, index, agent, selected, onSelect} = props;
  const override = step.execution?.model?.id ?? step.execution?.effort;

  return (
    <Button
      aria-label={`Edit step ${step.id}`}
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        configCardClass,
        "flex w-full flex-col items-stretch gap-3 p-4 text-left transition-colors hover:border-border-strong",
        selected && "border-ink-faint bg-surface-control"
      )}
    >
      <span className="flex items-center gap-3">
        <span className="w-5 shrink-0 font-mono text-xs text-ink-faint">{String(index + 1).padStart(2, "0")}</span>
        <AgentMark name={step.agent} color={agent?.color} className="size-9 shrink-0" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-ink-strong">{agentLabel(step.agent)}</span>
          <span className="mt-0.5 block truncate font-mono text-xs text-ink-faint">{step.id}</span>
        </span>
        <WorkflowChip tone={step.effects === "external" ? "danger" : step.effects === "workspace" ? "accent" : "muted"}>{workflowEffectsLabels[step.effects]}</WorkflowChip>
      </span>
      <span className="flex flex-wrap gap-1.5 pl-8">
        {step.output.fields.map((field, position) => (
          <WorkflowChip key={position} title={field.description} tone={field.required ? "accent" : "muted"}>
            {field.name || "unnamed"}
            <span className="text-ink-faint">{field.required ? field.type : `${field.type}?`}</span>
          </WorkflowChip>
        ))}
        {override && <WorkflowChip title="Overrides the agent's own execution settings">{override}</WorkflowChip>}
      </span>
      {!agent && <span className="pl-8 text-xs text-danger-ink">Missing agent — choose an existing agent before saving.</span>}
    </Button>
  );
}
