import type {IconName} from "@/components/ui/icon";
import type {WorkspaceView} from "@/features/workspace/stores/workspace-panel-store";

interface WorkspaceViewDefinition {
  readonly icon: IconName;
  readonly label: string;
  readonly shortcut?: string;
  readonly value: WorkspaceView;
}

/** Shared labels and icons for every view available from the right workspace panel. */
export const WORKSPACE_VIEW_DEFINITIONS = [
  {icon: "file", label: "Files", shortcut: "⇧⌘F", value: "files"},
  {icon: "globe", label: "Browser", shortcut: "⇧⌘B", value: "browser"},
  {icon: "terminal", label: "Terminal", shortcut: undefined, value: "terminal"},
  {icon: "sliders", label: "Context", shortcut: undefined, value: "context"},
] as const satisfies readonly WorkspaceViewDefinition[];
