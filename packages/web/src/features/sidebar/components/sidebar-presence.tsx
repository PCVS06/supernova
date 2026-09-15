import {AnimatePresence, motion, useIsPresent, useReducedMotion} from "framer-motion";
import type {ReactNode} from "react";
import {useAppearanceStore} from "@/features/settings/stores/appearance-store";

interface SidebarPresenceProps {
  children: ReactNode;
  as?: "div" | "li";
  className?: string;
  level?: string;
  onPrefetch?: () => void;
}

/** Keeps departing rows mounted long enough for their identity to resolve into digits. */
export function SidebarPresence({children, as = "div", className, level, onPrefetch}: SidebarPresenceProps) {
  const present = useIsPresent();
  const reduced = useReducedMotion();
  const enabled = useAppearanceStore((state) => state.mathematicalMotion !== "off");
  const animated = enabled && !reduced;
  const Element = as === "li" ? motion.li : motion.div;
  return (
    <Element
      className={className}
      data-sidebar-presence={present ? "open" : "closing"}
      data-sidebar-level={level}
      inert={!present}
      aria-hidden={!present || undefined}
      initial={{height: 0, opacity: 0}}
      animate={{height: "auto", opacity: 1}}
      exit={{height: 0, opacity: 0}}
      transition={{
        height: {duration: animated ? 0.26 : 0, delay: animated && !present ? 0.18 : 0},
        opacity: {duration: animated ? 0.18 : 0, delay: animated && !present ? 0.2 : 0},
      }}
      style={{overflow: "hidden"}}
      onFocusCapture={onPrefetch}
      onPointerEnter={onPrefetch}
      onPointerDown={onPrefetch}
    >
      {children}
    </Element>
  );
}

/** Animates a branch while preserving lazy mounting and noninteractive exit content. */
export function SidebarBranch({open, children, className}: {open: boolean; children: ReactNode; className?: string}) {
  return <AnimatePresence initial={false}>{open && <SidebarPresence className={className}>{children}</SidebarPresence>}</AnimatePresence>;
}
