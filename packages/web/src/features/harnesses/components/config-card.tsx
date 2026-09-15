import type {AriaRole, ReactNode} from "react";
import {cn} from "@/lib/cn";

/** The single card surface used by every harness list: harnesses, skills, tools, projects, workflow nodes. */
export const configCardClass = "rounded-2xl corner-superellipse/1.3 border border-border bg-surface-raised";

interface ConfigCardProps {
  children: ReactNode;
  className?: string;
  role?: AriaRole;
}

export default function ConfigCard(props: ConfigCardProps) {
  const {children, className, role} = props;

  return (
    <div className={cn(configCardClass, "p-4", className)} role={role}>
      {children}
    </div>
  );
}
