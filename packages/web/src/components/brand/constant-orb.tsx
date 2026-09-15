import type {CSSProperties} from "react";
import {useCallback} from "react";
import artwork from "@assets/constant-orbs.json";
import {cn} from "@/lib/cn";
import type {MathematicalConstant} from "@/components/brand/constant-identity";
import "@/components/brand/constant-orb.css";

interface DigitLayerStyle extends CSSProperties {
  readonly "--digit-phase": number;
}

interface DigitBandStyle extends CSSProperties {
  readonly "--digit-opacity": number;
}

export type {MathematicalConstant} from "@/components/brand/constant-identity";

interface ConstantOrbProps {
  readonly className?: string;
  readonly label?: string;
  readonly state?: "idle" | "working" | "still" | "complete";
  readonly constant?: MathematicalConstant;
  /** Explicit contours avoid mounting unused artwork in bounded orbital scenes. */
  readonly detail?: "auto" | "compact" | "orbital";
  /** Explicit color previews only; normal identity marks are monochrome. */
  readonly color?: string;
  readonly onComplete?: () => void;
}

/** Pixel symbols with accurate numeric contours; CSS animates precomputed paths. */
export default function ConstantOrb(props: ConstantOrbProps) {
  const {className, label, state = "idle", constant = "pi", color, detail = "auto", onComplete} = props;
  const drawing = artwork[constant];
  const pace = useCallback(
    (element: HTMLSpanElement | null) => {
      if (!element) return;
      const frame = requestAnimationFrame(() => {
        for (const animation of element.getAnimations({subtree: true})) {
          if (animation.effect?.getTiming().iterations === Infinity) animation.updatePlaybackRate(state === "working" ? 24 / 7 : 1);
        }
      });
      return () => cancelAnimationFrame(frame);
    },
    [state]
  );

  return (
    <span
      aria-hidden={label ? undefined : true}
      aria-label={label}
      className={cn("constant-orb size-10 shrink-0", className)}
      data-constant={constant}
      data-state={state}
      data-detail={detail}
      style={color ? {color} : undefined}
      role={label ? "img" : undefined}
      ref={pace}
      onAnimationEnd={state === "complete" ? onComplete : undefined}
    >
      <svg aria-hidden="true" fill="currentColor" focusable="false" viewBox={`0 0 ${drawing.size} ${drawing.size}`}>
        {(detail === "auto" ? ["detail", "compact"] : [detail]).map((variant) => (
          <g className={`constant-orb-${variant}`} key={variant}>
            {(variant === "orbital" ? drawing.orbitalLayers : variant === "compact" ? drawing.compactLayers : drawing.layers).map((layer) => {
              const style: DigitLayerStyle = {"--digit-phase": layer.phase};
              return (
                <g className="constant-orb-digits" key={layer.id} style={style}>
                  {layer.bands.map((band, index) => {
                    const bandStyle: DigitBandStyle = {"--digit-opacity": band.opacity};
                    return band.path && <path d={band.path} key={index} opacity={band.opacity} style={bandStyle} />;
                  })}
                </g>
              );
            })}
            <path className="constant-orb-glyph" d={variant === "compact" ? drawing.compactGlyphPath : drawing.glyphPath} />
          </g>
        ))}
      </svg>
    </span>
  );
}
