import {useReducedMotion} from "framer-motion";
import {use, useRef, useState} from "react";
import type {ReactNode} from "react";
import {constantIdentity} from "@/components/brand/constant-identity";
import Button from "@/components/ui/button";
import {MathResponseContext} from "@/features/sessions/components/timeline/math-response-context";
import {animateDigitReveal} from "@/features/sessions/lib/streaming/digit-reveal";
import {useAppearanceStore} from "@/features/settings/stores/appearance-store";
import {useMountEffect} from "@/lib/use-mount-effect";
import "@/features/sessions/components/timeline/items/assistant/math-response.css";

function DigitRevealLayer(props: {digits: string; onComplete: () => void}) {
  const {digits, onComplete} = props;
  const canvas = useRef<HTMLCanvasElement>(null);
  useMountEffect(() => {
    const layer = canvas.current;
    const element = layer?.closest<HTMLElement>(".math-response");
    if (!layer || !element) return;
    return animateDigitReveal({element, canvas: layer, digits, onComplete});
  });
  return <canvas aria-hidden="true" className="math-response-digits" ref={canvas} />;
}

interface MathResponseProps {
  readonly children: ReactNode;
  readonly live: boolean;
  readonly text: string;
  readonly turnId: string;
}

/** Gives every arriving part of a live message a brief digit phase in its actual text layout. */
export default function MathResponse(props: MathResponseProps) {
  const {children, live, turnId} = props;
  const identity = use(MathResponseContext);
  const mode = useAppearanceStore((state) => state.mathematicalMotion);
  const reduceMotion = useReducedMotion();
  const enabled = mode === "playful" && !reduceMotion;
  const [eligible] = useState(() => !!identity && live && enabled && !identity.revealedTurns.has(turnId));
  const [finished, setFinished] = useState(false);
  useMountEffect(() => {
    if (eligible) identity?.revealedTurns.add(turnId);
  });
  const animate = eligible && enabled && !finished;

  return (
    <div className="math-response" data-reveal-live={live} data-reveal-preparing={animate || undefined}>
      <div className="math-response-content">{children}</div>
      {animate && identity && <DigitRevealLayer digits={constantIdentity[identity.constant].digits} onComplete={() => setFinished(true)} />}
      {eligible && (
        <div className="math-response-actions">
          <Button className="math-response-skip text-xs" onClick={() => setFinished(true)} variant="ghost">
            Show reply
          </Button>
        </div>
      )}
    </div>
  );
}
