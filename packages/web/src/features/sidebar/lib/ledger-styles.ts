/** Shared row geometry keeps projects, chats and activity aligned without nested boxes. */
export const ledgerRowClassName =
  "group/ledger flex min-w-0 items-center rounded-lg text-ink-muted transition-colors duration-150 hover:bg-overlay-hover hover:text-ink motion-reduce:transition-none";

/** The primary target is separate from row actions, including for keyboard navigation. */
export const ledgerPrimaryClassName = "flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-2 text-left outline-none focus-visible:ring-1 focus-visible:ring-border-strong";

/** Action space is reserved so hovering never moves or covers the title. */
export const ledgerActionsClassName = "sidebar-row-actions flex items-center justify-end gap-0.5 text-ink-faint";

/** A fixed symbol column keeps names aligned even when the marks change size. */
export const ledgerMarkClassName = "sidebar-identity flex h-10 w-8 shrink-0 items-center justify-center";

/** Every tree level reserves the same small disclosure slot. */
export const ledgerDisclosureClassName = "sidebar-row-disclosure size-3 shrink-0 text-ink-faint transition-transform motion-reduce:transition-none";
