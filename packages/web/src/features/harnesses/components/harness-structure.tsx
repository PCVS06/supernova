import type {HarnessConfig, HarnessProject} from "@supernova/contracts/harnesses/schemas";
import Button from "@/components/ui/button";
import AgentMark from "@/features/harnesses/components/agent-mark";
import {agentLabel} from "@/features/harnesses/lib/agent-identity";

/** Shows ownership, rather than treating the coordinating workspace as a peer lab. */
export default function HarnessStructure(props: {harness: HarnessConfig; projects: readonly HarnessProject[]; onProject: (id: string) => void; onAgent: (name: string) => void}) {
  const {harness, projects, onProject, onAgent} = props;
  const head = projects.find((project) => project.id === harness.coordinatorProjectId);
  const labs = projects.filter((project) => project.id !== head?.id);
  return (
    <div className="space-y-5" aria-label="Orchestration hierarchy">
      {head && (
        <Button className="flex w-full items-center gap-4 rounded-xl border border-border bg-surface-raised p-4 text-left" onClick={() => onProject(head.id)}>
          <AgentMark name={head.id} color={head.color ?? "#ffffff"} kind="lead" className="size-12" />
          <span>
            <span className="block text-base font-medium">{head.name}</span>
            <span className="mt-1 block text-xs text-ink-muted">Head orchestrator · coordinates {labs.length} labs</span>
          </span>
        </Button>
      )}
      <div className={head ? "ml-6 border-l border-border pl-5" : ""}>
        <p className="mb-3 text-xs text-ink-muted">{head ? "Lab orchestrators" : "Projects"}</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {labs.map((lab) => (
            <Button key={lab.id} className="flex items-center gap-3 rounded-lg border border-border px-3 py-3 text-left hover:bg-overlay-hover" onClick={() => onProject(lab.id)}>
              <AgentMark name={lab.id} color={lab.color} kind="lead" className="size-9" />
              <span className="min-w-0 text-sm leading-snug">{agentLabel(lab.name)}</span>
            </Button>
          ))}
        </div>
        <div className="mt-5 border-t border-border pt-4">
          <p className="mb-3 text-xs text-ink-muted">Specialist team · inherited by each lab</p>
          <div className="flex flex-wrap gap-2">
            {harness.agents.map((agent) => (
              <Button
                key={agent.name}
                className="flex items-center gap-2 rounded-lg bg-surface-raised px-2 py-1 text-xs"
                title={agent.description}
                onClick={() => onAgent(agent.name)}
              >
                <AgentMark name={agent.name} color={agent.color} className="size-7" />
                {agentLabel(agent.name)}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
