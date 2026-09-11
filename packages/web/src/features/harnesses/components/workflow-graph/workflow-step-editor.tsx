import type {HarnessAgent, WorkflowFieldType, WorkflowStep, WorkflowStepEffects} from "@supernova/contracts/harnesses/schemas";
import Button from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import Input from "@/components/ui/input";
import Switch from "@/components/ui/switch";
import {SettingsGroup, SettingsRow} from "@/features/settings/components/settings-group";
import ConfigCard from "@/features/harnesses/components/config-card";
import ConfigChoice from "@/features/harnesses/components/config-choice";
import ExecutionEditor from "@/features/harnesses/components/execution-editor";
import PromptEditor from "@/features/harnesses/components/prompt-editor";
import {agentLabel} from "@/features/harnesses/lib/agent-identity";
import {workflowEffectsLabels} from "@/features/harnesses/lib/workflow-draft";

const fieldTypes: readonly WorkflowFieldType[] = ["string", "number", "boolean", "string[]"];
const effectOptions: readonly WorkflowStepEffects[] = ["none", "workspace", "external"];
const maxFields = 20;

interface WorkflowStepEditorProps {
  step: WorkflowStep;
  index: number;
  steps: readonly WorkflowStep[];
  agents: readonly HarnessAgent[];
  onChange: (change: Partial<WorkflowStep>) => void;
  onMove: (offset: number) => void;
  onRemove: () => void;
  onClose: () => void;
}

/** The inspector of the selected node. Everything a step owns is edited here, never on the canvas. */
export default function WorkflowStepEditor(props: WorkflowStepEditorProps) {
  const {step, index, steps, agents, onChange, onMove, onRemove, onClose} = props;
  const agent = agents.find((item) => item.name === step.agent);
  const earlier = steps.slice(0, index);
  const fields = step.output.fields;
  const patchField = (position: number, change: Partial<(typeof fields)[number]>) =>
    onChange({output: {fields: fields.map((item, at) => (at === position ? {...item, ...change} : item))}});

  return (
    <>
      <header className="flex shrink-0 items-center gap-2 border-b border-border px-4 py-3">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-ink-strong">Step {index + 1}</span>
          <span className="block truncate font-mono text-xs text-ink-faint">{step.id}</span>
        </span>
        <Button
          aria-label={`Move ${step.id} earlier`}
          disabled={index === 0}
          className="grid size-7 place-items-center rounded-md hover:bg-overlay-hover"
          onClick={() => onMove(-1)}
        >
          <Icon name="arrow-down" size="xs" className="rotate-180" />
        </Button>
        <Button
          aria-label={`Move ${step.id} later`}
          disabled={index === steps.length - 1}
          className="grid size-7 place-items-center rounded-md hover:bg-overlay-hover"
          onClick={() => onMove(1)}
        >
          <Icon name="arrow-down" size="xs" />
        </Button>
        <Button aria-label={`Close ${step.id} editor`} className="grid size-7 place-items-center rounded-md hover:bg-overlay-hover" onClick={onClose}>
          <Icon name="x" size="xs" />
        </Button>
      </header>
      <div className="scroll-fade-y min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="flex flex-col gap-8 px-1 py-4">
          <SettingsGroup title="Agent">
            <SettingsRow
              control={
                <ConfigChoice
                  className="w-full"
                  label={`Agent for ${step.id}`}
                  value={step.agent}
                  options={[...(agent ? [] : [{value: step.agent, label: `${step.agent} · missing`}]), ...agents.map((item) => ({value: item.name, label: agentLabel(item.name)}))]}
                  onChange={(value) => onChange({agent: value})}
                />
              }
              description={agent?.description ?? "Missing agent — choose an existing agent before saving."}
              stacked
              title="Runs this step"
            />
            <SettingsRow description="Added to the agent's own prompt for this step only." stacked title="Instructions">
              <PromptEditor label={`Instructions for ${step.id}`} size="sm" value={step.instructions} onChange={(instructions) => onChange({instructions})} />
            </SettingsRow>
          </SettingsGroup>

          <SettingsGroup title="Reads">
            <SettingsRow description="Outputs this step receives. Only earlier steps can be read." stacked title="Incoming fields">
              {earlier.length === 0 ? (
                <p className="text-xs text-ink-muted">Nothing runs before this step. It receives the task only.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {earlier.map((item) => (
                    <label className="flex items-center gap-2 text-xs text-ink-muted" key={item.id}>
                      <input
                        type="checkbox"
                        aria-label={`${step.id} reads ${item.id}`}
                        checked={step.reads.includes(item.id)}
                        onChange={(event) => onChange({reads: event.target.checked ? [...step.reads, item.id] : step.reads.filter((read) => read !== item.id)})}
                      />
                      <span className="font-mono">{item.id}</span>
                      <span className="truncate text-ink-faint">{item.output.fields.map((field) => field.name).join(", ")}</span>
                    </label>
                  ))}
                </div>
              )}
            </SettingsRow>
          </SettingsGroup>

          <SettingsGroup title="Output contract">
            <SettingsRow description="Every field is validated before the next step runs." stacked title={`${fields.length} fields`}>
              <div className="space-y-2">
                {fields.map((field, position) => (
                  <ConfigCard className="space-y-2" key={position}>
                    <div className="flex items-center gap-2">
                      <Input
                        aria-label={`${step.id} field ${position + 1} name`}
                        className="min-w-0 flex-1 font-mono"
                        placeholder="field_name"
                        value={field.name}
                        onChange={(event) => patchField(position, {name: event.target.value})}
                      />
                      <Button
                        aria-label={`Remove ${step.id} field ${position + 1}`}
                        className="grid size-7 shrink-0 place-items-center rounded-md hover:bg-overlay-hover"
                        disabled={fields.length === 1}
                        onClick={() => onChange({output: {fields: fields.filter((_item, at) => at !== position)}})}
                      >
                        <Icon name="x" size="xs" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <ConfigChoice
                        className="min-w-0 flex-1"
                        label={`${step.id} field ${position + 1} type`}
                        value={field.type}
                        options={fieldTypes.map((type) => ({value: type, label: type}))}
                        onChange={(type) => patchField(position, {type: type as WorkflowFieldType})}
                      />
                      <span className="flex shrink-0 items-center gap-2 text-xs text-ink-muted">
                        <Switch
                          aria-label={`${step.id} field ${position + 1} required`}
                          checked={field.required}
                          onCheckedChange={(required) => patchField(position, {required})}
                        />
                        Required
                      </span>
                    </div>
                    <Input
                      aria-label={`${step.id} field ${position + 1} description`}
                      placeholder="What this field holds"
                      value={field.description ?? ""}
                      onChange={(event) => patchField(position, {description: event.target.value || undefined})}
                    />
                  </ConfigCard>
                ))}
                <Button
                  className="rounded-lg border border-border px-3 py-2 text-xs text-ink-muted hover:text-ink"
                  disabled={fields.length >= maxFields}
                  onClick={() => onChange({output: {fields: [...fields, {name: "", type: "string", required: true}]}})}
                >
                  Add field
                </Button>
              </div>
            </SettingsRow>
          </SettingsGroup>

          <SettingsGroup title="Effects">
            <SettingsRow
              control={
                <ConfigChoice
                  className="w-full"
                  label={`Effects of ${step.id}`}
                  value={step.effects}
                  options={effectOptions.map((value) => ({value, label: workflowEffectsLabels[value]}))}
                  onChange={(value) => onChange({effects: value as WorkflowStepEffects})}
                />
              }
              description="External effects are never retried automatically; a resume has to allow the rerun explicitly."
              stacked
              title="What this step touches"
            />
          </SettingsGroup>

          <SettingsGroup title="Execution override">
            <ExecutionEditor value={step.execution} inheritLabel="Inherit from agent" inherited={agent?.execution} onChange={(execution) => onChange({execution})} />
          </SettingsGroup>

          <SettingsGroup title="Step limits">
            <SettingsRow
              control={
                <Input
                  aria-label={`${step.id} maximum turns`}
                  className="w-full"
                  type="number"
                  min={1}
                  max={100}
                  placeholder="Inherited"
                  value={step.limits?.maxTurns ?? ""}
                  onChange={(event) => onChange({limits: {...step.limits, maxTurns: Number(event.target.value) || undefined}})}
                />
              }
              description="Empty inherits the harness run limits."
              stacked
              title="Maximum turns"
            />
            <SettingsRow
              control={
                <Input
                  aria-label={`${step.id} timeout in seconds`}
                  className="w-full"
                  type="number"
                  min={10}
                  max={3600}
                  placeholder="Inherited"
                  value={step.limits?.timeoutSeconds ?? ""}
                  onChange={(event) => onChange({limits: {...step.limits, timeoutSeconds: Number(event.target.value) || undefined}})}
                />
              }
              stacked
              title="Timeout in seconds"
            />
            <SettingsRow
              control={
                <Input
                  aria-label={`${step.id} cost limit in USD`}
                  className="w-full"
                  type="number"
                  min={0}
                  max={1000}
                  step={0.5}
                  placeholder="No ceiling"
                  value={step.limits?.maxCostUsd ?? ""}
                  onChange={(event) => onChange({limits: {...step.limits, maxCostUsd: Number(event.target.value) || undefined}})}
                />
              }
              stacked
              title="Cost limit in USD"
            />
          </SettingsGroup>

          <SettingsGroup title="Remove">
            <SettingsRow
              control={
                <Button aria-label={`Remove step ${step.id}`} className="rounded-lg border border-border px-3 py-2 text-xs text-danger-ink" onClick={onRemove}>
                  Remove step
                </Button>
              }
              description="Steps that read this one stop waiting for its fields."
              stacked
              title="Remove this step"
            />
          </SettingsGroup>
        </div>
      </div>
    </>
  );
}
