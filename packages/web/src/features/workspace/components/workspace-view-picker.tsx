import Button from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import {WORKSPACE_VIEW_DEFINITIONS} from "@/features/workspace/lib/workspace-view-definitions";
import {useWorkspacePanelStore} from "@/features/workspace/stores/workspace-panel-store";
import {cn} from "@/lib/cn";

/** Lets users choose the right-hand workspace from inside the panel itself. */
export default function WorkspaceViewPicker() {
  const activeView = useWorkspacePanelStore((state) => state.activeView);
  const openView = useWorkspacePanelStore((state) => state.openView);

  return (
    <nav aria-label="Workspace view switcher" className="flex min-h-0 flex-1 items-center justify-center p-4">
      <div className="w-full max-w-72 space-y-1.5">
        {WORKSPACE_VIEW_DEFINITIONS.map((item) => (
          <Button
            aria-current={activeView === item.value ? "page" : undefined}
            aria-label={`Open ${item.label} workspace`}
            className={cn(
              "flex h-11 w-full items-center gap-3 rounded-xl px-3 text-sm text-ink-muted hover:bg-overlay-hover hover:text-ink-strong",
              activeView === item.value && "bg-overlay-hover text-ink-strong"
            )}
            key={item.value}
            onClick={() => openView(item.value)}
            variant="ghost"
          >
            <Icon name={item.icon} size="sm" />
            <span>{item.label}</span>
          </Button>
        ))}
      </div>
    </nav>
  );
}
