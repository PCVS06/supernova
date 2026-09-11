import {useMountEffect} from "@/lib/use-mount-effect";
import {useWorkspacePanelStore} from "@/features/workspace/stores/workspace-panel-store";

/** Binds the panel's window shortcuts: Cmd/Ctrl+Shift+F for Files, Cmd/Ctrl+Shift+B for Browser. */
export function useWorkspaceShortcuts(): void {
  useMountEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (!(event.metaKey || event.ctrlKey) || !event.shiftKey || event.altKey) return;

      const key = event.key.toLowerCase();
      if (key !== "f" && key !== "b") return;

      event.preventDefault();
      useWorkspacePanelStore.getState().toggleView(key === "f" ? "files" : "browser");
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });
}
