import type {ReactNode} from "react";
import {LayoutGroup, motion} from "framer-motion";

const TITLE_TRANSITION = {duration: 0.18, ease: "easeOut"} as const;

interface SessionHeaderProps {
  /** Chat-level actions such as split and close, aligned to the trailing edge. */
  readonly actions?: ReactNode;
  /** Who the chat talks to, rendered next to the title. */
  readonly badge?: ReactNode;
  /** The project's agent mark, so a chat is recognizable before it is read. */
  readonly mark?: ReactNode;
  readonly title: ReactNode;
  /** Project or parent conversation, kept above the title rather than mixed with actions. */
  readonly subtitle?: ReactNode;
  readonly titleActions?: ReactNode;
}

/** One header row for a chat: its mark, title, role badge and actions. */
export default function SessionHeader(props: SessionHeaderProps) {
  const {actions, badge, mark, subtitle, title, titleActions} = props;

  return (
    <header className="relative flex min-h-18 min-w-0 shrink-0 items-center justify-between gap-3 border-b border-border-muted px-4 py-3">
      <LayoutGroup>
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          {mark && <span className="shrink-0">{mark}</span>}
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex min-w-0 items-center gap-1.5 text-xs text-ink-faint">
              {subtitle && <span className="truncate">{subtitle}</span>}
              {subtitle && badge && <span aria-hidden="true">/</span>}
              {badge}
            </div>
            <motion.h1 className="truncate text-base font-medium leading-5 text-ink" layout="position" transition={TITLE_TRANSITION}>
              {title}
            </motion.h1>
          </div>
          {titleActions && (
            <motion.div className="shrink-0" layout="position" transition={TITLE_TRANSITION}>
              {titleActions}
            </motion.div>
          )}
        </div>
      </LayoutGroup>
      {actions && <div className="relative z-20 flex shrink-0 items-center gap-1">{actions}</div>}
    </header>
  );
}
