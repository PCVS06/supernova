import {useState} from "react";
import type {HarnessAgent, HarnessConfig} from "@supernova/contracts/harnesses/schemas";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import {SettingsGroup, SettingsRow} from "@/features/settings/components/settings-group";
import AgentWorkbench from "@/features/harnesses/components/agent-workbench";
import type {AgentEditorSection} from "@/features/harnesses/components/agent-workbench";
import AgentIdentityPicker from "@/features/harnesses/components/agent-identity-picker";
import PromptEditor from "@/features/harnesses/components/prompt-editor";
import ExecutionEditor from "@/features/harnesses/components/execution-editor";
import SkillsEditor from "@/features/harnesses/components/skills-editor";
import {agentLabel} from "@/features/harnesses/lib/agent-identity";
import {mainOrchestratorAgent} from "@/features/harnesses/lib/harness-sections";
import type {HarnessPageId} from "@/features/harnesses/lib/harness-sections";

interface AgentsEditorProps {
  harness: HarnessConfig;
  /** The agent in the URL: the main orchestrator, or a specialist by name. */
  selectedName?: string;
  onSelect: (name: string) => void;
  onChange: (agents: readonly HarnessAgent[]) => void;
  onOpenPage: (page: HarnessPageId) => void;
  /** Name of the coordinating project, shown with the main orchestrator. */
  coordinatorName?: string;
  /** The panel the page opens on. */
  initialSection?: AgentEditorSection;
}

/** The agents of one harness in one list: the main orchestrator, then every specialist. */
export default function AgentsEditor(props: AgentsEditorProps) {
  const {harness, selectedName, onSelect, onChange, onOpenPage, coordinatorName, initialSection = "settings"} = props;
  const [section, setSection] = useState<AgentEditorSection>(initialSection);
  const agents = harness.agents;
  const isMain = !selectedName || selectedName === mainOrchestratorAgent;
  const agent = isMain ? undefined : (agents.find((item) => item.name === selectedName) ?? agents[0]);
  const patch = (change: Partial<HarnessAgent>) => onChange(agents.map((item) => (item === agent ? {...item, ...change} : item)));

  const handleAddAgent = (): void => {
    const next = {
      name: "agent-" + crypto.randomUUID().slice(0, 6),
      description: "New specialist",
      systemPrompt: "Define this agent's role and responsibilities.",
      tools: ["read", "grep", "find", "ls"],
    };
    onChange([...agents, next]);
    onSelect(next.name);
  };

  return (
    <AgentWorkbench
      kind={isMain ? "orchestrator" : "specialist"}
      identity={
        isMain
          ? {id: mainOrchestratorAgent, name: "Main orchestrator", role: "Coordinates every project", description: coordinatorName ?? ""}
          : agent
            ? {id: agent.name, name: agentLabel(agent.name), color: agent.color, role: "Specialist", description: agent.description}
            : undefined
      }
      selection={{
        label: "Agents",
        value: isMain ? mainOrchestratorAgent : (agent?.name ?? ""),
        items: [
          {id: mainOrchestratorAgent, name: "Main orchestrator", kind: "orchestrator" as const, subtitle: coordinatorName ?? "Harness-wide role"},
          ...agents.map((item) => ({
            id: item.name,
            name: agentLabel(item.name),
            color: item.color,
            kind: "specialist" as const,
            subtitle: item.execution?.model?.id ?? "Inherited model",
            searchText: item.description,
          })),
        ],
        onChange: onSelect,
        onAdd: handleAddAgent,
      }}
      section={section}
      onSectionChange={setSection}
    >
      {isMain && (
        <>
          {section === "settings" && (
            <SettingsGroup title="Set elsewhere">
              <SettingsRow
                control={
                  <Button className="rounded-lg border border-border px-3 py-2 text-xs text-ink-muted hover:text-ink" onClick={() => onOpenPage("overview")}>
                    Open Overview
                  </Button>
                }
                description="The default model, effort and run limits of this harness."
                title="Model and limits"
              />
              <SettingsRow
                control={
                  <Button className="rounded-lg border border-border px-3 py-2 text-xs text-ink-muted hover:text-ink" onClick={() => onOpenPage("overview")}>
                    Open Overview
                  </Button>
                }
                description={coordinatorName ? `${coordinatorName} runs the coordinating chats.` : "No coordinating project chosen yet."}
                title="Coordinating project"
              />
            </SettingsGroup>
          )}
          {section === "prompt" && (
            <SettingsGroup title="Set elsewhere">
              <SettingsRow
                control={
                  <Button className="rounded-lg border border-border px-3 py-2 text-xs text-ink-muted hover:text-ink" onClick={() => onOpenPage("instructions")}>
                    Open Instructions
                  </Button>
                }
                description="Every project of this harness inherits these instructions."
                title="Shared manual"
              />
              <SettingsRow
                control={
                  <Button className="rounded-lg border border-border px-3 py-2 text-xs text-ink-muted hover:text-ink" onClick={() => onOpenPage("instructions")}>
                    Open Instructions
                  </Button>
                }
                description="Only this orchestrator reads it."
                title="Coordination role"
              />
            </SettingsGroup>
          )}
          {section === "skills" && (
            <SettingsGroup title="Set elsewhere">
              <SettingsRow
                control={
                  <Button className="rounded-lg border border-border px-3 py-2 text-xs text-ink-muted hover:text-ink" onClick={() => onOpenPage("skills")}>
                    Open Skills & tools
                  </Button>
                }
                description="Skills are enabled once for the whole harness."
                title="Skill availability"
              />
            </SettingsGroup>
          )}
        </>
      )}
      {!isMain && agent && (
        <>
          {section === "settings" && (
            <>
              <SettingsGroup title="Execution">
                <ExecutionEditor inheritLabel="Use default model" value={agent.execution} inherited={harness.execution} onChange={(execution) => patch({execution})} />
              </SettingsGroup>
              <SettingsGroup title="Identity">
                <AgentIdentityPicker name={agent.name} color={agent.color} kind="specialist" onChange={(color) => patch({color})} />
                <SettingsRow
                  control={
                    <Input
                      aria-label="Agent identifier"
                      className="sm:w-64"
                      value={agent.name}
                      onChange={(event) => {
                        patch({name: event.target.value});
                        onSelect(event.target.value);
                      }}
                    />
                  }
                  description="Used by workflow steps and delegation tools; renaming it updates the steps that reference it."
                  title="Identifier"
                />
              </SettingsGroup>
              <SettingsGroup title="Responsibilities">
                <SettingsRow description="One sentence the orchestrator delegates by." title="Role">
                  <PromptEditor label="Agent role" size="sm" value={agent.description} onChange={(description) => patch({description})} />
                </SettingsRow>
                <SettingsRow description="Comma-separated; an empty list disables tools for this specialist." title="Tools">
                  <PromptEditor
                    label="Allowed tools"
                    size="sm"
                    value={agent.tools.join(", ")}
                    onChange={(value) =>
                      patch({
                        tools: value
                          .split(",")
                          .map((tool) => tool.trim())
                          .filter(Boolean),
                      })
                    }
                  />
                </SettingsRow>
                <SettingsRow
                  control={
                    <Button
                      className="rounded-lg border border-border px-3 py-2 text-xs text-danger-ink"
                      onClick={() => {
                        onChange(agents.filter((item) => item !== agent));
                        onSelect(mainOrchestratorAgent);
                      }}
                    >
                      Remove agent
                    </Button>
                  }
                  description="Workflow steps that reference this agent keep its name until you point them elsewhere."
                  title="Remove specialist"
                />
              </SettingsGroup>
            </>
          )}
          {section === "prompt" && (
            <SettingsGroup title="Instructions">
              <SettingsRow description="Added to the harness instructions whenever this specialist runs." title="Specialist role prompt">
                <PromptEditor label={agent.name + " system prompt"} value={agent.systemPrompt} onChange={(systemPrompt) => patch({systemPrompt})} />
              </SettingsRow>
            </SettingsGroup>
          )}
          {section === "skills" && (
            <SettingsGroup title="Skills">
              <SkillsEditor harnessId={harness.id} inherited={harness.enabledSkills} value={agent.skillNames} onChange={(skillNames) => patch({skillNames})} />
            </SettingsGroup>
          )}
        </>
      )}
      {!isMain && !agent && <p className="px-3 text-sm text-ink-muted sm:px-4">Add an agent to configure its model, role, tools, and skills.</p>}
    </AgentWorkbench>
  );
}
