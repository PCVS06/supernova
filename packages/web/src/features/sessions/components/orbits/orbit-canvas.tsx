import {useCallback} from "react";
import type {ReactNode} from "react";
import Button from "@/components/ui/button";
import ConstantOrb from "@/components/brand/constant-orb";
import type {OrbitBody, OrbitModel} from "@/features/sessions/lib/orbits/orbit-model";
import type {OrbitGroup, OrbitProjection} from "@/features/sessions/lib/orbits/orbit-projection";
import {animateOrbitScene} from "@/features/sessions/lib/orbits/orbit-animation";
import type {OrbitAnimationState} from "@/features/sessions/lib/orbits/orbit-animation";

interface OrbitCanvasProps {
  readonly animation: OrbitAnimationState;
  readonly expanded: boolean;
  readonly onToggle: () => void;
  readonly model: OrbitModel;
  readonly projection: OrbitProjection;
  readonly anchor: ReactNode;
  readonly status: ReactNode;
  readonly selectedId?: string;
  readonly ready: boolean;
  readonly stale: boolean;
  readonly moving: boolean;
  readonly onResize: (width: number) => void;
  readonly onSelect: (body: OrbitBody | OrbitGroup) => void;
  readonly onEvent: (label: string) => void;
}

/** A single live chat symbol with bounded orbital bodies; surrounding records never render as stacked cards. */
export default function OrbitCanvas(props: OrbitCanvasProps) {
  const {animation, model, projection, anchor, status, selectedId, ready, stale, moving, expanded, onToggle, onResize, onSelect, onEvent} = props;
  const empty = projection.primary.length === 0;
  const bindScene = useCallback(
    (element: HTMLDivElement | null) =>
      element ? animateOrbitScene(element, {model, projection, state: animation, ready, moving, expanded, stale, onResize, onEvent}) : undefined,
    [model, projection, animation, ready, moving, expanded, stale, onResize, onEvent]
  );
  return (
    <div
      className="chat-orbit-canvas"
      data-orbit-empty={empty}
      data-expanded={expanded}
      data-motion={moving}
      data-orbit-stale={stale}
      role="group"
      aria-label="Orbital delegation"
      ref={bindScene}
    >
      <svg className="chat-orbit-paths" aria-hidden="true">
        {projection.primary.map((body, index) => (
          <ellipse
            key={body.id}
            className={index === 0 ? "chat-orbit-track" : "chat-orbit-track hidden"}
            data-orbit-track={body.id}
            data-active={body.active && !stale}
            data-selected={selectedId === body.id}
          />
        ))}
        {[...projection.satellites].flatMap(([parent, children]) =>
          children.map((child, index) => (
            <g key={child.id} data-orbit-satellite={child.id} data-parent={parent} data-slot={index}>
              <ellipse className={index === 0 ? "chat-orbit-track chat-orbit-moon-track" : "chat-orbit-track chat-orbit-moon-track hidden"} />
            </g>
          ))
        )}
        {[0, 1, 2, 3].map((index) => (
          <g key={index} data-orbit-packet={index} className="chat-orbit-packet" style={{display: "none"}}>
            <line />
            <circle r="2.5" />
            <circle r="7" className="chat-orbit-packet-halo" />
          </g>
        ))}
      </svg>
      <Button
        className="chat-orbit-sun"
        data-orbit-body={projection.root.id}
        aria-label={expanded ? "Close chat solar system" : "Open chat solar system"}
        aria-expanded={expanded}
        onClick={onToggle}
      >
        {anchor}
        <span className="chat-orbit-caption">
          {status}
          <span className="block text-ink-faint">{expanded ? "Return to chat" : "Explore this chat’s work"}</span>
        </span>
      </Button>
      <div className="chat-orbit-bodies" inert={!expanded} aria-hidden={!expanded}>
        {[...projection.satellites.values()].flat().map((body) => (
          <Button
            key={body.id}
            className="chat-orbit-body chat-orbit-moon-target"
            data-orbit-body={body.id}
            data-active={body.active && !stale}
            data-attention={body.attention}
            aria-label={`${body.label} · ${stale ? "last saved · " : ""}${body.status}`}
            aria-pressed={selectedId === body.id}
            onPointerDown={(event) => {
              if (event.pointerType === "mouse") event.preventDefault();
            }}
            onClick={() => onSelect(body)}
          >
            <ConstantOrb
              constant={body.constant}
              detail="compact"
              state={expanded && ready && moving && !stale ? (body.active ? "working" : "idle") : "still"}
              className="chat-orbit-moon-mark"
            />
            <span className="chat-orbit-caption">
              {body.label} · {body.status}
            </span>
          </Button>
        ))}
        {projection.primary.map((body) => {
          const group = "members" in body;
          const nested = group ? 0 : (model.children.get(body.id)?.length ?? 0);
          const label = group
            ? `${body.label} · ${body.members.length} participants`
            : `${body.label} · ${stale ? "last saved · " : ""}${body.status}${body.independentChats.length ? " · another chat is active" : ""}${nested ? ` · ${nested} participants` : ""}`;
          return (
            <Button
              key={body.id}
              className="chat-orbit-body"
              data-orbit-body={body.id}
              data-kind={group ? "group" : body.kind}
              data-active={body.active && !stale}
              data-independent={!group && body.independentChats.length > 0}
              data-attention={body.attention}
              data-status={group ? "group" : body.status}
              aria-label={label}
              aria-pressed={selectedId === body.id}
              onPointerDown={(event) => {
                if (event.pointerType === "mouse") event.preventDefault();
              }}
              onClick={() => onSelect(body)}
            >
              {group ? (
                <span className="chat-orbit-cluster" aria-hidden="true">
                  <svg viewBox="0 0 48 48" className="chat-orbit-cluster-mark">
                    {Array.from({length: Math.min(48, body.members.length)}, (_, index) => {
                      const angle = index * 2.399963;
                      const radius = 5 + Math.sqrt(index / 48) * 17;
                      return (
                        <circle
                          key={index}
                          cx={24 + Math.cos(angle) * radius}
                          cy={24 + Math.sin(angle) * radius * 0.72}
                          r={index % 3 === 0 ? 1.4 : 0.8}
                          opacity={0.35 + (index % 4) * 0.18}
                        />
                      );
                    })}
                  </svg>
                  <span className="chat-orbit-count">{body.members.length}</span>
                </span>
              ) : (
                <ConstantOrb
                  constant={body.constant}
                  detail="orbital"
                  state={expanded && ready && moving && !stale ? (body.active ? "working" : "idle") : "still"}
                  className="chat-orbit-mark"
                />
              )}
              <span className="chat-orbit-caption">{label}</span>
              {body.attention && (
                <span className="chat-orbit-attention" aria-hidden="true">
                  !
                </span>
              )}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
