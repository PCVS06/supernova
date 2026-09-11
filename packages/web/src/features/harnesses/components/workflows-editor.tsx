import {useState} from "react";
import type {HarnessAgent, HarnessConfig, HarnessWorkflow, WorkflowFieldType, WorkflowStep} from "@supernova/contracts/harnesses/schemas";
import Button from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import Input from "@/components/ui/input";
import Switch from "@/components/ui/switch";
import AgentMark from "@/features/harnesses/components/agent-mark";
import {ConfigField, PromptEditor} from "@/features/harnesses/components/config-fields";
import ExecutionEditor from "@/features/harnesses/components/execution-editor";
import {agentLabel} from "@/features/harnesses/lib/agent-identity";
import {createWorkflow, createWorkflowStep, workflowsPatch} from "@/features/harnesses/lib/workflow-draft";

const fieldTypes: readonly WorkflowFieldType[] = ["string", "number", "boolean", "string[]"];
const effectOptions: readonly {value: WorkflowStep["effects"]; label: string}[] = [
  {value: "none", label: "None · reads and reasons only"},
  {value: "workspace", label: "Workspace · changes files"},
  {value: "external", label: "External · acts outside the workspace"},
];
const selectClassName = "min-w-48 rounded-lg border border-border bg-surface-control px-3 py-2 text-sm";

interface StepCardProps {
  step: WorkflowStep;
  index: number;
  steps: readonly WorkflowStep[];
  agents: readonly HarnessAgent[];
  onChange: (change: Partial<WorkflowStep>) => void;
  onMoveUp: () => void;
  onRemove: () => void;
}

function StepCard(props: StepCardProps) {
  const {step, index, steps, agents, onChange, onMoveUp, onRemove} = props;
  const agent = agents.find((item) => item.name === step.agent);
  const earlier = steps.slice(0, index);
  const fields = step.output.fields;
  return (
    <li>
      {index > 0 && <Icon className="mb-3 ml-5 text-ink-faint" name="arrow-down" size="sm" />}
      <div className="space-y-4 rounded-xl border border-border bg-surface-raised p-4">
        <div className="flex items-center gap-4">
          <span className="font-mono text-xs text-ink-faint">{String(index + 1).padStart(2, "0")}</span>
          <AgentMark name={step.agent} color={agent?.color} className="size-9" />
          <div className="min-w-0 flex-1">
            <select aria-label={`Agent for step ${index + 1}`} className={selectClassName} value={step.agent} onChange={(event) => onChange({agent: event.target.value})}>
              {!agent && <option value={step.agent}>{step.agent}</option>}
              {agents.map((item) => (
                <option key={item.name} value={item.name}>
                  {agentLabel(item.name)}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-ink-muted">{agent?.description ?? "Missing agent — choose an existing agent before saving."}</p>
          </div>
          <span className="font-mono text-xs text-ink-faint">{step.id}</span>
          <Button className="text-xs text-ink-muted" disabled={index === 0} onClick={onMoveUp}>
            Up
          </Button>
          <Button aria-label={`Remove step ${index + 1}`} onClick={onRemove}>
            <Icon name="x" size="xs" />
          </Button>
        </div>
        <ConfigField label="Instructions" description="Added to the agent's own prompt for this step only.">
          <PromptEditor compact label={`Instructions for step ${index + 1}`} value={step.instructions} onChange={(instructions) => onChange({instructions})} />
        </ConfigField>
        <div className="space-y-2">
          <span className="block text-sm font-medium text-ink">Reads</span>
          <span className="block text-xs leading-relaxed text-ink-muted">Outputs this step receives. Only earlier steps can be read.</span>
          {earlier.length === 0 ? (
            <span className="block text-xs text-ink-muted">Nothing runs before this step. It receives the task only.</span>
          ) : (
            <div className="flex flex-wrap gap-3">
              {earlier.map((item) => (
                <label key={item.id} className="flex items-center gap-2 text-xs text-ink-muted">
                  <input
                    type="checkbox"
                    aria-label={`Step ${index + 1} reads ${item.id}`}
                    checked={step.reads.includes(item.id)}
                    onChange={(event) => onChange({reads: event.target.checked ? [...step.reads, item.id] : step.reads.filter((read) => read !== item.id)})}
                  />
                  <span className="font-mono">{item.id}</span>
                </label>
              ))}
            </div>
          )}
        </div>
        <div className="space-y-2">
          <span className="block text-sm font-medium text-ink">Output contract</span>
          <span className="block text-xs leading-relaxed text-ink-muted">Every field is validated before the next step runs.</span>
          <div className="space-y-2">
            {fields.map((field, position) => (
              <div key={position} className="flex flex-wrap items-center gap-3">
                <Input
                  aria-label={`Step ${index + 1} field ${position + 1} name`}
                  className="w-40"
                  value={field.name}
                  onChange={(event) => onChange({output: {fields: fields.map((item, at) => (at === position ? {...item, name: event.target.value} : item))}})}
                />
                <select
                  aria-label={`Step ${index + 1} field ${position + 1} type`}
                  className={selectClassName}
                  value={field.type}
                  onChange={(event) => onChange({output: {fields: fields.map((item, at) => (at === position ? {...item, type: event.target.value as WorkflowFieldType} : item))}})}
                >
                  {fieldTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
                <span className="flex items-center gap-2 text-xs text-ink-muted">
                  <Switch
                    aria-label={`Step ${index + 1} field ${position + 1} required`}
                    checked={field.required}
                    onCheckedChange={(required) => onChange({output: {fields: fields.map((item, at) => (at === position ? {...item, required} : item))}})}
                  />
                  Required
                </span>
                <Input
                  aria-label={`Step ${index + 1} field ${position + 1} description`}
                  className="min-w-40 flex-1"
                  placeholder="What this field holds"
                  value={field.description ?? ""}
                  onChange={(event) => onChange({output: {fields: fields.map((item, at) => (at === position ? {...item, description: event.target.value || undefined} : item))}})}
                />
                <Button
                  aria-label={`Remove step ${index + 1} field ${position + 1}`}
                  disabled={fields.length === 1}
                  onClick={() => onChange({output: {fields: fields.filter((_item, at) => at !== position)}})}
                >
                  <Icon name="x" size="xs" />
                </Button>
              </div>
            ))}
            <Button
              className="text-xs text-ink-muted"
              disabled={fields.length >= 20}
              onClick={() => onChange({output: {fields: [...fields, {name: "", type: "string", required: true}]}})}
            >
              Add field
            </Button>
          </div>
        </div>
        <ConfigField label="Effects" description="External effects are never retried automatically; a resume has to allow the rerun explicitly.">
          <select
            aria-label={`Effects of step ${index + 1}`}
            className={selectClassName}
            value={step.effects}
            onChange={(event) => onChange({effects: event.target.value as WorkflowStep["effects"]})}
          >
            {effectOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </ConfigField>
        <details className="rounded-lg border border-border p-4">
          <summary className="cursor-pointer text-sm">Model override · inherits the agent's model</summary>
          <div className="mt-4">
            <ExecutionEditor value={step.execution} inheritLabel="Inherit from agent" inherited={agent?.execution} onChange={(execution) => onChange({execution})} />
          </div>
        </details>
        <details className="rounded-lg border border-border p-4">
          <summary className="cursor-pointer text-sm">Step limits · inherit the harness run limits</summary>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <ConfigField label="Maximum turns">
              <Input
                type="number"
                min={1}
                max={100}
                value={step.limits?.maxTurns ?? ""}
                onChange={(event) => onChange({limits: {...step.limits, maxTurns: Number(event.target.value) || undefined}})}
              />
            </ConfigField>
            <ConfigField label="Timeout in seconds">
              <Input
                type="number"
                min={10}
                max={3600}
                value={step.limits?.timeoutSeconds ?? ""}
                onChange={(event) => onChange({limits: {...step.limits, timeoutSeconds: Number(event.target.value) || undefined}})}
              />
            </ConfigField>
            <ConfigField label="Cost limit in USD">
              <Input
                type="number"
                min={0}
                max={1000}
                step={0.5}
                value={step.limits?.maxCostUsd ?? ""}
                onChange={(event) => onChange({limits: {...step.limits, maxCostUsd: Number(event.target.value) || undefined}})}
              />
            </ConfigField>
          </div>
        </details>
      </div>
    </li>
  );
}

interface WorkflowsEditorProps {
  harness: HarnessConfig;
  onChange: (change: Pick<HarnessConfig, "graph" | "workflows">) => void;
}

/** Named sequential workflows with typed handoffs. Saving one starts nothing; the agent runs it when asked in chat. */
export default function WorkflowsEditor(props: WorkflowsEditorProps) {
  const {harness, onChange} = props;
  const workflows = harness.workflows ?? [];
  const [selectedId, setSelectedId] = useState(workflows[0]?.id ?? "");
  const [next, setNext] = useState(harness.agents[0]?.name ?? "");
  const workflow = workflows.find((item) => item.id === selectedId) ?? workflows[0];
  const write = (items: readonly HarnessWorkflow[]) => onChange(workflowsPatch(items));
  const patch = (change: Partial<HarnessWorkflow>) => write(workflows.map((item) => (item === workflow ? {...item, ...change} : item)));
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-medium">Workflows</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-muted">
          Each workflow runs its agents in order, and every step hands the next one a typed result instead of prose. Ask in chat to run a workflow; saving it starts nothing.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <select aria-label="Workflow" className={selectClassName} value={workflow?.id ?? ""} onChange={(event) => setSelectedId(event.target.value)}>
          {workflows.length === 0 && <option value="">No workflows yet</option>}
          {workflows.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        <Button
          variant="filled"
          className="px-4 py-2 text-sm"
          disabled={workflows.length >= 12}
          onClick={() => {
            const added = createWorkflow(workflows, harness.agents[0]?.name);
            write([...workflows, added]);
            setSelectedId(added.id);
          }}
        >
          Add workflow
        </Button>
        {workflow && (
          <Button
            className="text-xs text-danger-ink"
            onClick={() => {
              write(workflows.filter((item) => item !== workflow));
              setSelectedId("");
            }}
          >
            Remove workflow
          </Button>
        )}
      </div>
      {!workflow && <p className="rounded-xl border border-dashed border-border p-6 text-sm text-ink-muted">No workflow configured. Add one, then give each step an agent.</p>}
      {workflow && (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <ConfigField label="Workflow name">
              <Input value={workflow.name} onChange={(event) => patch({name: event.target.value})} />
            </ConfigField>
            <ConfigField label="Description">
              <Input value={workflow.description} onChange={(event) => patch({description: event.target.value})} />
            </ConfigField>
            <ConfigField label="Wall-clock limit in seconds">
              <Input
                type="number"
                min={10}
                max={86400}
                value={workflow.limits.maxWallClockSeconds}
                onChange={(event) => patch({limits: {...workflow.limits, maxWallClockSeconds: Number(event.target.value)}})}
              />
            </ConfigField>
            <ConfigField label="Cost limit in USD" description="Optional. Empty inherits no cost ceiling.">
              <Input
                type="number"
                min={0}
                max={1000}
                step={0.5}
                value={workflow.limits.maxCostUsd ?? ""}
                onChange={(event) => patch({limits: {...workflow.limits, maxCostUsd: Number(event.target.value) || undefined}})}
              />
            </ConfigField>
          </div>
          <ol className="space-y-3" aria-label="Workflow steps">
            {workflow.steps.map((step, index) => (
              <StepCard
                key={step.id}
                step={step}
                index={index}
                steps={workflow.steps}
                agents={harness.agents}
                onChange={(change) => patch({steps: workflow.steps.map((item) => (item === step ? {...item, ...change} : item))})}
                onMoveUp={() => {
                  const steps = [...workflow.steps];
                  [steps[index - 1], steps[index]] = [steps[index]!, steps[index - 1]!];
                  patch({steps});
                }}
                onRemove={() => patch({steps: workflow.steps.filter((_item, position) => position !== index)})}
              />
            ))}
          </ol>
          {workflow.steps.length === 0 && <p className="rounded-xl border border-dashed border-border p-6 text-sm text-ink-muted">No steps yet. Add the first agent below.</p>}
          <div className="flex flex-wrap gap-3">
            <select aria-label="Agent for next workflow step" className={selectClassName} value={next} onChange={(event) => setNext(event.target.value)}>
              {harness.agents.map((agent) => (
                <option key={agent.name} value={agent.name}>
                  {agent.name}
                </option>
              ))}
            </select>
            <Button
              variant="filled"
              className="px-4 py-2 text-sm"
              disabled={!next || workflow.steps.length >= 12}
              onClick={() => patch({steps: [...workflow.steps, createWorkflowStep(next, workflow.steps)]})}
            >
              Add step
            </Button>
          </div>
        </>
      )}
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
