import {useState} from "react";
import {Link} from "@tanstack/react-router";
import Button from "@/components/ui/button";
import InstructionReceipt from "@/features/harnesses/components/instruction-receipt";
import {useChatHarness} from "@/features/harnesses/hooks/api/use-harness-runs";
import {useHarnessLibrary} from "@/features/harnesses/hooks/api/use-harnesses";
import {agentLabel} from "@/features/harnesses/lib/agent-identity";

/** Shows who the user is talking to and where the chat's instructions came from. */
export default function ChatContextBar({sessionId, projectPath}: {sessionId: string; projectPath: string}) {
  const [open, setOpen] = useState(false);
  const library = useHarnessLibrary();
  const project = library.data?.projects.find((item) => item.path === projectPath);
  const context = useChatHarness(sessionId, open);
  const snapshot = context.data?.snapshot;
  if (!project && !snapshot) return null;
  return (
    <div className="shrink-0 border-b border-border">
      <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-2 text-xs">
        <Link
          className="truncate text-ink-muted"
          to="/settings/harness/$harnessId"
          params={{harnessId: project?.harnessId ?? snapshot!.harness.id}}
          search={{projectId: project?.id ?? snapshot!.project.id, section: "projects"}}
        >
          {agentLabel(project?.name ?? snapshot!.project.name)} <span className="text-ink-faint">/ Chat · talking to the project lead</span>
        </Link>
        <Button aria-expanded={open} className="text-ink-muted" onClick={() => setOpen(!open)}>
          {open ? "Close instructions" : "Instructions & resources"}
        </Button>
      </div>
      {open && (
        <div className="max-h-[50vh] overflow-y-auto border-t border-border p-5">
          {context.error && (
            <p role="alert" className="text-sm text-danger-ink">
              Could not load this chat's instructions.
            </p>
          )}
          {context.isPending && <p className="text-xs text-ink-muted">Loading captured instructions…</p>}
          {context.data && (
            <>
              <p className="mb-3 text-xs text-ink-muted">Configuration revision {snapshot?.revision ?? "unmanaged"} · Settings changes apply to new chats.</p>
              <InstructionReceipt layers={context.data.instructions} runtime={context.data.runtime} captured={context.data.captured} />
            </>
          )}
        </div>
      )}
    </div>
  );
}
