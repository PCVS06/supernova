import {useMountEffect} from "@/lib/use-mount-effect";
import {useWorkspacePanelStore} from "@/features/workspace/stores/workspace-panel-store";
import {Link} from "@tanstack/react-router";
import Button from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import WorkerRunDetail from "@/features/harnesses/components/worker-run/worker-run-detail";
import {useHarnessRun} from "@/features/harnesses/hooks/api/use-harness-runs";

interface WorkerWorkspaceTargetProps {
  readonly sessionId: string;
  readonly projectPath: string;
}

/** A worker's shared workspace belongs to the chat that delegated it. */
function WorkerWorkspaceTarget({sessionId, projectPath}: WorkerWorkspaceTargetProps) {
  useMountEffect(() => {
    useWorkspacePanelStore.getState().setTarget({sessionId, projectPath});
  });
  return null;
}

interface HarnessRunPageProps {
  sessionId: string;
  runId: string;
}

/** The actual worker conversation, always scoped to the chat that delegated it. */
export default function HarnessRunPage(props: HarnessRunPageProps) {
  const {sessionId, runId} = props;
  const query = useHarnessRun(sessionId, runId);
  const run = query.data;
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="shrink-0 border-b border-border-muted px-6 py-3">
        <Link to="/session/$sessionId" params={{sessionId}} className="inline-flex items-center gap-2 text-sm text-ink-muted hover:text-ink">
          <Icon name="arrow-left" size="sm" /> Back to chat
        </Link>
      </header>
      {query.error && (
        <div role="alert" className="flex items-center justify-between gap-3 border-b border-border px-6 py-3 text-sm">
          <p className="text-danger-ink">{run ? "Updates unavailable. Showing the last saved observation." : "Could not load this worker's conversation."}</p>
          <Button variant="primary" size="sm" className="w-auto shrink-0" onClick={() => void query.refetch()}>
            Try again
          </Button>
        </div>
      )}
      {!run && !query.error && (
        <p role="status" className="p-6 text-sm text-ink-muted">
          Loading worker conversation…
        </p>
      )}
      {run && <WorkerWorkspaceTarget key={`${sessionId}:${run.projectPath}`} sessionId={sessionId} projectPath={run.projectPath} />}
      {run && <WorkerRunDetail key={run.id} run={run} stale={Boolean(query.error)} />}
    </div>
  );
}
