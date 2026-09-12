import {Link} from "@tanstack/react-router";
import Button from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import InstructionReceipt from "@/features/harnesses/components/instruction-receipt";
import {useChatHarness} from "@/features/harnesses/hooks/api/use-harness-runs";
import {useHarnessLibrary} from "@/features/harnesses/hooks/api/use-harnesses";
import {agentLabel} from "@/features/harnesses/lib/agent-identity";

interface WorkspaceContextViewProps {
  readonly active: boolean;
  readonly projectPath: string;
  readonly sessionId: string;
}

/** Shows a chat's captured instructions, resources, and runtime directly in the workspace panel. */
export default function WorkspaceContextView(props: WorkspaceContextViewProps) {
  const {active, projectPath, sessionId} = props;
  const library = useHarnessLibrary();
  const context = useChatHarness(sessionId, active);
  const snapshot = context.data?.snapshot;
  const project = library.data?.projects.find((item) => item.path === projectPath);
  const harnessId = snapshot?.harness.id ?? project?.harnessId;
  const projectId = snapshot?.project.id ?? project?.id;
  const projectName = snapshot?.project.name ?? project?.name;

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col px-3">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border-muted py-3 text-xs text-ink-muted">
        <p className="min-w-0 truncate">
          {projectName ? agentLabel(projectName) : "This chat"}
          {snapshot && <span className="text-ink-faint"> · Revision {snapshot.revision}</span>}
        </p>
        {harnessId && projectId && (
          <Link
            className="flex shrink-0 items-center gap-1 text-ink-muted hover:text-ink"
            params={{harnessId}}
            search={{projectId, section: "projects"}}
            to="/settings/harness/$harnessId"
          >
            Settings <Icon name="arrow-right" size="xs" />
          </Link>
        )}
      </div>
      {context.isPending && (
        <p className="py-6 text-sm text-ink-muted" role="status">
          Loading captured context…
        </p>
      )}
      {context.error && (
        <div className="space-y-3 py-6 text-sm" role="alert">
          <p className="text-danger-ink">Could not load this chat's context.</p>
          <Button className="text-ink-muted hover:text-ink" onClick={() => void context.refetch()}>
            Try again
          </Button>
        </div>
      )}
      {context.data && <InstructionReceipt captured={context.data.captured} layers={context.data.instructions} runtime={context.data.runtime} />}
    </div>
  );
}
