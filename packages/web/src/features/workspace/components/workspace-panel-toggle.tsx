import Button from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import {useWorkspacePanelStore} from "@/features/workspace/stores/workspace-panel-store";
import {cn} from "@/lib/cn";

/** Opens the right workspace selector or closes the active workspace panel. */
export default function WorkspacePanelToggle() {
  const visible = useWorkspacePanelStore((state) => state.visible);
  const togglePanel = useWorkspacePanelStore((state) => state.togglePanel);

  return (
    <Button
      aria-label="Toggle workspace panel"
      aria-pressed={visible}
      className={cn("size-7 text-ink-muted hover:bg-overlay-hover hover:text-ink", visible && "bg-overlay-hover text-ink-strong")}
      onClick={togglePanel}
      shape="icon"
      size="md"
      title="Workspace panel"
      variant="ghost"
    >
      <Icon name="panel-right" size="sm" />
    </Button>
  );
}
