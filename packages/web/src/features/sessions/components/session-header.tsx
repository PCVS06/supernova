import type {ReactNode} from "react";
import {LayoutGroup, motion} from "framer-motion";
import {cn} from "@/lib/cn";

const TITLE_TRANSITION = {duration: 0.18, ease: "easeOut"} as const;

interface SessionHeaderProps {
  /** Chat-level actions such as split and close, aligned to the trailing edge. */
  readonly actions?: ReactNode;
  /** Who the chat talks to, rendered next to the title. */
  readonly badge?: ReactNode;
  /** The project's agent mark, so a chat is recognizable before it is read. */
  readonly mark?: ReactNode;
  /** Sticky inset that keeps the routed chat's title clear of the window controls. */
  readonly offsetClassName?: string;
  readonly title: ReactNode;
  readonly titleActions?: ReactNode;
}

/** One header row for a chat: its mark, title, role badge and actions. */
export default function SessionHeader(props: SessionHeaderProps) {
  const {actions, badge, mark, offsetClassName, title, titleActions} = props;

  return (
    <header className="relative flex h-12 min-w-0 shrink-0 items-center justify-between gap-3 border-b border-border-muted px-4">
      <LayoutGroup>
        {/* Sticky so the cluster clears the window controls only while the sidebar is
            collapsed, and the window drag region covers this row, so it stays above it. */}
        <div className={cn("sticky z-20 flex h-7 min-w-0 items-center gap-2 overflow-visible", offsetClassName)}>
          {mark && <span className="shrink-0">{mark}</span>}
          <motion.h1 className="min-w-0 max-w-xs truncate text-sm font-medium leading-5 text-ink" layout="position" transition={TITLE_TRANSITION}>
            {title}
          </motion.h1>
          {badge}
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
