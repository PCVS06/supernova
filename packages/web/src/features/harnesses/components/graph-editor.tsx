import {useState} from "react";
import type {HarnessConfig} from "@supernova/contracts/harnesses/schemas";
import Button from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import AgentMark from "@/features/harnesses/components/agent-mark";
import {agentLabel} from "@/features/harnesses/lib/agent-identity";

interface GraphEditorProps {
  harness: HarnessConfig;
  onChange: (steps: readonly string[]) => void;
}

export default function GraphEditor(props: GraphEditorProps) {
  const {harness, onChange} = props;
  const [next, setNext] = useState(harness.agents[0]?.name ?? "");
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-medium">Agent handoff graph</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-muted">
          Choose the order in which agents work. Each receives the task and the previous agent's result. Ask in chat to run this workflow; saving it starts nothing.
        </p>
      </div>
      <ol className="space-y-3" aria-label="Agent workflow">
        {harness.graph.steps.map((name, index) => (
          <li key={`${index}-${name}`}>
            {index > 0 && <Icon className="mb-3 ml-5 text-ink-faint" name="arrow-down" size="sm" />}
            <div className="flex items-center gap-4 rounded-xl border border-border bg-surface-raised p-4">
              <span className="font-mono text-xs text-ink-faint">{String(index + 1).padStart(2, "0")}</span>
              <AgentMark name={name} color={harness.agents.find((agent) => agent.name === name)?.color} className="size-9" />
              <div className="min-w-0 flex-1">
                <p className="text-sm">{agentLabel(name)}</p>
                <p className="mt-1 text-xs text-ink-muted">
                  {harness.agents.find((agent) => agent.name === name)?.description ?? "Missing agent — choose an existing agent before saving."}
                </p>
              </div>
              <Button
                className="text-xs text-ink-muted"
                disabled={index === 0}
                onClick={() => {
                  const steps = [...harness.graph.steps];
                  [steps[index - 1], steps[index]] = [steps[index]!, steps[index - 1]!];
                  onChange(steps);
                }}
              >
                Up
              </Button>
              <Button aria-label={`Remove step ${index + 1}`} onClick={() => onChange(harness.graph.steps.filter((_item, position) => position !== index))}>
                <Icon name="x" size="xs" />
              </Button>
            </div>
          </li>
        ))}
      </ol>
      {harness.graph.steps.length === 0 && (
        <p className="rounded-xl border border-dashed border-border p-6 text-sm text-ink-muted">No workflow configured. Add agents, then connect their handoffs here.</p>
      )}
      <div className="flex flex-wrap gap-3">
        <select
          aria-label="Agent for next workflow step"
          className="min-w-48 rounded-lg border border-border bg-surface-control px-3 py-2 text-sm"
          value={next}
          onChange={(event) => setNext(event.target.value)}
        >
          {harness.agents.map((agent) => (
            <option key={agent.name} value={agent.name}>
              {agent.name}
            </option>
          ))}
        </select>
        <Button variant="filled" className="px-4 py-2 text-sm" disabled={!next || harness.graph.steps.length >= 12} onClick={() => onChange([...harness.graph.steps, next])}>
          Add step
        </Button>
      </div>
      {harness.source && (
        <div className="rounded-xl border border-border p-5 text-sm leading-relaxed text-ink-muted">
          <p className="mb-2 font-medium text-ink">Your research graph stays separate</p>
          Science Pi's Idea Graph stores research ideas and evidence within your projects. This tab controls how agents hand work to each other. Research actions that require
          approval are not yet available in the app; editing this workflow does not approve them.
        </div>
      )}
    </div>
  );
}
