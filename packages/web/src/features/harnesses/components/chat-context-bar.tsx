import {useState} from "react";
import {Link} from "@tanstack/react-router";
import Button from "@/components/ui/button";
import Dialog from "@/components/ui/dialog";
import Icon from "@/components/ui/icon";
import InstructionReceipt from "@/features/harnesses/components/instruction-receipt";
import {useChatHarness} from "@/features/harnesses/hooks/api/use-harness-runs";
import {useHarnessLibrary} from "@/features/harnesses/hooks/api/use-harnesses";
import {agentLabel} from "@/features/harnesses/lib/agent-identity";

interface ChatContextBarProps {
  readonly sessionId: string;
  readonly projectPath: string;
}

/** Opens captured context directly, with configuration and observed runtime clearly distinguished. */
export default function ChatContextBar(props: ChatContextBarProps) {
  const {sessionId, projectPath} = props;
  const [open, setOpen] = useState(false);
  const library = useHarnessLibrary();
  const context = useChatHarness(sessionId, open);
  const snapshot = context.data?.snapshot;
  const project = library.data?.projects.find((item) => item.path === projectPath);
  const harnessId = snapshot?.harness.id ?? project?.harnessId;
  const projectId = snapshot?.project.id ?? project?.id;
  const projectName = snapshot?.project.name ?? project?.name;

  return (
    <>
      <Button
        aria-haspopup="dialog"
        aria-expanded={open}
        className="flex h-7 shrink-0 items-center gap-1.5 rounded-lg px-2 text-xs text-ink-muted hover:bg-overlay-hover hover:text-ink"
        onClick={() => setOpen(true)}
        title="Inspect this chat's instructions, resources and runtime"
      >
        <Icon name="sliders" size="xs" />
        Context
      </Button>
      <Dialog className="h-full" containerClassName="h-[min(85svh,48rem)] w-[min(calc(100vw-2rem),52rem)]" onOpenChange={setOpen} open={open} title="Chat context">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-ink-muted">
          <p>
            {projectName ? agentLabel(projectName) : "This chat"}
            {snapshot && <span className="text-ink-faint"> · Captured revision {snapshot.revision}</span>}
          </p>
          {harnessId && projectId && (
            <Link
              className="flex items-center gap-1 text-ink-muted hover:text-ink"
              to="/settings/harness/$harnessId"
              params={{harnessId}}
              search={{projectId, section: "projects"}}
              onClick={() => setOpen(false)}
            >
              Project settings <Icon name="arrow-right" size="xs" />
            </Link>
          )}
        </div>
        {context.isPending && (
          <p role="status" className="py-6 text-sm text-ink-muted">
            Loading captured context…
          </p>
        )}
        {context.error && (
          <div role="alert" className="space-y-3 py-6 text-sm">
            <p className="text-danger-ink">Could not load this chat's context.</p>
            <Button className="text-ink-muted hover:text-ink" onClick={() => void context.refetch()}>
              Try again
            </Button>
          </div>
        )}
        {context.data && <InstructionReceipt layers={context.data.instructions} runtime={context.data.runtime} captured={context.data.captured} />}
      </Dialog>
    </>
  );
}
