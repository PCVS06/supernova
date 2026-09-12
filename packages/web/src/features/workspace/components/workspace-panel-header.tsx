import Button from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import IconButton from "@/components/ui/icon-button";
import {WORKSPACE_VIEW_DEFINITIONS} from "@/features/workspace/lib/workspace-view-definitions";
import {useWorkspacePanelStore} from "@/features/workspace/stores/workspace-panel-store";
import {cn} from "@/lib/cn";

/** Keeps every open workspace type in one browser-style tab strip. */
export default function WorkspacePanelHeader() {
  const activeView = useWorkspacePanelStore((state) => state.activeView);
  const closeView = useWorkspacePanelStore((state) => state.closeView);
  const openView = useWorkspacePanelStore((state) => state.openView);
  const pickerVisible = useWorkspacePanelStore((state) => state.pickerVisible);
  const showViewPicker = useWorkspacePanelStore((state) => state.showViewPicker);
  const tabs = useWorkspacePanelStore((state) => state.tabs);

  return (
    <header className="flex h-12 shrink-0 items-center gap-1 border-b border-border-muted px-2">
      <nav aria-label="Workspace tabs" className="scroll-fade-x flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
        {tabs.length === 0 && <span className="px-1 text-sm font-medium text-ink">Workspace</span>}
        {tabs.map((view) => {
          const definition = WORKSPACE_VIEW_DEFINITIONS.find((item) => item.value === view) ?? WORKSPACE_VIEW_DEFINITIONS[0];
          const active = !pickerVisible && activeView === view;
          return (
            <span
              className={cn("flex h-8 shrink-0 items-center rounded-lg", active && "bg-overlay-hover")}
              key={view}
              ref={active ? (node) => node?.scrollIntoView({block: "nearest", inline: "nearest"}) : undefined}
            >
              <Button
                aria-current={active ? "page" : undefined}
                aria-label={`Open ${definition.label} tab`}
                className="flex h-8 min-w-0 items-center gap-1.5 rounded-l-lg px-2 text-xs text-ink-muted hover:text-ink"
                onClick={() => openView(view)}
                variant="ghost"
              >
                <Icon className="text-ink-faint" name={definition.icon} size="xs" />
                <span>{definition.label}</span>
              </Button>
              <IconButton
                className="mr-1 size-6 shrink-0 rounded-md"
                label={`Close ${definition.label} tab`}
                onClick={() => closeView(view)}
                title={`Close ${definition.label} tab`}
              >
                <Icon name="x" size="xs" />
              </IconButton>
            </span>
          );
        })}
      </nav>
      <IconButton className="size-7 shrink-0" label="Add workspace tab" onClick={showViewPicker} title="Add workspace tab">
        <Icon name="plus" size="sm" />
      </IconButton>
    </header>
  );
}
