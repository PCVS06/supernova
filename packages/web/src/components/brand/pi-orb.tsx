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
}

/** Shared pixel identity; only the surrounding particles animate, never the pi. One ring for every role, separated by color. */
export default function PiOrb(props: PiOrbProps) {
  const {className, label, state = "idle", color} = props;

  return (
    <svg
      aria-hidden={label ? undefined : true}
      aria-label={label}
      className={cn("pi-orb size-10 shrink-0 text-ink-strong", className)}
      data-state={state}
      style={color ? {color} : undefined}
      fill="currentColor"
      focusable="false"
      role={label ? "img" : undefined}
      viewBox={`0 0 ${artwork.size} ${artwork.size}`}
    >
      {artwork.layers.map((layer) => {
        const style: PixelLayerStyle = {"--pixel-phase": layer.phase, "--pixel-opacity": layer.opacity};
        return <path className="pi-orb-particles" d={layer.path} key={layer.id} style={style} />;
      })}
      <path d={artwork.glyphPath} />
    </svg>
  );
}
