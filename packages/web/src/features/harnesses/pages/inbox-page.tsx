import type {ReactNode} from "react";
import {Link} from "@tanstack/react-router";
import CurationInbox from "@/features/harnesses/components/curation-inbox";
import CuratorReviewList from "@/features/harnesses/components/curator-review-list";
import {useHarnessLibrary} from "@/features/harnesses/hooks/api/use-harnesses";

interface InboxPageProps {
  harnessId: string;
}

function InboxFrame(props: {children: ReactNode; owner?: string}) {
  const {children, owner} = props;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="shrink-0 border-b border-border px-5 py-3 sm:px-6">
        <div className="flex items-baseline gap-2">
          {owner && <span className="truncate text-xs text-ink-faint">{owner}</span>}
          <h1 className="truncate text-sm font-medium text-ink-strong">Inbox</h1>
        </div>
        <p className="mt-1 text-xs text-ink-muted">Decisions apply at once.</p>
      </header>
      {children}
    </div>
  );
}

/** Curator proposals of one harness, outside settings: deciding here is the work, not a setting. */
export default function InboxPage(props: InboxPageProps) {
  const {harnessId} = props;
  const library = useHarnessLibrary();
  const harness = library.data?.harnesses.find((item) => item.id === harnessId);
  const projects = (library.data?.projects ?? []).filter((item) => item.harnessId === harnessId);

  if (!harness) {
    return (
      <InboxFrame>
        {library.data ? (
          <p className="p-6 text-sm text-ink-muted">
            This harness no longer exists.{" "}
            <Link className="underline" params={{sectionId: "harnesses"}} to="/settings/$sectionId">
              Open Settings › Harnesses
            </Link>
          </p>
        ) : (
          <p className="p-6 text-sm text-ink-muted" role="status">
            {library.isError ? "Could not load the inbox." : "Loading the inbox…"}
          </p>
        )}
      </InboxFrame>
    );
  }

  return (
    <InboxFrame owner={harness.name}>
      <div className="scroll-fade-y min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-12 px-5 pb-12 pt-6 sm:px-6">
          <CurationInbox harnessId={harness.id} projects={projects} />
          <CuratorReviewList harnessId={harness.id} />
        </div>
      </div>
    </InboxFrame>
  );
}
