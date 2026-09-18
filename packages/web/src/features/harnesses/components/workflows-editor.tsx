import {useState} from "react";
import {AnimatePresence, motion} from "framer-motion";
import type {HarnessConfig, HarnessWorkflow, WorkflowStep} from "@supernova/contracts/harnesses/schemas";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Icon from "@/components/ui/icon";
import SettingsPageShell from "@/features/settings/components/settings-page-shell";
import {SettingsGroup, SettingsLinkRow, SettingsNote, SettingsRow} from "@/features/settings/components/settings-group";
import ConfigChoice from "@/features/harnesses/components/config-choice";
import PromptEditor from "@/features/harnesses/components/prompt-editor";
import WorkflowGraph from "@/features/harnesses/components/workflow-graph/workflow-graph";
import WorkflowStepEditor from "@/features/harnesses/components/workflow-graph/workflow-step-editor";
import {agentLabel} from "@/features/harnesses/lib/agent-identity";
import {cn} from "@/lib/cn";
import {resolveHarnessPage} from "@/features/harnesses/lib/harness-sections";
import {createWorkflow, insertWorkflowStep, moveWorkflowStep, removeWorkflowStep, workflowsPatch, workflowEffectsLabels} from "@/features/harnesses/lib/workflow-draft";

const maxWorkflows = 12;
const maxSteps = 12;
const panelTransition = {duration: 0.18, ease: [0.32, 0.72, 0, 1]} as const;

interface WorkflowsEditorProps {
  harness: HarnessConfig;
  onChange: (change: Pick<HarnessConfig, "graph" | "workflows">) => void;
  /** The workflow in the URL. Without one the page lists every workflow. */
  selected?: string;
  /** Opens one workflow; an empty string returns to the list. */
  onSelect: (workflowId: string) => void;
}

/** Named dependency workflows: a list, and one page per workflow. Saving one starts nothing; the agent runs it when asked in chat. */
export default function WorkflowsEditor(props: WorkflowsEditorProps) {
  const {harness, onChange, selected, onSelect} = props;
  const workflows = harness.workflows ?? [];
  const page = resolveHarnessPage("workflows");
  const workflow = workflows.find((item) => item.id === selected);
  const [selectedStepId, setSelectedStepId] = useState(workflow?.steps[0]?.id ?? "");
  // In a wide window the first step is open beside the workflow. In a narrow one the inspector covers the page, so it waits for a step to be picked.
  const [stepPicked, setStepPicked] = useState(false);
  const [nextAgent, setNextAgent] = useState(harness.agents[0]?.name ?? "");
  const steps = workflow?.steps ?? [];
  const selectedIndex = steps.findIndex((step) => step.id === selectedStepId);
  const selectedStep = selectedIndex === -1 ? undefined : steps[selectedIndex]!;
  const write = (items: readonly HarnessWorkflow[]) => onChange(workflowsPatch(items));
  const patch = (change: Partial<HarnessWorkflow>) => write(workflows.map((item) => (item === workflow ? {...item, ...change} : item)));
  const writeSteps = (next: readonly WorkflowStep[]) => patch({steps: next});

  const openWorkflow = (workflowId: string): void => {
    setSelectedStepId(workflows.find((item) => item.id === workflowId)?.steps[0]?.id ?? "");
    setStepPicked(false);
    onSelect(workflowId);
  };

  const pickStep = (stepId: string): void => {
    setSelectedStepId(stepId);
    setStepPicked(stepId !== "");
  };

  const handleInsert = (index: number): void => {
    if (!nextAgent) return;
    const next = insertWorkflowStep(steps, index, nextAgent);
    writeSteps(next);
    pickStep(next[index]!.id);
  };

  const handleAddWorkflow = (): void => {
    const added = createWorkflow(workflows, harness.agents[0]?.name);
    write([...workflows, added]);
    setSelectedStepId("");
    onSelect(added.id);
  };

  const addButton = (
    <Button variant="filled" className="flex items-center gap-1.5 px-3 py-2 text-xs" disabled={workflows.length >= maxWorkflows} onClick={handleAddWorkflow}>
      <Icon name="plus" size="xs" />
      New workflow
    </Button>
  );

  if (!workflow) {
    return (
      <SettingsPageShell actions={addButton} description={page.description} testId="workflows-index" title={page.label}>
        <SettingsGroup
          description={workflows.length ? "Open a workflow to change its steps, limits and what each step hands on." : undefined}
          title={`${workflows.length} workflows`}
        >
          {workflows.map((item) => (
            <SettingsLinkRow
              description={item.description}
              key={item.id}
              label={`Open workflow ${item.name}`}
              meta={`${item.steps.length} ${item.steps.length === 1 ? "step" : "steps"}`}
              title={item.name}
              onClick={() => openWorkflow(item.id)}
            />
          ))}
          {!workflows.length && <SettingsNote>No workflow configured. Add one, then give each step an agent.</SettingsNote>}
        </SettingsGroup>
      </SettingsPageShell>
    );
  }

  return (
    <div className="@container flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden @4xl:flex-row">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <SettingsPageShell
            actions={
              workflows.length > 1 && (
                <ConfigChoice
                  className="w-52"
                  label="Workflow"
                  options={workflows.map((item) => ({value: item.id, label: item.name}))}
                  value={workflow.id}
                  onChange={openWorkflow}
                />
              )
            }
            back={{label: page.label, onClick: () => onSelect("")}}
            description={steps.length ? `${steps.length} ${steps.length === 1 ? "step" : "steps"} · ask for it by name in chat` : "No steps yet"}
            testId="workflow-detail"
            title={workflow.name}
          >
            <SettingsGroup title="Workflow">
              <SettingsRow description="Ask for this workflow by name in chat." stacked title="Name">
                <Input aria-label="Workflow name" value={workflow.name} onChange={(event) => patch({name: event.target.value})} />
              </SettingsRow>
              <SettingsRow description="Tells the lead when to run it." stacked title="Description">
                <PromptEditor label="Workflow description" size="sm" value={workflow.description} onChange={(description) => patch({description})} />
              </SettingsRow>
            </SettingsGroup>

            <SettingsGroup title="Steps">
              <div className="p-4">
                <p className="mb-4 text-xs leading-relaxed text-ink-muted">
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
                  onSelect={pickStep}
                  steps={steps.map((step) => ({stepId: step.id, agent: step.agent, reads: step.reads, dependsOn: step.dependsOn ?? [], status: "pending", attempt: 0}))}
                />
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <ConfigChoice
                    className="w-56"
                    label="Agent for the next workflow step"
                    value={nextAgent}
                    options={harness.agents.length ? harness.agents.map((agent) => ({value: agent.name, label: agentLabel(agent.name)})) : [{value: "", label: "No agents yet"}]}
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
                      pickStep(added.id);
                    }}
                  >
                    Add parallel branch
                  </Button>
                </div>
              </div>
            </SettingsGroup>

            <SettingsGroup
              collapsible
              description={`${workflow.maxParallel ?? 1} in parallel · ${workflow.limits.maxWallClockSeconds} s${workflow.limits.maxCostUsd ? ` · $${workflow.limits.maxCostUsd}` : ""}`}
              title="Limits"
            >
              <SettingsRow
                title="Parallel steps"
                description="Independent reads run together. Workspace writes remain exclusive."
                control={
                  <Input
                    aria-label="Maximum parallel steps"
                    className="@xl:w-40"
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
                    className="@xl:w-40"
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
                    className="@xl:w-40"
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

            <SettingsGroup title="Remove">
              <SettingsRow
                control={
                  <Button
                    className="rounded-lg border border-border px-3 py-2 text-xs text-danger-ink hover:bg-overlay-hover"
                    onClick={() => {
                      write(workflows.filter((item) => item !== workflow));
                      setSelectedStepId("");
                      onSelect("");
                    }}
                  >
                    Remove workflow
                  </Button>
                }
                description="Chats that already ran it keep their results."
                title={`Remove ${workflow.name}`}
              />
            </SettingsGroup>
          </SettingsPageShell>
        </div>

        <AnimatePresence initial={false}>
          {selectedStep && (
            <motion.aside
              animate={{opacity: 1, x: 0}}
              className={cn(
                "min-h-0 shrink-0 flex-col bg-surface @4xl:static @4xl:z-auto @4xl:flex @4xl:w-96 @4xl:border-l @4xl:border-border",
                stepPicked ? "absolute inset-0 z-20 flex" : "hidden"
              )}
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
                onClose={() => pickStep("")}
                onMove={(offset) => writeSteps(moveWorkflowStep(steps, selectedIndex, offset))}
                onRemove={() => {
                  writeSteps(removeWorkflowStep(steps, selectedStep.id));
                  pickStep("");
                }}
              />
            </motion.aside>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
