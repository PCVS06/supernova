import {useState} from "react";
import Button from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import ChatContextBar from "@/features/harnesses/components/chat-context-bar";
import {useChatHarness} from "@/features/harnesses/hooks/api/use-harness-runs";
import {useHarnessLibrary} from "@/features/harnesses/hooks/api/use-harnesses";
import {pathFileName} from "@/features/workspace/lib/workspace-paths";
import {useWorkspacePanelStore} from "@/features/workspace/stores/workspace-panel-store";
import {cn} from "@/lib/cn";

// The strip stays one line; the rest of the goals appear once it is expanded.
const COLLAPSED_DOCUMENT_COUNT = 3;

interface PlanningDocumentChipProps {
  readonly path: string;
}

function PlanningDocumentChip(props: PlanningDocumentChipProps) {
  const {path} = props;
  const openFile = useWorkspacePanelStore((state) => state.openFile);

  return (
    <Button
      className="flex min-w-0 shrink items-center gap-1 rounded-full border border-border-muted px-2 py-0.5 text-xs text-ink-muted hover:border-border hover:text-ink"
      onClick={() => openFile(path)}
      title={`Open ${path} in the workspace panel`}
      variant="bare"
    >
      <Icon className="shrink-0 text-ink-faint" name="file" size="xs" />
      <span className="min-w-0 truncate">{pathFileName(path)}</span>
    </Button>
  );
}

interface SessionContextStripProps {
  readonly projectPath: string;
  readonly sessionId: string;
}

/** Compact strip under the chat header: the project's goals, with its instructions one click away. */
export default function SessionContextStrip(props: SessionContextStripProps) {
  const {projectPath, sessionId} = props;
  const [expanded, setExpanded] = useState(false);
  const library = useHarnessLibrary();
  const context = useChatHarness(sessionId);
  const project = library.data?.projects.find((item) => item.path === projectPath);
  const revision = context.data?.snapshot?.revision;
  const planningDocuments = project?.planningDocuments ?? [];
  const visibleDocuments = expanded ? planningDocuments : planningDocuments.slice(0, COLLAPSED_DOCUMENT_COUNT);
  const hiddenDocumentCount = planningDocuments.length - visibleDocuments.length;

  const handleToggle = (): void => {
    setExpanded((current) => !current);
  };

  return (
    <div className="shrink-0 border-b border-border-muted">
      <div className="flex min-w-0 items-center gap-2 px-4 py-1.5">
        <span className="retro-label shrink-0 text-ink-faint">Goals</span>
        <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden">
          {planningDocuments.length === 0 ? (
            <span className="truncate text-xs text-ink-faint">No planning documents for this project yet.</span>
          ) : (
            visibleDocuments.map((path) => <PlanningDocumentChip key={path} path={path} />)
          )}
          {hiddenDocumentCount > 0 && <span className="shrink-0 text-xs text-ink-faint">+{hiddenDocumentCount}</span>}
        </div>
        {revision !== undefined && (
          <span className="shrink-0 font-mono text-xs text-ink-faint" title="Instructions revision this chat runs on">
            rev {revision}
          </span>
        )}
        <Button
          aria-expanded={expanded}
          className="flex shrink-0 items-center gap-1 text-xs text-ink-muted hover:text-ink"
          onClick={handleToggle}
          title={expanded ? "Hide the chat's context" : "Show the chat's instructions and resources"}
          variant="bare"
        >
          <span>Context</span>
          <Icon className={cn("transition-transform duration-160 ease-out", expanded && "rotate-90")} name="chevron-right" size="xs" />
        </Button>
      </div>
      {expanded && <ChatContextBar projectPath={projectPath} sessionId={sessionId} />}
    </div>
  );
}
