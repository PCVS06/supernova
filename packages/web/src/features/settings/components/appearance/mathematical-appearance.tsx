import {useState} from "react";
import Button from "@/components/ui/button";
import {constantIdentity} from "@/components/brand/constant-identity";
import type {MathematicalConstant} from "@/components/brand/constant-identity";
import MathActivityStatus from "@/features/sessions/components/timeline/math-activity-status";
import {MathResponseContext} from "@/features/sessions/components/timeline/math-response-context";
import AssistantMessageContent from "@/features/sessions/components/timeline/items/assistant/assistant-message-content";
import DelegationConnection from "@/features/harnesses/components/delegation-connection";
import MathResponse from "@/features/sessions/components/timeline/items/assistant/math-response";
import {SettingsGroup, SettingsRow} from "@/features/settings/components/settings-group";
import {useAppearanceStore} from "@/features/settings/stores/appearance-store";
import {useMountEffect} from "@/lib/use-mount-effect";

const roles = {pi: "Harness", phi: "Project", e: "Subagent", tau: "Lead", i: "Curator"} as const;
const previewTexts = {
  "Short reply": "Ready when you are. Let’s follow the idea.",
  "Long reply":
    "Every part of this message begins as digits, then settles into words in the same position. The lines keep their width, spacing, and alignment while the numbers resolve.\n\n**A complete second paragraph** tests the same effect beyond the opening line. It also includes a [link](https://example.com) and a short list:\n\n- Follow the arc.\n- Keep the spiral visible.\n- Let the symbol settle into idle.",
  "Streaming code":
    'The reply arrives in several parts, each with its own brief digit phase.\n\n```ts\nconst circle = { radius: 4, circumference: 2 * Math.PI * 4 };\nconst description = "A deliberately long code line keeps its own horizontal scrolling without changing the surrounding reply.";\n```\n\nThe last sentence also starts as numbers, even though it arrived after the opening animation.',
} as const;

function PreviewReply(props: {sample: keyof typeof previewTexts; playing: boolean; sequence: number}) {
  const {sample, playing, sequence} = props;
  const text = previewTexts[sample];
  const streaming = sample === "Streaming code" && playing;
  const [length, setLength] = useState(streaming ? Math.ceil(text.length / 3) : text.length);
  useMountEffect(() => {
    if (!streaming) return;
    const second = window.setTimeout(() => setLength(Math.ceil((text.length * 2) / 3)), 350);
    const last = window.setTimeout(() => setLength(text.length), 700);
    return () => {
      window.clearTimeout(second);
      window.clearTimeout(last);
    };
  });
  const visibleText = text.slice(0, length);
  return (
    <MathResponse live={playing} text={visibleText} turnId={`preview:${sequence}`}>
      <AssistantMessageContent streaming={streaming}>{visibleText}</AssistantMessageContent>
    </MathResponse>
  );
}

function PreviewClock(props: {onComplete: () => void}) {
  const {onComplete} = props;
  useMountEffect(() => {
    const timer = window.setTimeout(onComplete, 1600);
    return () => window.clearTimeout(timer);
  });
  return null;
}

/** Saved motion and glow controls with the same live rendering used in conversations. */
export default function MathematicalAppearance() {
  const mode = useAppearanceStore((state) => state.mathematicalMotion);
  const glow = useAppearanceStore((state) => state.whiteGlow);
  const setMode = useAppearanceStore((state) => state.setMathematicalMotion);
  const setGlow = useAppearanceStore((state) => state.setWhiteGlow);
  const [constant, setConstant] = useState<MathematicalConstant>("pi");
  const [sample, setSample] = useState<keyof typeof previewTexts>("Short reply");
  const [handoff, setHandoff] = useState({sequence: 0, playing: false});
  const [preview, setPreview] = useState({sequence: 0, playing: false});
  const [revealedTurns] = useState(() => new Set<string>());
  const replay = (): void => setPreview((current) => ({sequence: current.sequence + 1, playing: true}));

  return (
    <SettingsGroup title="Light and motion">
      <SettingsRow
        title="White glow"
        description="Keep white lettering crisp, with softer or stronger light around controls and symbols."
        control={
          <div className="flex gap-2" role="group" aria-label="White glow">
            {(["soft", "balanced", "bright"] as const).map((value) => (
              <Button className="px-3 py-1.5 capitalize" variant="filled" key={value} aria-pressed={glow === value} onClick={() => setGlow(value)}>
                {value}
              </Button>
            ))}
          </div>
        }
      />
      <SettingsRow
        title="Mathematical motion"
        description="Subtle animates active symbols. Playful adds digit reveals and mathematical captions. Reduced motion follows your system."
        control={
          <div className="flex gap-2" role="group" aria-label="Mathematical motion">
            {(["off", "subtle", "playful"] as const).map((value) => (
              <Button className="px-3 py-1.5 capitalize" variant="filled" key={value} aria-pressed={mode === value} onClick={() => setMode(value)}>
                {value}
              </Button>
            ))}
          </div>
        }
      />
      <SettingsRow title="Preview" description="Try a reply, streamed code, and a delegation handoff with these settings.">
        <details className="max-w-xl rounded-xl border border-border">
          <summary className="cursor-pointer px-4 py-3 text-sm text-ink">Show preview</summary>
          <div className="space-y-4 border-t border-border bg-surface p-4">
            <div className="flex flex-wrap gap-2" role="group" aria-label="Preview identity">
              {(Object.keys(roles) as MathematicalConstant[]).map((value) => (
                <Button
                  variant="primary"
                  className="px-3 py-1.5"
                  key={value}
                  aria-pressed={constant === value}
                  onClick={() => {
                    setConstant(value);
                    replay();
                  }}
                >
                  {constantIdentity[value].symbol} {roles[value]}
                </Button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Preview message">
              {(Object.keys(previewTexts) as Array<keyof typeof previewTexts>).map((value) => (
                <Button
                  key={value}
                  variant="filled"
                  className="px-3 py-1.5"
                  aria-pressed={sample === value}
                  onClick={() => {
                    setSample(value);
                    replay();
                  }}
                >
                  {value}
                </Button>
              ))}
            </div>
            <MathResponseContext value={{constant, revealedTurns}}>
              <PreviewReply key={preview.sequence} sample={sample} playing={preview.playing} sequence={preview.sequence} />
            </MathResponseContext>
            <MathActivityStatus
              className="px-0 pb-0 md:px-0"
              constant={constant}
              busy={preview.playing}
              completedId={preview.sequence > 0 && !preview.playing ? String(preview.sequence) : undefined}
            />
            {preview.playing && <PreviewClock key={preview.sequence} onComplete={() => setPreview((current) => ({...current, playing: false}))} />}
            <Button variant="filled" className="px-3 py-1.5" onClick={replay}>
              Replay preview
            </Button>
            <div className="flex flex-wrap items-center gap-4 rounded-xl border border-border p-4">
              <div className="flex flex-col items-center gap-1">
                <DelegationConnection source="tau" target="phi" sourceLabel="Lead" targetLabel="Project" active={handoff.playing} />
                <span className="text-xs">Lead → Project</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <DelegationConnection source="phi" target="e" sourceLabel="Project" targetLabel="Subagent" active={handoff.playing} />
                <span className="text-xs">Project → Subagent</span>
              </div>
              <Button variant="filled" className="px-3 py-1.5" onClick={() => setHandoff((current) => ({sequence: current.sequence + 1, playing: true}))}>
                Replay handoff
              </Button>
              <span className="text-xs">{handoff.playing ? "Preview · delegating" : "Preview · idle"}</span>
              {handoff.playing && <PreviewClock key={handoff.sequence} onComplete={() => setHandoff((current) => ({...current, playing: false}))} />}
            </div>
          </div>
        </details>
      </SettingsRow>
    </SettingsGroup>
  );
}
