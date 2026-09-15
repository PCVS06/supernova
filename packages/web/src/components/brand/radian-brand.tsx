import ConstantOrb from "@/components/brand/constant-orb";

/** Persistent identity shared by the workspace and settings navigation. */
export default function RadianBrand() {
  return (
    <div className="mx-3 mb-3 flex items-center gap-2.5 px-1 py-2">
      <ConstantOrb className="size-12" />
      <span className="text-xl font-medium tracking-tight text-ink-strong">Radian</span>
    </div>
  );
}
