import {Link} from "@tanstack/react-router";
import Button from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import InstructionReceipt, {ContextDisclosure, ContextGroup} from "@/features/harnesses/components/instruction-receipt";
import {useChatHarness} from "@/features/harnesses/hooks/api/use-harness-runs";
import {useHarnessLibrary} from "@/features/harnesses/hooks/api/use-harnesses";
import {useFolderEntries} from "@/features/workspace/hooks/api/use-folder-entries";
import {pathFileName} from "@/features/workspace/lib/workspace-paths";
import {useWorkspacePanelStore} from "@/features/workspace/stores/workspace-panel-store";

const PROJECT_DOCUMENT_PATTERN = /^(?:context|goal|goals|plan|roadmap|todo)\.md$/i;

interface WorkspaceProjectFilesProps {
  readonly paths: readonly string[];
}

function WorkspaceProjectFiles(props: WorkspaceProjectFilesProps) {
  const {paths} = props;
  const openFile = useWorkspacePanelStore((state) => state.openFile);
  if (paths.length === 0) return null;

  return (
    <ContextDisclosure count={paths.length} icon="folder" label="Project files">
      <ul className="space-y-0.5">
        {paths.map((path) => (
          <li key={path}>
            <Button
              aria-label={`Open ${path} in Files`}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-ink-muted hover:bg-overlay-hover hover:text-ink"
              onClick={() => openFile(path)}
              variant="bare"
            >
              <Icon className="text-ink-faint" name="file" size="xs" />
              <span className="min-w-0 flex-1 truncate">{pathFileName(path)}</span>
            </Button>
          </li>
        ))}
      </ul>
    </ContextDisclosure>
  );
}

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
  const rootEntries = useFolderEntries({enabled: active, path: "", projectPath});
  const projectDocuments = [
    ...new Set([
      ...(snapshot?.project.planningDocuments ?? []),
      ...(project?.planningDocuments ?? []),
      ...(rootEntries.data?.entries ?? []).filter((entry) => entry.kind === "file" && PROJECT_DOCUMENT_PATTERN.test(entry.name)).map((entry) => entry.path),
    ]),
  ].toSorted((left, right) => left.localeCompare(right));

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col px-3">
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
      {context.data && (
        <div className="min-h-0 flex-1 overflow-y-auto py-3">
          <ContextGroup>
            <WorkspaceProjectFiles paths={projectDocuments} />
            <InstructionReceipt
              captured={context.data.captured}
              layers={context.data.instructions}
              runtime={context.data.runtime}
              roleConstant={(snapshot?.harness ?? library.data?.harnesses.find((harness) => harness.id === harnessId))?.coordinatorProjectId === projectId ? "tau" : "phi"}
              unframed
            />
          </ContextGroup>
        </div>
      )}
      <div className="flex shrink-0 justify-end py-3">
        {harnessId && projectId && (
          <Link
            aria-label="Project settings"
            className="grid size-7 shrink-0 place-items-center rounded-md text-ink-faint hover:bg-overlay-hover hover:text-ink"
            params={{harnessId, page: "projects"}}
            search={{project: projectId}}
            to="/settings/harness/$harnessId/$page"
          >
            <Icon name="settings" size="xs" />
          </Link>
        )}
      </div>
    </div>
  );
}
