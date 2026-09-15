import type {ReactNode} from "react";
import {createContext, use, useCallback} from "react";
import {useReducedMotion} from "framer-motion";
import {useAppearanceStore} from "@/features/settings/stores/appearance-store";

interface AnimatedHeightProps {
  readonly children: ReactNode;
}

const HeightAnimationContext = createContext(false);

/** Animates measured content growth without scaling text or remounting focused controls. */
export default function AnimatedHeight(props: AnimatedHeightProps) {
  const {children} = props;
  const nested = use(HeightAnimationContext);
  const reduced = useReducedMotion();
  const motion = useAppearanceStore((state) => state.mathematicalMotion);
  const observe = useCallback(
    (content: HTMLDivElement | null) => {
      if (!content || nested) return;
      const host = content.parentElement!;
      let height: number | undefined;
      let animation: Animation | undefined;
      const resize = () => {
        const next = content.getBoundingClientRect().height;
        if (height !== undefined && Math.abs(next - height) < 0.5) return;
        const previous = host.getBoundingClientRect().height;
        animation?.cancel();
        host.style.height = `${next}px`;
        if (height !== undefined && !reduced && motion !== "off")
          animation = host.animate([{height: `${previous}px`}, {height: `${next}px`}], {duration: 240, easing: "cubic-bezier(.22,1,.36,1)"});
        height = next;
      };
      resize();
      // ResizeObserver runs before paint. Deferring this by a frame exposes
      // the new layout before the animation starts, producing a visible jump.
      const observer = new ResizeObserver(resize);
      observer.observe(content);
      return () => {
        observer.disconnect();
        animation?.cancel();
        host.style.removeProperty("height");
      };
    },
    [reduced, motion, nested]
  );
  // Only one measured animation owns a subtree. Nested height animations
  // otherwise cause the parent to cancel and restart on every child frame.
  if (nested) return <>{children}</>;
  return (
    <HeightAnimationContext value={true}>
      <div className="overflow-hidden [overflow-anchor:none]" data-animated-height="">
        <div ref={observe}>{children}</div>
      </div>
    </HeightAnimationContext>
  );
}
