import type {ReactNode} from "react";
import {cn} from "@/lib/cn";

interface SettingsPageShellProps {
  children: ReactNode;
  className?: string;
  testId?: string;
}

/** One scroll owner and one page rhythm for every settings surface, including the harness panels. */
export default function SettingsPageShell(props: SettingsPageShellProps) {
  const {children, className, testId} = props;

  return (
    <div className={cn("scroll-fade-y min-h-0 flex-1 overflow-y-auto overscroll-contain", className)} data-testid={testId}>
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-12 px-5 pb-12 pt-6 sm:px-6">{children}</div>
    </div>
  );
}
