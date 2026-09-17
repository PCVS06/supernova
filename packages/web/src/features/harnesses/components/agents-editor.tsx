import {useState} from "react";
import type {HarnessAgent, HarnessConfig} from "@supernova/contracts/harnesses/schemas";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import {SettingsGroup, SettingsRow} from "@/features/settings/components/settings-group";
import AgentWorkbench from "@/features/harnesses/components/agent-workbench";
import type {AgentEditorSection} from "@/features/harnesses/components/agent-workbench";
import AgentIdentityPicker from "@/features/harnesses/components/agent-identity-picker";
import ConfigCard from "@/features/harnesses/components/config-card";
import PromptEditor from "@/features/harnesses/components/prompt-editor";
import ExecutionEditor from "@/features/harnesses/components/execution-editor";
import SkillsEditor from "@/features/harnesses/components/skills-editor";
import {agentLabel} from "@/features/harnesses/lib/agent-identity";

interface AgentsEditorProps {
  harness: HarnessConfig;
  /** The specialist in the URL, by name. Unknown names fall back to the first specialist. */
  selectedName?: string;
  /** Called with the specialist to open, or an empty string when none is left. */
  onSelect: (name: string) => void;
  onChange: (agents: readonly HarnessAgent[]) => void;
  /** The panel the page opens on. */
  initialSection?: AgentEditorSection;
}

/** The specialists of one harness. Each project's lead is configured with its project; the harness lead role under Instructions. */
export default function AgentsEditor(props: AgentsEditorProps) {
  const {harness, selectedName, onSelect, onChange, initialSection = "settings"} = props;
  const [section, setSection] = useState<AgentEditorSection>(initialSection);
  const agents = harness.agents;
  const agent = agents.find((item) => item.name === selectedName) ?? agents[0];
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

  const handleRemoveAgent = (): void => {
    const remaining = agents.filter((item) => item !== agent);
    onChange(remaining);
    onSelect(remaining[0]?.name ?? "");
  };

  return (
    <AgentWorkbench
      kind="specialist"
      identity={agent ? {id: agent.name, name: agentLabel(agent.name), color: agent.color, role: "Specialist", description: agent.description} : undefined}
      selection={{
        label: "Agents",
        value: agent?.name ?? "",
        items: agents.map((item) => ({
          id: item.name,
          name: agentLabel(item.name),
          color: item.color,
          kind: "specialist" as const,
          subtitle: item.execution?.model?.id ?? "Inherited model",
          searchText: item.description,
        })),
        onChange: onSelect,
        onAdd: handleAddAgent,
      }}
      section={agent ? section : undefined}
      onSectionChange={agent ? setSection : undefined}
    >
      {agent && section === "settings" && (
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
            <SettingsRow description="One sentence the lead delegates by." title="Role">
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
                <Button className="rounded-lg border border-border px-3 py-2 text-xs text-danger-ink" onClick={handleRemoveAgent}>
                  Remove agent
                </Button>
              }
              description="Workflow steps that reference this agent keep its name until you point them elsewhere."
              title="Remove specialist"
            />
          </SettingsGroup>
        </>
      )}
      {agent && section === "prompt" && (
        <SettingsGroup title="Instructions">
          <SettingsRow description="Added to the harness instructions whenever this specialist runs." title="Specialist role prompt">
            <PromptEditor label={agent.name + " system prompt"} value={agent.systemPrompt} onChange={(systemPrompt) => patch({systemPrompt})} />
          </SettingsRow>
        </SettingsGroup>
      )}
      {agent && section === "skills" && (
        <SettingsGroup title="Skills">
          <SkillsEditor harnessId={harness.id} inherited={harness.enabledSkills} value={agent.skillNames} onChange={(skillNames) => patch({skillNames})} />
        </SettingsGroup>
      )}
      {!agent && (
        <div className="px-3 sm:px-4">
          <ConfigCard className="flex flex-wrap items-center justify-between gap-4 border-dashed p-6">
            <div className="min-w-0 space-y-1">
              <p className="text-sm font-medium text-ink-strong">No specialists yet</p>
              <p className="text-xs leading-relaxed text-ink-muted">Specialists take bounded tasks from a project's lead. Each one has its own model, role, tools and skills.</p>
            </div>
            <Button variant="filled" className="px-3 py-2 text-xs" onClick={handleAddAgent}>
              Add agent
            </Button>
          </ConfigCard>
        </div>
      )}
    </AgentWorkbench>
  );
}
