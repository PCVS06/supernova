import {useState} from "react";
import type {HarnessAgent, HarnessConfig, HarnessProject} from "@supernova/contracts/harnesses/schemas";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import {SettingsGroup, SettingsRow} from "@/features/settings/components/settings-group";
import AgentWorkbench from "@/features/harnesses/components/agent-workbench";
import type {AgentEditorSection} from "@/features/harnesses/components/agent-workbench";
import AgentIdentityPicker from "@/features/harnesses/components/agent-identity-picker";
import AgentMemoryPanel from "@/features/harnesses/components/agent-memory-panel";
import PromptEditor from "@/features/harnesses/components/prompt-editor";
import ExecutionEditor from "@/features/harnesses/components/execution-editor";
import SkillsEditor from "@/features/harnesses/components/skills-editor";
import {agentLabel} from "@/features/harnesses/lib/agent-identity";

interface AgentsEditorProps {
  agents: readonly HarnessAgent[];
  onChange: (agents: readonly HarnessAgent[]) => void;
  harness?: HarnessConfig;
  selectedName?: string;
  inheritedAgents?: readonly HarnessAgent[];
  /** Ledgers a specialist may read on its Memory tab. */
  projects?: readonly HarnessProject[];
  /** The project whose ledger opens first, usually the one selected in the page. */
  memoryProjectId?: string;
}

export default function AgentsEditor(props: AgentsEditorProps) {
  const {agents, onChange, harness, selectedName, inheritedAgents, projects = [], memoryProjectId} = props;
  const [name, setName] = useState(selectedName ?? agents[0]?.name ?? "");
  const [section, setSection] = useState<AgentEditorSection>("settings");
  const agent = agents.find((item) => item.name === name) ?? agents[0];
  const patch = (change: Partial<HarnessAgent>) => onChange(agents.map((item) => (item === agent ? {...item, ...change} : item)));
  const inherited = inheritedAgents?.find((item) => item.name === agent?.name);

  const handleAddAgent = (): void => {
    const next = {
      name: "agent-" + crypto.randomUUID().slice(0, 6),
      description: "New specialist",
      systemPrompt: "Define this agent's role and responsibilities.",
      tools: ["read", "grep", "find", "ls"],
    };
    onChange([...agents, next]);
    setName(next.name);
  };

  return (
    <AgentWorkbench
      kind="specialist"
      identity={agent ? {id: agent.name, name: agentLabel(agent.name), color: agent.color, role: "Specialist", description: ""} : undefined}
      selection={{
        label: "Specialists",
        value: agent?.name ?? "",
        items: agents.map((item) => ({
          id: item.name,
          name: agentLabel(item.name),
          color: item.color,
          subtitle: item.execution?.model?.id ?? "Inherited model",
          searchText: item.description,
        })),
        onChange: setName,
        onAdd: handleAddAgent,
      }}
      section={section}
      onSectionChange={setSection}
    >
      {agent ? (
        <>
          {section === "settings" && (
            <>
              <SettingsGroup title="Execution">
                <ExecutionEditor inheritLabel="Use default model" value={agent.execution} inherited={harness?.execution} onChange={(execution) => patch({execution})} />
              </SettingsGroup>
              <SettingsGroup title="Identity">
                <AgentIdentityPicker name={agent.name} color={agent.color} kind="specialist" onChange={(color) => patch({color})} />
                <SettingsRow
                  control={
                    <Input
                      aria-label="Agent identifier"
                      className="sm:w-64"
                      disabled={!!inherited}
                      value={agent.name}
                      onChange={(event) => {
                        patch({name: event.target.value});
                        setName(event.target.value);
                      }}
                    />
                  }
                  description="Used by workflow steps and delegation tools. Renaming it updates the steps that reference it."
                  title="Identifier"
                />
              </SettingsGroup>
              <SettingsGroup title="Responsibilities">
                <SettingsRow
                  description={inherited ? (JSON.stringify(inherited) === JSON.stringify(agent) ? "Inherited from the harness." : "Overridden for this project.") : "Harness role."}
                  title="Role"
                >
                  <PromptEditor label="Agent role" size="sm" value={agent.description} onChange={(description) => patch({description})} />
                </SettingsRow>
                <SettingsRow description="Comma-separated. An empty list disables tools for this specialist." title="Tools">
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
                {inherited && (
                  <SettingsRow
                    control={
                      <Button
                        className="rounded-lg border border-border px-3 py-2 text-xs text-ink-muted hover:text-ink"
                        onClick={() => onChange(agents.map((item) => (item === agent ? inherited : item)))}
                      >
                        Reset to harness defaults
                      </Button>
                    }
                    description="Drops this project's override and follows the harness definition again."
                    title="Project override"
                  />
                )}
                {!inherited && (
                  <SettingsRow
                    control={
                      <Button
                        className="rounded-lg border border-border px-3 py-2 text-xs text-danger-ink"
                        onClick={() => {
                          onChange(agents.filter((item) => item !== agent));
                          setName("");
                        }}
                      >
                        Remove agent
                      </Button>
                    }
                    description="Workflow steps that reference this agent keep its name until you point them elsewhere."
                    title="Remove specialist"
                  />
                )}
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
          {section === "skills" && harness && (
            <SettingsGroup title="Skills">
              <SkillsEditor harnessId={harness.id} inherited={harness.enabledSkills} value={agent.skillNames} onChange={(skillNames) => patch({skillNames})} />
            </SettingsGroup>
          )}
          {section === "memory" && harness && (
            <AgentMemoryPanel explanation="Specialists share the ledger of the project they work in." harnessId={harness.id} projectId={memoryProjectId} projects={projects} />
          )}
        </>
      ) : (
        <p className="px-3 text-sm text-ink-muted sm:px-4">Add an agent to configure its model, role, tools, and skills.</p>
      )}
    </AgentWorkbench>
  );
}
