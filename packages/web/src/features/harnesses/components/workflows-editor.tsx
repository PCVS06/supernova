import {useState} from "react";
import {AnimatePresence, motion} from "framer-motion";
import type {HarnessConfig, HarnessWorkflow, WorkflowStep} from "@supernova/contracts/harnesses/schemas";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import SettingsPageShell from "@/features/settings/components/settings-page-shell";
import {SettingsGroup, SettingsRow} from "@/features/settings/components/settings-group";
import ConfigCard from "@/features/harnesses/components/config-card";
import ConfigChoice from "@/features/harnesses/components/config-choice";
import WorkflowGraph from "@/features/harnesses/components/workflow-graph/workflow-graph";
import WorkflowStepEditor from "@/features/harnesses/components/workflow-graph/workflow-step-editor";
import {agentLabel} from "@/features/harnesses/lib/agent-identity";
import {createWorkflow, insertWorkflowStep, moveWorkflowStep, removeWorkflowStep, workflowsPatch, workflowEffectsLabels} from "@/features/harnesses/lib/workflow-draft";

const maxWorkflows = 12;
const maxSteps = 12;
const panelTransition = {duration: 0.18, ease: [0.32, 0.72, 0, 1]} as const;

interface WorkflowsEditorProps {
  harness: HarnessConfig;
  onChange: (change: Pick<HarnessConfig, "graph" | "workflows">) => void;
  /** The workflow named in the URL. Without it the editor keeps its own selection. */
  selected?: string;
  onSelect?: (workflowId: string) => void;
}

/** Named dependency workflows with shared results and bounded parallel execution. Saving one starts nothing; the agent runs it when asked in chat. */
export default function WorkflowsEditor(props: WorkflowsEditorProps) {
  const {harness, onChange, selected, onSelect} = props;
  const workflows = harness.workflows ?? [];
  const [ownId, setOwnId] = useState(workflows[0]?.id ?? "");
  const selectedId = selected ?? ownId;
  const setSelectedId = (workflowId: string): void => {
    setOwnId(workflowId);
    onSelect?.(workflowId);
  };
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
                    title="Parallel steps"
                    description="Independent reads run together. Workspace writes remain exclusive."
                    control={
                      <Input
                        aria-label="Maximum parallel steps"
                        className="sm:w-40"
                        type="number"
                        min={1}
                        max={6}
                        value={workflow.maxParallel ?? 1}
                        onChange={(event) => patch({maxParallel: Number(event.target.value)})}
                      />
                    }
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
                    <p className="mb-4 text-xs leading-relaxed">
                      Branches can run together. A join waits for every incoming connection. Select a step to edit its inputs and results.
                    </p>
                    <WorkflowGraph
                      descriptions={Object.fromEntries(
                        steps.map((step) => [
                          step.id,
                          `${step.output.fields.map((field) => `${field.name}: ${field.type}`).join(", ")} · ${workflowEffectsLabels[step.effects]}${step.execution?.effort ? ` · ${step.execution.effort}` : ""}`,
                        ])
                      )}
                      selectedId={selectedStepId}
                      onSelect={setSelectedStepId}
                      steps={steps.map((step) => ({stepId: step.id, agent: step.agent, reads: step.reads, dependsOn: step.dependsOn ?? [], status: "pending", attempt: 0}))}
                    />
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
                      <Button
                        className="rounded-lg border border-border px-3 py-2 text-xs"
                        disabled={!nextAgent || steps.length >= maxSteps}
                        onClick={() => {
                          const next = insertWorkflowStep(steps, steps.length, nextAgent);
                          const added = next.at(-1)!;
                          writeSteps(next.map((step) => (step.id === added.id ? {...step, reads: selectedStep?.reads ?? [], dependsOn: selectedStep?.dependsOn} : step)));
                          setSelectedStepId(added.id);
                        }}
                      >
                        Add parallel branch
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
