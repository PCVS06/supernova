import type {ReactNode} from "react";

interface SettingsGroupProps {
  children: ReactNode;
  title: string;
}

export function SettingsGroup(props: SettingsGroupProps) {
  const {children, title} = props;

  return (
    <section className="space-y-1.5">
      <h2 className="mx-3 flex min-h-8 items-center border-b border-border pb-2 text-base font-medium text-ink-strong sm:mx-4">{title}</h2>
      <div className="space-y-1">{children}</div>
    </section>
  );
}

interface SettingsRowProps {
  children?: ReactNode;
  control?: ReactNode;
  description?: string;
  title: string;
}

export function SettingsRow(props: SettingsRowProps) {
  const {children, control, description, title} = props;

  return (
    <div className="px-3 py-4 sm:px-4">
      <div className="flex flex-col gap-3 sm:grid sm:grid-cols-[minmax(0,1fr)_minmax(10rem,auto)] sm:items-center sm:gap-8">
        <div className="min-w-0 flex-1 space-y-1">
          <h3 className="flex min-h-5 items-center text-sm font-medium text-ink-strong">{title}</h3>
          {description && <p className="max-w-xl text-xs leading-relaxed text-ink-muted">{description}</p>}
        </div>
        {control && <div className="flex w-full shrink-0 items-center sm:w-auto sm:justify-end">{control}</div>}
      </div>
      {children && <div className="pt-3">{children}</div>}
    </div>
  );
}
