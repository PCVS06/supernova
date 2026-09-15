import ConstantOrb from "@/components/brand/constant-orb";
import type {MathematicalConstant} from "@/components/brand/constant-identity";
import {useMountEffect} from "@/lib/use-mount-effect";

interface ConstantCompletionProps {
  readonly constant: MathematicalConstant;
  readonly onComplete: () => void;
  readonly className?: string;
  readonly label?: string;
}

/** Plays one bounded completion flourish, including cleanup when its owner disappears. */
export default function ConstantCompletion(props: ConstantCompletionProps) {
  const {constant, onComplete, className = "size-20", label} = props;
  useMountEffect(() => {
    const timer = window.setTimeout(onComplete, 950);
    return () => window.clearTimeout(timer);
  });
  return <ConstantOrb constant={constant} className={className} label={label} state="complete" />;
}
