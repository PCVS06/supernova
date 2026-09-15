import type {OrbitAnimationState} from "@/features/sessions/lib/orbits/orbit-animation";

interface OrbitVisit {
  readonly expanded: boolean;
  readonly focusedId?: string;
  readonly selectedId?: string;
  readonly members?: readonly string[];
  readonly animation: OrbitAnimationState;
}

const visits = new Map<string, OrbitVisit>();
const VISIT_LIMIT = 16;

/** Restores this chat's local inspection context without persisting live records or replaying elapsed motion. */
export function readOrbitVisit(key: string): OrbitVisit {
  return visits.get(key) ?? {expanded: false, animation: {lastObserved: 0, pulses: [], radii: new Map(), phases: new Map(), order: new Map()}};
}

/** Keeps a bounded set of scene snapshots for returning from full conversations. */
export function saveOrbitVisit(key: string, visit: OrbitVisit): void {
  visits.delete(key);
  visits.set(key, visit);
  while (visits.size > VISIT_LIMIT) visits.delete(visits.keys().next().value!);
}
