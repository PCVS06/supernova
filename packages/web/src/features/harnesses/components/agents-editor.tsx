import {useState} from "react";
import AgentWorkbench from "@/features/harnesses/components/agent-workbench";
import AgentIdentityPicker from "@/features/harnesses/components/agent-identity-picker";
import type {HarnessAgent, HarnessConfig} from "@supernova/contracts/harnesses/schemas";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import {ConfigField, PromptEditor} from "@/features/harnesses/components/config-fields";
import ExecutionEditor from "@/features/harnesses/components/execution-editor";
import SkillsEditor from "@/features/harnesses/components/skills-editor";
import {agentLabel} from "@/features/harnesses/lib/agent-identity";

interface AgentsEditorProps {
  agents: readonly HarnessAgent[];
  onChange: (agents: readonly HarnessAgent[]) => void;
  harness?: HarnessConfig;
  selectedName?: string;
  inheritedAgents?: readonly HarnessAgent[];
}

export default function AgentsEditor(props: AgentsEditorProps) {
  const {agents, onChange, harness, selectedName, inheritedAgents} = props;
  const [name, setName] = useState(selectedName ?? agents[0]?.name ?? "");
  const [section, setSection] = useState<"settings" | "prompt" | "skills">("settings");
  const agent = agents.find((item) => item.name === name) ?? agents[0];
  const patch = (change: Partial<HarnessAgent>) => onChange(agents.map((item) => (item === agent ? {...item, ...change} : item)));
  const inherited = inheritedAgents?.find((item) => item.name === agent?.name);
  const handleAddAgent = () => {
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
              <ExecutionEditor inheritLabel="Use default model" value={agent.execution} inherited={harness?.execution} onChange={(execution) => patch({execution})} />
              <AgentIdentityPicker name={agent.name} color={agent.color} kind="specialist" onChange={(color) => patch({color})} />
              <section aria-label="Agent responsibilities" className="rounded-xl border border-border bg-surface-raised p-4">
                <h3 className="text-xs uppercase tracking-wider text-ink-muted">Responsibilities</h3>
                <p className="mt-2 mb-4 text-xs leading-relaxed text-ink-muted">
                  {inherited ? (JSON.stringify(inherited) === JSON.stringify(agent) ? "Inherited" : "Project override") : "Harness role"}
                </p>
                <ConfigField label="Role">
                  <textarea
                    aria-label="Agent role"
                    className="h-24 w-full resize-none rounded-lg border border-border bg-surface-raised p-3 text-sm"
                    value={agent.description}
                    onChange={(event) => patch({description: event.target.value})}
                  />
                </ConfigField>
              </section>
              <ConfigField label="Identifier">
                <Input
                  disabled={!!inherited}
                  value={agent.name}
                  onChange={(event) => {
                    patch({name: event.target.value});
                    setName(event.target.value);
                  }}
                />
              </ConfigField>

              <ConfigField label="Tools" description="Comma-separated · empty disables tools">
                <PromptEditor
                  compact
                  label="Allowed tools"
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
              </ConfigField>
              {inherited && (
                <Button className="text-xs text-ink-muted" onClick={() => onChange(agents.map((item) => (item === agent ? inherited : item)))}>
                  Reset this agent to harness defaults
                </Button>
              )}
              {!inherited && (
                <Button
                  className="text-xs text-danger-ink"
                  onClick={() => {
                    onChange(agents.filter((item) => item !== agent));
                    setName("");
                  }}
                >
                  Remove agent
                </Button>
              )}
            </>
          )}
          {section === "prompt" && (
            <>
              <ConfigField label="Specialist role prompt">
                <PromptEditor label={agent.name + " system prompt"} value={agent.systemPrompt} onChange={(systemPrompt) => patch({systemPrompt})} />
              </ConfigField>
            </>
          )}
          {section === "skills" && harness && (
            <>
              <div className="rounded-xl border border-border p-4">
                <h3 className="text-sm font-medium">Specialist skill availability</h3>
              </div>
              <SkillsEditor harnessId={harness.id} inherited={harness.enabledSkills} value={agent.skillNames} onChange={(skillNames) => patch({skillNames})} />
            </>
          )}
        </>
      ) : (
        <p className="text-sm text-ink-muted">Add an agent to configure its model, role, tools, and skills.</p>
      )}
    </AgentWorkbench>
  );
}
