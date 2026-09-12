import {useState} from "react";
import {AnimatePresence, motion} from "framer-motion";
import type {HarnessConfig, HarnessWorkflow, WorkflowStep} from "@supernova/contracts/harnesses/schemas";
import Button from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import Input from "@/components/ui/input";
import SettingsPageShell from "@/features/settings/components/settings-page-shell";
import {SettingsGroup, SettingsRow} from "@/features/settings/components/settings-group";
import ConfigCard from "@/features/harnesses/components/config-card";
import ConfigChoice from "@/features/harnesses/components/config-choice";
import WorkflowChip from "@/features/harnesses/components/workflow-graph/workflow-chip";
import WorkflowNodeCard from "@/features/harnesses/components/workflow-graph/workflow-node-card";
import WorkflowStepEditor from "@/features/harnesses/components/workflow-graph/workflow-step-editor";
import {agentLabel} from "@/features/harnesses/lib/agent-identity";
import {createWorkflow, insertWorkflowStep, moveWorkflowStep, removeWorkflowStep, workflowsPatch} from "@/features/harnesses/lib/workflow-draft";
import {cn} from "@/lib/cn";

const maxWorkflows = 12;
const maxSteps = 12;
const panelTransition = {duration: 0.18, ease: [0.32, 0.72, 0, 1]} as const;

/** The rail marker a row hangs from, so the column reads as one graph rather than a stack of cards. */
function RailDot(props: {filled?: boolean}) {
  return (
    <span className="relative grid w-6 shrink-0 place-items-center self-stretch">
      <span className={cn("size-2 rounded-full border border-border bg-surface", props.filled && "border-ink-faint bg-ink-faint")} />
    </span>
  );
}

interface WorkflowEdgeProps {
  step: WorkflowStep;
  steps: readonly WorkflowStep[];
  onInsert: () => void;
  canInsert: boolean;
}

/** The labelled edge into a node: which earlier step hands over which fields. */
function WorkflowEdge(props: WorkflowEdgeProps) {
  const {step, steps, onInsert, canInsert} = props;
  const sources = step.reads.map((id) => ({id, fields: steps.find((item) => item.id === id)?.output.fields ?? []}));

  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className="relative grid w-6 shrink-0 place-items-center">
        <Button
          aria-label={`Add a step before ${step.id}`}
          className="grid size-6 place-items-center rounded-full border border-border bg-surface text-ink-faint hover:border-ink-faint hover:text-ink"
          disabled={!canInsert}
          onClick={onInsert}
        >
          <Icon name="plus" size="xs" />
        </Button>
      </span>
      <span aria-label={`Fields into ${step.id}`} className="flex min-w-0 flex-wrap items-center gap-1.5">
        {sources.length === 0 && <WorkflowChip>Starts from the task only</WorkflowChip>}
        {sources.map((source) => (
          <WorkflowChip key={source.id} tone="accent">
            {source.id} → {source.fields.map((field) => field.name).join(", ") || "no fields"}
          </WorkflowChip>
        ))}
      </span>
    </div>
  );
}

interface WorkflowsEditorProps {
  harness: HarnessConfig;
  onChange: (change: Pick<HarnessConfig, "graph" | "workflows">) => void;
}

/** Named sequential workflows as a graph with typed handoffs. Saving one starts nothing; the agent runs it when asked in chat. */
export default function WorkflowsEditor(props: WorkflowsEditorProps) {
  const {harness, onChange} = props;
  const workflows = harness.workflows ?? [];
  const [selectedId, setSelectedId] = useState(workflows[0]?.id ?? "");
  const [selectedStepId, setSelectedStepId] = useState(workflows[0]?.steps[0]?.id ?? "");
  const [nextAgent, setNextAgent] = useState(harness.agents[0]?.name ?? "");
  const workflow = workflows.find((item) => item.id === selectedId) ?? workflows[0];
  const steps = workflow?.steps ?? [];
  const selectedIndex = steps.findIndex((step) => step.id === selectedStepId);
  const selectedStep = selectedIndex === -1 ? undefined : steps[selectedIndex]!;
  const write = (items: readonly HarnessWorkflow[]) => onChange(workflowsPatch(items));
  const patch = (change: Partial<HarnessWorkflow>) => write(workflows.map((item) => (item === workflow ? {...item, ...change} : item)));
  const writeSteps = (next: readonly WorkflowStep[]) => patch({steps: next});

  const handleInsert = (index: number): void => {
    if (!nextAgent) return;
    const next = insertWorkflowStep(steps, index, nextAgent);
    writeSteps(next);
    setSelectedStepId(next[index]!.id);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border px-5 py-3 sm:px-6">
        <ConfigChoice
          className="sm:w-64"
          label="Workflow"
          value={workflow?.id ?? ""}
          options={workflows.length ? workflows.map((item) => ({value: item.id, label: item.name})) : [{value: "", label: "No workflows yet"}]}
          onChange={(value) => {
            setSelectedId(value);
            setSelectedStepId(workflows.find((item) => item.id === value)?.steps[0]?.id ?? "");
          }}
        />
        <Button
          variant="filled"
          className="px-3 py-2 text-xs"
          disabled={workflows.length >= maxWorkflows}
          onClick={() => {
            const added = createWorkflow(workflows, harness.agents[0]?.name);
            write([...workflows, added]);
            setSelectedId(added.id);
            setSelectedStepId("");
          }}
        >
          Add workflow
        </Button>
        {workflow && (
          <Button
            className="rounded-lg border border-border px-3 py-2 text-xs text-danger-ink"
            onClick={() => {
              write(workflows.filter((item) => item !== workflow));
              setSelectedId("");
              setSelectedStepId("");
            }}
          >
            Remove workflow
          </Button>
        )}
        <span className="ml-auto text-xs text-ink-faint">{steps.length ? `${steps.length} steps` : "No steps"}</span>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <SettingsPageShell>
            {!workflow && (
              <div className="px-3 sm:px-4">
                <ConfigCard className="border-dashed p-6 text-sm text-ink-muted">No workflow configured. Add one, then give each step an agent.</ConfigCard>
              </div>
            )}
            {workflow && (
              <>
                <SettingsGroup title="Workflow">
                  <SettingsRow
                    control={<Input aria-label="Workflow name" className="sm:w-64" value={workflow.name} onChange={(event) => patch({name: event.target.value})} />}
                    description="Ask for this workflow by name in chat."
                    title="Name"
                  />
                  <SettingsRow
                    control={
                      <Input aria-label="Workflow description" className="sm:w-64" value={workflow.description} onChange={(event) => patch({description: event.target.value})} />
                    }
                    description="Tells the lead when to run it."
                    title="Description"
                  />
                  <SettingsRow
                    control={
                      <Input
                        aria-label="Time limit in seconds"
                        className="sm:w-40"
                        type="number"
                        min={10}
                        max={86400}
                        value={workflow.limits.maxWallClockSeconds}
                        onChange={(event) => patch({limits: {...workflow.limits, maxWallClockSeconds: Number(event.target.value)}})}
                      />
                    }
                    description="The run stops when this time is spent."
                    title="Time limit in seconds"
                  />
                  <SettingsRow
                    control={
                      <Input
                        aria-label="Workflow cost limit in USD"
                        className="sm:w-40"
                        type="number"
                        min={0}
                        max={1000}
                        step={0.5}
                        placeholder="No ceiling"
                        value={workflow.limits.maxCostUsd ?? ""}
                        onChange={(event) => patch({limits: {...workflow.limits, maxCostUsd: Number(event.target.value) || undefined}})}
                      />
                    }
                    description="Optional. Empty means no ceiling."
                    title="Cost limit in USD"
                  />
                </SettingsGroup>

                <SettingsGroup title="Graph">
                  <div className="px-3 sm:px-4">
                    <p className="mb-4 max-w-xl text-xs leading-relaxed text-ink-muted">Steps run in order. Each one hands the next a checked result; select a step to edit it.</p>
                    <div className="workflow-graph-rail relative">
                      <div className="flex items-center gap-3 pb-1.5">
                        <RailDot />
                        <span className="text-xs text-ink-faint">Task from the chat</span>
                      </div>
                      <ol aria-label="Workflow steps">
                        {steps.map((step, index) => (
                          <li key={step.id}>
                            {index > 0 && <WorkflowEdge step={step} steps={steps} canInsert={!!nextAgent && steps.length < maxSteps} onInsert={() => handleInsert(index)} />}
                            <div className="flex items-stretch gap-3">
                              <RailDot filled={step.id === selectedStepId} />
                              <div className="min-w-0 flex-1 py-1">
                                <WorkflowNodeCard
                                  agent={harness.agents.find((item) => item.name === step.agent)}
                                  index={index}
                                  selected={step.id === selectedStepId}
                                  step={step}
                                  onSelect={() => setSelectedStepId(step.id === selectedStepId ? "" : step.id)}
                                />
                              </div>
                            </div>
                          </li>
                        ))}
                      </ol>
                      <div className="flex flex-wrap items-center gap-3 pt-1.5">
                        <RailDot />
                        <span className="text-xs text-ink-faint">{steps.length ? "Result back to the chat" : "No steps yet. Add the first agent."}</span>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-2 pl-9">
                      <ConfigChoice
                        className="sm:w-56"
                        label="Agent for the next workflow step"
                        value={nextAgent}
                        options={
                          harness.agents.length ? harness.agents.map((agent) => ({value: agent.name, label: agentLabel(agent.name)})) : [{value: "", label: "No agents yet"}]
                        }
                        onChange={setNextAgent}
                      />
                      <Button variant="filled" className="px-3 py-2 text-xs" disabled={!nextAgent || steps.length >= maxSteps} onClick={() => handleInsert(steps.length)}>
                        Add step
                      </Button>
                    </div>
                  </div>
                </SettingsGroup>
              </>
            )}
          </SettingsPageShell>
        </div>

        <AnimatePresence initial={false}>
          {selectedStep && (
            <motion.aside
              animate={{opacity: 1, x: 0}}
              className="flex max-h-80 min-h-0 w-full shrink-0 flex-col border-t border-border bg-surface md:max-h-none md:w-96 md:border-l md:border-t-0"
              exit={{opacity: 0, x: 12}}
              initial={{opacity: 0, x: 12}}
              key="workflow-step-editor"
              transition={panelTransition}
            >
              <WorkflowStepEditor
                agents={harness.agents}
                index={selectedIndex}
                step={selectedStep}
                steps={steps}
                onChange={(change) => writeSteps(steps.map((item) => (item === selectedStep ? {...item, ...change} : item)))}
                onClose={() => setSelectedStepId("")}
                onMove={(offset) => writeSteps(moveWorkflowStep(steps, selectedIndex, offset))}
                onRemove={() => {
                  writeSteps(removeWorkflowStep(steps, selectedStep.id));
                  setSelectedStepId("");
                }}
              />
            </motion.aside>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
