import type {ReactNode} from "react";
import {constantIdentity} from "@/components/brand/constant-identity";
import {cn} from "@/lib/cn";

/** Two layers animate the name and its own constant without per-character render work. */
export default function SidebarLabel({text, constant, className, children}: {text: string; constant: keyof typeof constantIdentity; className?: string; children?: ReactNode}) {
  const digits = constantIdentity[constant].digits.repeat(2).slice(0, Math.min(80, Math.max(12, text.length)));
  return (
    <span className={cn("sidebar-label", className)}>
      <span className="sidebar-label-name">{children ?? text}</span>
      <span className="sidebar-label-digits" aria-hidden="true">
        {digits}
      </span>
    </span>
  );
}
