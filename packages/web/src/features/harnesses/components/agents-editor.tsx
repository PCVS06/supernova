import {useState} from "react";
import type {HarnessAgent, HarnessConfig} from "@supernova/contracts/harnesses/schemas";
import ConstantOrb from "@/components/brand/constant-orb";
import Button from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import Input from "@/components/ui/input";
import SettingsPageShell from "@/features/settings/components/settings-page-shell";
import {SettingsGroup, SettingsLinkRow, SettingsNote, SettingsRow} from "@/features/settings/components/settings-group";
import AgentIdentityPicker from "@/features/harnesses/components/agent-identity-picker";
import AgentMark from "@/features/harnesses/components/agent-mark";
import ConfigChoice from "@/features/harnesses/components/config-choice";
import PromptEditor from "@/features/harnesses/components/prompt-editor";
import ExecutionEditor from "@/features/harnesses/components/execution-editor";
import SkillsEditor from "@/features/harnesses/components/skills-editor";
import {agentLabel, agentMarks} from "@/features/harnesses/lib/agent-identity";
import {resolveHarnessPage} from "@/features/harnesses/lib/harness-sections";

interface IdentifierFieldProps {
  name: string;
  taken: readonly string[];
  onCommit: (name: string) => void;
}

/** The identifier is written when the field is left, so a half-typed name never reaches the workflow steps that reference it. */
function IdentifierField(props: IdentifierFieldProps) {
  const {name, taken, onCommit} = props;
  const [value, setValue] = useState(name);
  const next = value.trim();
  const clash = next !== name && taken.includes(next);

  const commit = (): void => {
    if (!next || clash) {
      setValue(name);
      return;
    }
    if (next !== name) onCommit(next);
  };

  return (
    <div className="w-full space-y-1 @xl:w-64">
      <Input
        aria-invalid={clash}
        aria-label="Agent identifier"
        spellCheck={false}
        value={value}
        onBlur={commit}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
        }}
      />
      {clash && (
        <p className="text-xs text-danger-ink" role="alert">
          Another agent already uses this identifier.
        </p>
      )}
    </div>
  );
}

interface ToolsFieldProps {
  tools: readonly string[];
  onChange: (tools: string[]) => void;
}

const parseTools = (text: string): string[] =>
  text
    .split(",")
    .map((tool) => tool.trim())
    .filter(Boolean);

/** Keeps the text as typed. Parsing on every keystroke used to swallow the comma that starts the next tool. */
function ToolsField(props: ToolsFieldProps) {
  const {tools, onChange} = props;
  const [text, setText] = useState(tools.join(", "));
  // The list changed without typing, such as on Discard: show what is stored again.
  if (parseTools(text).join("\n") !== tools.join("\n")) setText(tools.join(", "));

  return (
    <PromptEditor
      label="Allowed tools"
      size="sm"
      value={text}
      onChange={(value) => {
        setText(value);
        onChange(parseTools(value));
      }}
    />
  );
}

interface AgentsEditorProps {
  harness: HarnessConfig;
  /** The specialist in the URL, by identifier. Without one the page lists every specialist. */
  selectedName?: string;
  /** Opens one specialist; an empty string returns to the list. */
  onSelect: (name: string) => void;
  onChange: (agents: readonly HarnessAgent[]) => void;
}

/** The specialists of one harness: a list, and one page per specialist. Each project's lead is configured with its project. */
export default function AgentsEditor(props: AgentsEditorProps) {
  const {harness, selectedName, onSelect, onChange} = props;
  const [query, setQuery] = useState("");
  const agents = harness.agents;
  const page = resolveHarnessPage("agents");
  const found = selectedName === undefined ? -1 : agents.findIndex((item) => item.name === selectedName);
  // A rename reaches the draft one render before it reaches the URL; the open agent is kept by position meanwhile.
  const [openIndex, setOpenIndex] = useState(found);
  if (found !== -1 && found !== openIndex) setOpenIndex(found);
  const agent = selectedName === undefined ? undefined : (agents[found] ?? agents[openIndex]);
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

  const addButton = (
    <Button variant="filled" className="flex items-center gap-1.5 px-3 py-2 text-xs" onClick={handleAddAgent}>
      <Icon name="plus" size="xs" />
      New agent
    </Button>
  );

  if (!agent) {
    const filtered = agents.filter((item) => `${agentLabel(item.name)} ${item.name} ${item.description}`.toLowerCase().includes(query.toLowerCase()));

    return (
      <SettingsPageShell actions={addButton} description={page.description} testId="agents-index" title={page.label}>
        {selectedName !== undefined && (
          <p className="px-1 text-xs text-ink-muted" role="status">
            The agent “{selectedName}” no longer exists.
          </p>
        )}
        <SettingsGroup description={agents.length ? "Open an agent to change its role, model, skills and tools." : undefined} title={`${agents.length} specialists`}>
          {agents.length > 6 && (
            <div className="px-4 py-3">
              <Input aria-label="Search agents" placeholder="Search agents…" value={query} onChange={(event) => setQuery(event.target.value)} />
            </div>
          )}
          {filtered.map((item) => (
            <SettingsLinkRow
              description={item.description}
              key={item.name}
              label={`Configure ${agentLabel(item.name)}`}
              leading={<AgentMark className="size-8" color={item.color} kind="specialist" name={item.name} />}
              meta={item.execution?.model?.id ?? "Default model"}
              title={agentLabel(item.name)}
              onClick={() => onSelect(item.name)}
            />
          ))}
          {!agents.length && <SettingsNote>No specialists yet. A specialist takes bounded tasks from a project's lead and has its own model, role, tools and skills.</SettingsNote>}
          {agents.length > 0 && !filtered.length && <SettingsNote>No agent matches. Clear the search to see every agent.</SettingsNote>}
        </SettingsGroup>
      </SettingsPageShell>
    );
  }

  return (
    <SettingsPageShell
      actions={
        agents.length > 1 && (
          <ConfigChoice
            className="w-52"
            label="Switch agent"
            options={agents.map((item) => ({value: item.name, label: agentLabel(item.name)}))}
            value={agent.name}
            onChange={onSelect}
          />
        )
      }
      back={{label: page.label, onClick: () => onSelect("")}}
      description="Specialist"
      leading={<ConstantOrb className="size-12" constant={agentMarks.specialist.constant} label={`${agentLabel(agent.name)} specialist identity`} state="idle" />}
      testId="agent-detail"
      title={agentLabel(agent.name)}
    >
      <SettingsGroup title="Role">
        <SettingsRow description="One sentence the lead delegates by." title="Summary">
          <PromptEditor label="Agent role" size="sm" value={agent.description} onChange={(description) => patch({description})} />
        </SettingsRow>
        <SettingsRow description="Added to the harness instructions whenever this specialist runs." title="Instructions">
          <PromptEditor label={agent.name + " system prompt"} size="lg" value={agent.systemPrompt} onChange={(systemPrompt) => patch({systemPrompt})} />
        </SettingsRow>
      </SettingsGroup>
      <SettingsGroup title="Model">
        <ExecutionEditor inheritLabel="Use default model" value={agent.execution} inherited={harness.execution} onChange={(execution) => patch({execution})} />
      </SettingsGroup>
      <SettingsGroup
        collapsible
        description={agent.skillNames === undefined ? "Uses every skill the harness allows" : `${agent.skillNames.length} chosen for this specialist`}
        title="Skills"
      >
        <SkillsEditor harnessId={harness.id} inherited={harness.enabledSkills} value={agent.skillNames} onChange={(skillNames) => patch({skillNames})} />
      </SettingsGroup>
      <SettingsGroup collapsible description={`${agent.name} · color and identifier`} title="Identity">
        <AgentIdentityPicker name={agent.name} color={agent.color} kind="specialist" onChange={(color) => patch({color})} />
        <SettingsRow
          control={
            <IdentifierField
              key={agent.name}
              name={agent.name}
              taken={agents.map((item) => item.name)}
              onCommit={(name) => {
                patch({name});
                onSelect(name);
              }}
            />
          }
          description="Used by workflow steps and delegation tools. Renaming it updates the steps that reference it."
          title="Identifier"
        />
      </SettingsGroup>
      <SettingsGroup collapsible description={agent.tools.length ? agent.tools.join(", ") : "No tools"} title="Tools">
        <SettingsRow description="Comma-separated; an empty list disables tools for this specialist." title="Allowed tools">
          <ToolsField key={agent.name} tools={agent.tools} onChange={(tools) => patch({tools})} />
        </SettingsRow>
      </SettingsGroup>
      <SettingsGroup title="Remove">
        <SettingsRow
          control={
            <Button
              className="rounded-lg border border-border px-3 py-2 text-xs text-danger-ink hover:bg-overlay-hover"
              onClick={() => {
                onChange(agents.filter((item) => item !== agent));
                onSelect("");
              }}
            >
              Remove agent
            </Button>
          }
          description="Workflow steps that reference this agent keep its name until you point them elsewhere."
          title={`Remove ${agentLabel(agent.name)}`}
        />
      </SettingsGroup>
    </SettingsPageShell>
  );
}
