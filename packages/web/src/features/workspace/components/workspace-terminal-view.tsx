import Icon from "@/components/ui/icon";

/** Explains terminal availability before the user tries to start a shell. */
export default function WorkspaceTerminalView() {
  return (
    <div className="grid min-h-0 flex-1 place-items-center px-6 text-center">
      <div className="max-w-72 space-y-3">
        <Icon className="mx-auto text-ink-faint" name="terminal" size="lg" />
        <div className="space-y-1">
          <p className="text-sm font-medium text-ink">Terminal unavailable in this version</p>
          <p className="text-xs leading-relaxed text-ink-muted">
            Use your external terminal in the project folder shown above. You can find and copy file paths from the Files workspace.
          </p>
        </div>
      </div>
    </div>
  );
}
