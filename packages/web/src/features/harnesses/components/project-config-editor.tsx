import {useState} from "react";
import type {HarnessConfig, HarnessProject} from "@supernova/contracts/harnesses/schemas";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import {ConfigField, PromptEditor} from "@/features/harnesses/components/config-fields";
import AgentsEditor from "@/features/harnesses/components/agents-editor";
import {useSaveHarnessProject} from "@/features/harnesses/hooks/api/use-harnesses";

interface ProjectConfigEditorProps {
  project: HarnessProject;
  harness: HarnessConfig;
  revision: number;
  isNew?: boolean;
}

export default function ProjectConfigEditor(props: ProjectConfigEditorProps) {
  const {project, harness, revision, isNew} = props;
  const [draft, setDraft] = useState(project);
  const [agentName, setAgentName] = useState(harness.agents[0]?.name ?? "");
  const save = useSaveHarnessProject();
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <ConfigField label="Project name">
          <Input value={draft.name} onChange={(event) => setDraft({...draft, name: event.target.value})} />
        </ConfigField>
        <ConfigField label="Folder on the server" description="The working directory stays fixed once linked.">
          <Input value={draft.path} readOnly={!isNew} onChange={(event) => setDraft({...draft, path: event.target.value})} placeholder="/absolute/path/to/project" />
        </ConfigField>
      </div>
      <ConfigField label="Project system instructions" description={`Appended to ${harness.name}'s shared instructions. Other projects are unaffected.`}>
        <PromptEditor label="Project system instructions" value={draft.systemPrompt} onChange={(systemPrompt) => setDraft({...draft, systemPrompt})} />
      </ConfigField>
      <ConfigField label="Project context instructions">
        <PromptEditor
          label="Project context instructions"
          compact
          value={draft.contextInstructions}
          onChange={(contextInstructions) => setDraft({...draft, contextInstructions})}
        />
      </ConfigField>
      <div className="space-y-4 border-t border-border pt-5">
        <h3 className="text-sm font-medium">Specialist overrides</h3>
        <p className="text-xs text-ink-muted">Agents inherit from the harness unless overridden here by name.</p>
        <div className="flex gap-3">
          <select
            aria-label="Agent to override"
            className="min-w-48 rounded-lg border border-border bg-surface-control px-3 py-2 text-sm"
            value={agentName}
            onChange={(event) => setAgentName(event.target.value)}
          >
            {harness.agents.map((agent) => (
              <option key={agent.name}>{agent.name}</option>
            ))}
          </select>
          <Button
            variant="filled"
            className="px-3 py-2 text-sm"
            disabled={!agentName || draft.agents.some((agent) => agent.name === agentName)}
            onClick={() => {
              const agent = harness.agents.find((item) => item.name === agentName);
              if (agent) setDraft({...draft, agents: [...draft.agents, agent]});
            }}
          >
            Override agent
          </Button>
        </div>
        <AgentsEditor agents={draft.agents} onChange={(agents) => setDraft({...draft, agents})} />
      </div>
      {save.error && (
        <p className="text-sm text-danger-ink" role="alert">
          {String(save.error)}
        </p>
      )}
      <div className="flex items-center gap-3">
        <Button className="px-4 py-2 text-sm" variant="filled" disabled={save.isPending} onClick={() => save.mutate({project: draft, expectedRevision: revision})}>
          {save.isPending ? "Saving…" : isNew ? "Link project" : "Save project overrides"}
        </Button>
        <span className="text-xs text-ink-muted">Applies to new chats. Original project files are not overwritten.</span>
      </div>
    </div>
  );
}
