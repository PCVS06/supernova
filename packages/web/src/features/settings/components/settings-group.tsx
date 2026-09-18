import type {ReactNode} from "react";
import Icon from "@/components/ui/icon";
import {cn} from "@/lib/cn";

/** The one card every group of settings sits in. It is a size container, so its rows lay out by the card's width. */
export const settingsCardClass = "@container divide-y divide-border-muted overflow-hidden rounded-2xl corner-superellipse/1.3 border border-border bg-surface-raised/50";

interface SettingsGroupProps {
  children: ReactNode;
  title: string;
  /** One line saying what the group is for. */
  description?: string;
  /** A control beside the title, such as an Add button. */
  action?: ReactNode;
  /** Folds the group behind its title. For settings most people never change, and for reference lists. */
  collapsible?: boolean;
  defaultOpen?: boolean;
  /** Marks reference material that cannot be edited here. */
  readOnly?: boolean;
}

/** A titled card of rows. Every settings page is a column of these. */
export function SettingsGroup(props: SettingsGroupProps) {
  const {children, title, description, action, collapsible = false, defaultOpen = false, readOnly = false} = props;
  const badge = readOnly && <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[0.6875rem] leading-4 text-ink-faint">Read-only</span>;

  if (collapsible) {
    return (
      <details className="group/section" open={defaultOpen}>
        <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg px-1 py-1 outline-none hover:text-ink-strong focus-visible:bg-overlay-hover [&::-webkit-details-marker]:hidden">
          <Icon className="shrink-0 text-ink-faint transition-transform group-open/section:rotate-90" name="chevron-right" size="xs" />
          <h2 className="shrink-0 text-sm font-medium text-ink-strong">{title}</h2>
          {badge}
          {description && <span className="min-w-0 truncate text-xs text-ink-muted">{description}</span>}
        </summary>
        <div className={cn(settingsCardClass, "mt-2")}>{children}</div>
      </details>
    );
  }

  return (
    <section>
      <header className="mb-2 flex items-end justify-between gap-3 px-1">
        <div className="min-w-0 space-y-0.5">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-medium text-ink-strong">{title}</h2>
            {badge}
          </div>
          {description && <p className="text-xs leading-relaxed text-ink-muted">{description}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </header>
      <div className={settingsCardClass}>{children}</div>
    </section>
  );
}

interface SettingsRowProps {
  children?: ReactNode;
  control?: ReactNode;
  description?: string;
  /** Keeps the control under the label even in a wide card, for long controls. */
  stacked?: boolean;
  title: string;
}

/** One setting: what it is and what it does on the left, its control on the right. In a narrow card the control moves below. */
export function SettingsRow(props: SettingsRowProps) {
  const {children, control, description, stacked, title} = props;

  return (
    <div className="px-4 py-3.5">
      <div className={cn("flex flex-col gap-2.5", !stacked && "@xl:grid @xl:grid-cols-[minmax(0,1fr)_auto] @xl:items-center @xl:gap-8")}>
        <div className="min-w-0 space-y-0.5">
          <h3 className="text-sm font-medium text-ink-strong">{title}</h3>
          {description && <p className="max-w-xl text-xs leading-relaxed text-ink-muted">{description}</p>}
        </div>
        {control && <div className={cn("flex w-full min-w-0 items-center", !stacked && "@xl:w-auto @xl:justify-end")}>{control}</div>}
      </div>
      {children && <div className="pt-3">{children}</div>}
    </div>
  );
}

interface SettingsLinkRowProps {
  /** A mark left of the text, such as an agent's orb. */
  leading?: ReactNode;
  title: string;
  description?: string;
  /** Short facts right of the text, such as a model name or a count. */
  meta?: ReactNode;
  label: string;
  onClick: () => void;
}

/** One entry of a collection. Opens the entry's own page, so a list never shares the screen with an editor. */
export function SettingsLinkRow(props: SettingsLinkRowProps) {
  const {leading, title, description, meta, label, onClick} = props;

  return (
    <button
      aria-label={label}
      className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left outline-none hover:bg-overlay-hover focus-visible:bg-overlay-hover"
      type="button"
      onClick={onClick}
    >
      {leading && <span className="flex shrink-0 items-center">{leading}</span>}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-ink-strong">{title}</span>
        {description && <span className="block truncate text-xs text-ink-muted">{description}</span>}
      </span>
      {meta && <span className="hidden shrink-0 items-center gap-2 text-xs text-ink-faint @md:flex">{meta}</span>}
      <Icon className="shrink-0 text-ink-faint" name="chevron-right" size="xs" />
    </button>
  );
}

/** A quiet line inside a card: an empty state, a loading note, a hint. */
export function SettingsNote(props: {children: ReactNode; tone?: "danger" | "muted"; role?: "alert" | "status"}) {
  const {children, tone = "muted", role} = props;

  return (
    <p className={cn("px-4 py-3.5 text-xs leading-relaxed", tone === "danger" ? "text-danger-ink" : "text-ink-muted")} role={role}>
      {children}
    </p>
  );
}
