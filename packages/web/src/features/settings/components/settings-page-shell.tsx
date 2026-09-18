import type {ReactNode} from "react";
import Icon from "@/components/ui/icon";
import {cn} from "@/lib/cn";

/** The width every settings page shares, so a label never sits far from its control. */
export const settingsColumnClass = "mx-auto w-full max-w-3xl px-5 sm:px-8";

interface SettingsPageHeaderProps {
  title: string;
  /** One sentence saying what the page is for. */
  description?: string;
  /** A mark left of the title, such as an agent's orb. */
  leading?: ReactNode;
  /** The page's own actions, such as "New agent". */
  actions?: ReactNode;
  /** The list this page was opened from. */
  back?: {label: string; onClick: () => void};
  /** The only tab row a page may have. */
  tabs?: ReactNode;
}

/** Names the page and says what it is for. Every settings page starts with one. */
export function SettingsPageHeader(props: SettingsPageHeaderProps) {
  const {title, description, leading, actions, back, tabs} = props;

  return (
    <header className={cn(tabs && "border-b border-border")}>
      {back && (
        <button
          className="-ml-1.5 mb-3 flex cursor-pointer items-center gap-1 rounded-md px-1.5 py-1 text-xs text-ink-muted outline-none hover:bg-overlay-hover hover:text-ink focus-visible:bg-overlay-hover"
          type="button"
          onClick={back.onClick}
        >
          <Icon name="arrow-left" size="xs" />
          {back.label}
        </button>
      )}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        {leading && <span className="flex shrink-0 items-center">{leading}</span>}
        <div className="min-w-0 flex-1 basis-64 space-y-1">
          <h1 className="truncate text-xl font-medium leading-tight text-ink-strong" title={title}>
            {title}
          </h1>
          {description && <p className="break-words text-sm leading-relaxed text-ink-muted">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
      {tabs && <div className="mt-4">{tabs}</div>}
    </header>
  );
}

interface SettingsPageShellProps extends Partial<SettingsPageHeaderProps> {
  children: ReactNode;
  className?: string;
  testId?: string;
}

/** One scroll owner and one page rhythm for every settings surface: a header, then a column of cards. */
export default function SettingsPageShell(props: SettingsPageShellProps) {
  const {children, className, testId, title, ...header} = props;

  return (
    <div className={cn("scroll-fade-y min-h-0 flex-1 overflow-y-auto overscroll-contain", className)} data-testid={testId}>
      <div className={cn(settingsColumnClass, "flex flex-col gap-8 pb-16 pt-8")}>
        {title && <SettingsPageHeader title={title} {...header} />}
        {children}
      </div>
    </div>
  );
}
