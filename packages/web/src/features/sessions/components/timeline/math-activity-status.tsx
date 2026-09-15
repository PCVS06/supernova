import {useState} from "react";
import type {ReactNode} from "react";
import {useReducedMotion} from "framer-motion";
import ConstantOrb from "@/components/brand/constant-orb";
import {constantIdentity} from "@/components/brand/constant-identity";
import type {MathematicalConstant} from "@/components/brand/constant-identity";
import {advanceTurnMotion} from "@/features/sessions/lib/timeline/turn-motion";
import type {TurnMotionState} from "@/features/sessions/lib/timeline/turn-motion";
import {useAppearanceStore} from "@/features/settings/stores/appearance-store";
import {cn} from "@/lib/cn";

interface MathActivityStatusProps {
  readonly constant: MathematicalConstant;
  readonly busy: boolean;
  readonly compacting?: boolean;
  readonly completedId?: string;
  readonly failed?: boolean;
  readonly stopping?: boolean;
  readonly className?: string;
  readonly renderActivity?: (indicator: ReactNode, status: ReactNode) => ReactNode;
}

/** Shows truthful activity with a mathematical caption and a role-specific completion. */
export default function MathActivityStatus(props: MathActivityStatusProps) {
  const {constant, busy, compacting = false, completedId, failed = false, stopping = false, className, renderActivity} = props;
  const mode = useAppearanceStore((state) => state.mathematicalMotion);
  const reduceMotion = useReducedMotion();
  const input = {busy: busy && !compacting, completedId, failed, stopping};
  const [observed, setObserved] = useState<TurnMotionState>({...input, awaitingCompletion: input.busy, baselineId: completedId});
  const advanced = advanceTurnMotion(observed, input);
  const next = advanced.completionId && (mode === "off" || reduceMotion) ? {...advanced, completionId: undefined} : advanced;
  if (next !== observed) setObserved(next);
  const completing = !!observed.completionId && mode !== "off" && !reduceMotion;
  const label = stopping ? "Stopping" : compacting ? "Compacting context" : busy ? "Thinking" : completing ? "Reply complete" : "Ready";
  const indicator = (
    <ConstantOrb
      constant={constant}
      className="size-20"
      state={stopping ? "still" : busy ? "working" : completing ? "complete" : "idle"}
      onComplete={() => setObserved((current) => ({...current, completionId: undefined}))}
    />
  );
  const status = (
    <span className="flex flex-col gap-1">
      <span>{label}</span>
      {busy && !compacting && !stopping && mode === "playful" && (
        <span aria-hidden="true" className="text-xs">
          {constantIdentity[constant].caption}…
        </span>
      )}
    </span>
  );

  return (
    <div className={cn("relative mx-auto w-full max-w-3xl bg-surface px-5 pb-8 md:px-8", className)} data-timeline-footer="streaming-status">
      {renderActivity ? (
        renderActivity(indicator, status)
      ) : (
        <div className="flex w-fit items-center gap-3 text-sm text-ink" role="status">
          {indicator}
          {status}
        </div>
      )}
    </div>
  );
}
