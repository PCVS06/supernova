import {Link} from "@tanstack/react-router";
import {activeHarness, useHarnessNavigationStore} from "@/features/harnesses/stores/harness-navigation-store";
import {useWorkspaceOverview} from "@/features/workspace/hooks/use-workspace-overview";
import {cn} from "@/lib/cn";

/** Opens the current harness's curator proposals directly from the utility bar. */
export default function SidebarInbox(props: {className?: string}) {
  const {className} = props;
  const activeHarnessId = useHarnessNavigationStore((state) => state.activeHarnessId);
  const overview = useWorkspaceOverview();
  const harness = activeHarness(overview.library?.harnesses ?? [], activeHarnessId);
  if (!harness) return null;
  const pending = overview.data?.curators.find((item) => item.harnessId === harness.id)?.pending ?? 0;
  return (
    <Link
      to="/inbox/$harnessId"
      params={{harnessId: harness.id}}
      aria-label="Inbox"
      title={`${harness.name} proposals${pending ? ` · ${pending} waiting` : ""}`}
      className={cn("relative", className)}
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="size-4 shrink-0">
        <path d="M5 5h14l3 10v5H2v-5L5 5Z" strokeLinejoin="round" />
        <path d="M2 15h6l2 3h4l2-3h6" strokeLinejoin="round" />
      </svg>
      {pending > 0 && <span className="absolute right-1 top-1 size-1 rounded-full bg-current" aria-label={`${pending} curator decisions`} />}
    </Link>
  );
}
