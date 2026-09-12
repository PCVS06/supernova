import Icon from "@/components/ui/icon";

/** Reserves the terminal workspace without pretending that an unimplemented shell transport is active. */
export default function WorkspaceTerminalView() {
  return (
    <div className="grid min-h-0 flex-1 place-items-center px-6 text-center">
      <div className="max-w-72 space-y-3">
        <Icon className="mx-auto text-ink-faint" name="terminal" size="lg" />
        <div className="space-y-1">
          <p className="text-sm font-medium text-ink">Terminal transport required</p>
          <p className="text-xs leading-relaxed text-ink-muted">
            This workspace is ready for a project terminal, but this build does not yet expose a safe server-side terminal session.
          </p>
        </div>
      </div>
    </div>
  );
}
