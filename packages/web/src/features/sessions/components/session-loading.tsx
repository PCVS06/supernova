import Icon from "@/components/ui/icon";
import IconButton from "@/components/ui/icon-button";
import type {AppEnvironment} from "@/lib/app-environment";
import SessionComposerSkeleton from "@/features/sessions/components/composer/session-composer-skeleton";
import SessionLayout from "@/features/sessions/components/session-layout";
import {useCachedSessionTitle} from "@/features/sessions/hooks/use-cached-session-title";

interface SessionLoadingProps {
  readonly appEnvironment: AppEnvironment;
  /** Closes this pane; absent for the routed chat. */
  readonly onClose?: () => void;
  readonly sessionId: string;
  readonly variant?: "pane" | "primary";
}

/** Holds the chat frame, and the title the sidebar already knows, while the chat loads. */
export default function SessionLoading(props: SessionLoadingProps) {
  const {appEnvironment, onClose, sessionId, variant = "primary"} = props;
  const cachedTitle = useCachedSessionTitle(sessionId);

  return (
    <SessionLayout
      actions={
        onClose && (
          <IconButton className="size-7" label="Close this pane" onClick={onClose} title="Close this pane">
            <Icon name="x" size="sm" />
          </IconButton>
        )
      }
      appEnvironment={appEnvironment}
      composer={<SessionComposerSkeleton />}
      timeline={<div className="min-h-0 flex-1" />}
      title={
        cachedTitle ? (
          <span className="block truncate">{cachedTitle}</span>
        ) : (
          <span className="block h-4 w-36 animate-pulse rounded-full bg-overlay-pressed" aria-label="Loading session title" />
        )
      }
      variant={variant}
    />
  );
}
