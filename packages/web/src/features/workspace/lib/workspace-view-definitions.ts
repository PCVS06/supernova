import type {IconName} from "@/components/ui/icon";
import type {WorkspaceView} from "@/features/workspace/stores/workspace-panel-store";

interface WorkspaceViewDefinition {
  readonly icon: IconName;
  readonly label: string;
  readonly value: WorkspaceView;
}

/** Shared labels and icons for every view available from the right workspace panel. */
export const WORKSPACE_VIEW_DEFINITIONS = [
  {icon: "file", label: "Files", value: "files"},
  {icon: "globe", label: "Browser", value: "browser"},
  {icon: "terminal", label: "Terminal", value: "terminal"},
  {icon: "sliders", label: "Context", value: "context"},
] as const satisfies readonly WorkspaceViewDefinition[];
