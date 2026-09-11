import type {CSSProperties} from "react";
import artwork from "@assets/pi-orb.json";
import {cn} from "@/lib/cn";
import "@/components/brand/pi-orb.css";

interface PixelLayerStyle extends CSSProperties {
  readonly "--pixel-phase": number;
  readonly "--pixel-opacity": number;
}

interface PiOrbProps {
  readonly className?: string;
  readonly label?: string;
  readonly state?: "idle" | "working" | "still";
  readonly color?: string;
  readonly variant?: "orb" | "specialist";
}

/** Shared pixel identity; only the surrounding particles animate, never the pi. */
export default function PiOrb(props: PiOrbProps) {
  const {className, label, state = "idle", color, variant = "orb"} = props;

  return (
    <svg
      aria-hidden={label ? undefined : true}
      aria-label={label}
      className={cn("pi-orb size-10 shrink-0 text-ink-strong", className)}
      data-state={state}
      data-variant={variant}
      style={color ? {color} : undefined}
      fill="currentColor"
      focusable="false"
      role={label ? "img" : undefined}
      viewBox={`0 0 ${artwork.size} ${artwork.size}`}
    >
      {variant === "orb" ? (
        artwork.layers.map((layer) => {
          const style: PixelLayerStyle = {"--pixel-phase": layer.phase, "--pixel-opacity": layer.opacity};
          return <path className="pi-orb-particles" d={layer.path} key={layer.id} style={style} />;
        })
      ) : (
        <g className="pi-specialist-orbit" style={{shapeRendering: "geometricPrecision"}}>
          <circle cx="20" cy="20" r="16" fill="none" stroke="currentColor" strokeWidth="0.55" opacity="0.3" />
          <circle cx="20" cy="4" r="1.6" />
          <circle cx="33.86" cy="28" r="1.6" />
          <circle cx="6.14" cy="28" r="1.6" />
        </g>
      )}
      <path d={artwork.glyphPath} />
    </svg>
  );
}
