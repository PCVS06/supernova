import {useId} from "react";
import type {WorkflowStepSummary} from "@supernova/contracts/harnesses/schemas";
import {workflowLayers, workflowOutputConsumers} from "@supernova/contracts/harnesses/workflow-graph";
import ConstantOrb from "@/components/brand/constant-orb";
import type {MathematicalConstant} from "@/components/brand/constant-identity";
import {agentLabel} from "@/features/harnesses/lib/agent-identity";
import "@/features/harnesses/components/workflow-graph/workflow-graph.css";

interface WorkflowGraphProps {
  steps: readonly WorkflowStepSummary[];
  selectedId?: string;
  onSelect: (id: string) => void;
  source?: MathematicalConstant;
  live?: boolean;
  descriptions?: Readonly<Record<string, string>>;
  sourceLabel?: string;
}

/** Uses the same dependency layout for editing and recorded runs; each edge is a real prerequisite. */
export default function WorkflowGraph(props: WorkflowGraphProps) {
  const {steps, selectedId, onSelect, source = "tau", live = false, descriptions, sourceLabel = "Workflow source"} = props;
  const marker = useId().replaceAll(":", "");
  const consumers = workflowOutputConsumers(steps);
  let layers: readonly (readonly string[])[];
  let error: string | undefined;
  try {
    layers = workflowLayers(steps.map((step) => ({...step, id: step.stepId})));
  } catch (cause) {
    layers = [steps.map((step) => step.stepId)];
    error = cause instanceof Error ? cause.message : String(cause);
  }
  const height = Math.max(190, ...layers.map((layer) => layer.length * 116 + 32));
  const width = Math.max(360, layers.length * 160 + 96);
  const points = new Map(layers.flatMap((layer, column) => layer.map((id, row) => [id, {x: 96 + column * 160, y: (height - layer.length * 116) / 2 + row * 116}] as const)));
  return (
    <div className="workflow-network" data-live={live}>
      {error && (
        <p role="alert" className="p-3 text-xs">
          {error}
        </p>
      )}
      <div className="workflow-network-scroll" tabIndex={0} aria-label="Workflow dependency graph. Scroll horizontally to explore branches.">
        <div className="relative" style={{width, height}}>
          <div className="workflow-network-source" style={{top: height / 2 - 32}} role="img" aria-label={sourceLabel} title={sourceLabel}>
            <ConstantOrb constant={source} state={live ? "working" : "idle"} className="size-16" />
          </div>
          <svg aria-hidden="true" className="pointer-events-none absolute inset-0" width={width} height={height}>
            <defs>
              <marker id={marker} markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto">
                <path d="M0,0 L5,2.5 L0,5" fill="white" />
              </marker>
            </defs>
            {steps.flatMap((step) => {
              const target = points.get(step.stepId)!;
              const sources = [...new Set([...step.reads, ...step.dependsOn])];
              return (sources.length ? sources : ["@task"]).map((id) => {
                const from = points.get(id);
                if (!from && id !== "@task") return null;
                const x = from ? from.x + 64 : 64;
                const y = from ? from.y + 32 : height / 2;
                const shared = step.reads.includes(id);
                const active = live && step.status === "running";
                return (
                  <path
                    key={`${id}:${step.stepId}`}
                    className="workflow-network-edge"
                    data-active={active}
                    data-output={shared}
                    d={`M${x},${y} C${x + 24},${y} ${target.x - 24},${target.y + 32} ${target.x - 4},${target.y + 32}`}
                    markerEnd={`url(#${marker})`}
                  >
                    <title>{id === "@task" ? "Delegation" : shared ? `${id}: validated output shared with ${step.stepId}` : `${step.stepId} waits for ${id}`}</title>
                  </path>
                );
              });
            })}
          </svg>
          {steps.map((step) => {
            const point = points.get(step.stepId)!;
            const readers = consumers.get(step.stepId) ?? 0;
            return (
              <button
                type="button"
                key={step.stepId}
                aria-label={`Inspect step ${step.stepId}`}
                aria-pressed={selectedId === step.stepId}
                className="workflow-network-node"
                data-status={step.status}
                style={{left: point.x, top: point.y}}
                onClick={() => onSelect(step.stepId)}
                title={
                  descriptions?.[step.stepId] ??
                  `${step.stepId} · ${agentLabel(step.agent)} · ${step.waitReason ?? step.status}${readers > 1 ? ` · shared with ${readers} steps` : ""}`
                }
              >
                <ConstantOrb constant="e" className="size-16" state={live && step.status === "running" ? "working" : "still"} />
                <span className="workflow-symbol-caption">
                  <span className="block font-medium">{step.stepId}</span>
                  <span className="block">{agentLabel(step.agent)}</span>
                  <span className="block">
                    {step.waitReason ?? step.status}
                    {readers > 1 ? ` · shared with ${readers} steps` : ""}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <p className="sr-only">Solid connections share a checked result · dotted connections only wait</p>
    </div>
  );
}
