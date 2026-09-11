import PiOrb from "@/components/brand/pi-orb";

/** Persistent identity shared by the workspace and settings navigation. */
export default function PiBrand() {
  return (
    <div className="mx-3 mb-3 flex items-center gap-2.5 px-1 py-2">
      <PiOrb className="size-12" />
      <span className="text-xl font-medium tracking-tight text-ink-strong">pi+</span>
    </div>
  );
}
