import {orbitEllipse, orbitHitArea, orbitPhase, orbitPosition} from "@/features/sessions/lib/orbits/orbit-geometry";
import type {OrbitPoint} from "@/features/sessions/lib/orbits/orbit-geometry";
import type {OrbitModel} from "@/features/sessions/lib/orbits/orbit-model";
import type {OrbitProjection} from "@/features/sessions/lib/orbits/orbit-projection";

interface Pulse {
  from: string;
  to: string;
  at: number;
}
export interface OrbitAnimationState {
  focus?: string;
  observed?: Map<string, string>;
  lastObserved: number;
  pulses: Pulse[];
  radii: Map<string, number>;
  phases: Map<string, number>;
  order: Map<string, readonly string[]>;
  positions?: Map<string, OrbitPoint & {width: number}>;
}

function line(element: SVGLineElement | undefined, from: OrbitPoint, to: OrbitPoint): void {
  if (!element) return;
  element.setAttribute("x1", String(from.x));
  element.setAttribute("y1", String(from.y));
  element.setAttribute("x2", String(to.x));
  element.setAttribute("y2", String(to.y));
}

interface AnimateOrbitSceneOptions {
  readonly model: OrbitModel;
  readonly projection: OrbitProjection;
  readonly state: OrbitAnimationState;
  readonly ready: boolean;
  readonly moving: boolean;
  readonly expanded: boolean;
  readonly stale: boolean;
  readonly onResize: (width: number) => void;
  readonly onEvent: (label: string) => void;
}

/** Owns one bounded animation loop; pauses offscreen, in the background, and while a target is being inspected. */
export function animateOrbitScene(element: HTMLElement, options: AnimateOrbitSceneOptions): () => void {
  const {model, projection, state, moving, stale, expanded} = options;
  const nodes = new Map([...element.querySelectorAll<HTMLElement>("[data-orbit-body]")].map((node) => [node.dataset.orbitBody!, node]));
  const tracks = new Map([...element.querySelectorAll<SVGEllipseElement>("[data-orbit-track]")].map((node) => [node.dataset.orbitTrack!, node]));
  const satellites = [...element.querySelectorAll<SVGGElement>("[data-orbit-satellite]")];
  const packets = [...element.querySelectorAll<SVGGElement>("[data-orbit-packet]")];
  const svg = element.querySelector<SVGSVGElement>(".chat-orbit-paths")!;
  const sizes = new Map<string, {width: number; height: number}>();
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const previousPositions = state.positions;
  const focusChanged = state.focus !== undefined && state.focus !== projection.root.id;
  const transitions: Animation[] = [];
  const arrivals = new Set<string>();
  state.focus = projection.root.id;
  let width = 0,
    height = 0,
    frame = 0,
    last = 0,
    hovered = element.querySelector("button:hover") !== null,
    focused = element.querySelector("button:focus-visible") !== null,
    visible = true,
    disposed = false;
  const previous = state.order.get(projection.root.id) ?? [];
  const currentIds = projection.primary.map((body) => body.id);
  const activity = new Map(projection.primary.map((body) => [body.id, body.active ? 0 : body.attention ? 1 : 2]));
  const order = [...previous.filter((id) => currentIds.includes(id)), ...currentIds.filter((id) => !previous.includes(id))].toSorted((a, b) => activity.get(a)! - activity.get(b)!);
  state.order.set(projection.root.id, order);
  // A newly opened snapshot is a baseline, never an invented burst of old messages.
  if (options.ready && !stale) {
    const observed = new Map([...model.bodies.values()].map((body) => [body.id, body.status]));
    if (state.observed)
      for (const body of model.bodies.values()) {
        const old = state.observed.get(body.id);
        if (!body.parentId || !body.parentKnown || old === body.status) continue;
        const newAssignment = body.active && (old !== undefined || Date.parse(body.startedAt ?? "") >= state.lastObserved - 2000);
        const returned = old !== undefined && ["starting", "running"].includes(old) && body.status === "completed";
        if (newAssignment || returned) {
          if (newAssignment && old === undefined) arrivals.add(body.id);
          state.pulses.push({from: returned ? body.id : body.parentId, to: returned ? body.parentId : body.id, at: performance.now()});
          options.onEvent(`${body.label} · ${returned ? "result recorded" : "assignment started"}`);
          if (newAssignment)
            for (const transfer of model.transfers) if (transfer.to === body.id && transfer.kind === "result") state.pulses.push({...transfer, at: performance.now()});
        }
      }
    state.observed = observed;
    state.lastObserved = Date.now();
    state.pulses = state.pulses.slice(-4);
  }
  if (stale || reduced.matches || !moving || !expanded) state.pulses = [];
  if (stale) state.observed = undefined;
  const visibleAncestor = (id: string): string | undefined => {
    const seen = new Set<string>();
    while (!nodes.has(id) && !seen.has(id)) {
      seen.add(id);
      const group = projection.primary.find((body) => "members" in body && body.members.includes(id));
      if (group) return group.id;
      const parent = model.bodies.get(id)?.parentId;
      if (!parent) return undefined;
      id = parent;
    }
    return nodes.has(id) ? id : undefined;
  };
  const draw = (delta = 0): void => {
    const vertical = width < 540;
    const center = {x: width / 2, y: height / 2};
    const nested = [...projection.satellites.values()].some((children) => children.length > 0);
    const margin = nested ? (vertical ? 50 : 66) : 40;
    const maximum = Math.max(0, Math.min((width / 2 - margin) / (vertical ? 0.78 : 1.03), (height / 2 - margin) / (vertical ? 1.03 : 0.72)));
    const minimum = vertical ? (nested ? 106 : 94) : nested ? 152 : 144;
    const points = new Map<string, OrbitPoint>([[projection.root.id, center]]);
    for (const body of projection.primary) {
      const index = order.indexOf(body.id);
      const base = order.length === 1 ? Math.min(maximum, minimum + 40) : minimum + (index / (order.length - 1)) * Math.max(0, maximum - minimum);
      const target = base - (body.active ? Math.min(14, base * 0.08) : 0);
      const key = `${projection.root.id}:${body.id}`;
      const radius = Math.min(
        maximum,
        !moving || reduced.matches ? target : (state.radii.get(key) ?? target) + (target - (state.radii.get(key) ?? target)) * (1 - Math.exp(-delta / 600))
      );
      if (expanded) state.radii.set(key, Math.min(radius, maximum));
      const eccentricity = 0.025;
      const period = 70 * (Math.max(radius, minimum) / minimum) ** 1.5;
      const phase = (state.phases.get(key) ?? orbitPhase(body.id)) + (delta / (period * 1000)) * Math.PI * 2;
      state.phases.set(key, phase % (Math.PI * 2));
      const plane = orbitPhase(`${body.id}:plane`) / (Math.PI * 2);
      const lane = {radius, eccentricity, phase, period, tilt: (vertical ? 0.08 : -0.16) + (plane - 0.5) * 0.16, flatten: 0.62 + plane * 0.04};
      const offset = orbitPosition(lane, 0, vertical);
      const ellipse = orbitEllipse(lane, vertical);
      const track = tracks.get(body.id)!;
      track.setAttribute("cx", String(center.x + ellipse.x));
      track.setAttribute("cy", String(center.y + ellipse.y));
      track.setAttribute("rx", String(ellipse.rx));
      track.setAttribute("ry", String(ellipse.ry));
      track.setAttribute("transform", `rotate(${ellipse.rotation} ${center.x + ellipse.x} ${center.y + ellipse.y})`);
      const point = {x: center.x + offset.x, y: center.y + offset.y};
      points.set(body.id, point);
      const node = nodes.get(body.id)!;
      node.style.transform = `translate(${point.x}px, ${point.y}px) translate(-50%, -50%)`;
      const depth = (Math.sin(phase) + 1) / 2;
      node.style.setProperty("--orbit-scale", String(0.94 + depth * 0.12));
      node.style.setProperty("--orbit-luminance", String(0.82 + depth * 0.18));
      node.style.zIndex = String(2 + Math.round(depth * 3));
      node.dataset.labelEdge = point.x < 100 ? "left" : point.x > width - 100 ? "right" : "center";
    }
    for (const satellite of satellites) {
      const parent = points.get(satellite.dataset.parent!);
      if (!parent) continue;
      const index = Number(satellite.dataset.slot);
      const radius = (vertical ? 28 : 38) + index * (vertical ? 6 : 8);
      const key = `${satellite.dataset.parent}:${satellite.dataset.orbitSatellite}`;
      const period = 35 * (1 + index * 0.3) ** 1.5;
      const count = projection.satellites.get(satellite.dataset.parent!)?.length ?? 1;
      const phase = (state.phases.get(key) ?? orbitPhase(satellite.dataset.parent!) + (index * Math.PI * 2) / count) + (delta / (period * 1000)) * Math.PI * 2;
      state.phases.set(key, phase % (Math.PI * 2));
      const lane = {radius, eccentricity: 0, phase, period, flatten: 0.7, tilt: -0.24 + index * 0.15};
      const offset = orbitPosition(lane, 0);
      const ellipse = orbitEllipse(lane);
      satellite.setAttribute("transform", `translate(${parent.x} ${parent.y})`);
      const track = satellite.querySelector("ellipse")!;
      track.setAttribute("rx", String(ellipse.rx));
      track.setAttribute("ry", String(ellipse.ry));
      track.setAttribute("transform", `rotate(${ellipse.rotation})`);
      const id = satellite.dataset.orbitSatellite!;
      const point = {x: parent.x + offset.x, y: parent.y + offset.y};
      points.set(id, point);
      const moon = nodes.get(id);
      if (moon) {
        moon.style.transform = `translate(${point.x}px, ${point.y}px) translate(-50%, -50%)`;
        moon.style.setProperty("--orbit-scale", String(0.95 + Math.sin(phase) * 0.05));
        moon.dataset.labelEdge = point.x < 100 ? "left" : point.x > width - 100 ? "right" : "center";
      }
    }
    if (expanded) {
      state.positions = new Map([...points].map(([id, point]) => [id, {...point, width: sizes.get(id)?.width ?? 44}]));
      for (const [id, point] of points) {
        if (id === projection.root.id) continue;
        const node = nodes.get(id),
          size = sizes.get(id);
        if (node && size)
          node.style.setProperty(
            "--orbit-hit-area",
            orbitHitArea(
              point,
              size.width,
              size.height,
              [...points.values()].filter((other) => other !== point)
            )
          );
      }
    }
    state.pulses = state.pulses.filter((pulse) => performance.now() - pulse.at < 1600);
    for (let i = 0; i < packets.length; i++) {
      const packet = packets[i]!,
        pulse = state.pulses[i];
      const source = pulse && visibleAncestor(pulse.from),
        destination = pulse && visibleAncestor(pulse.to);
      const from = source ? points.get(source) : undefined,
        to = destination ? points.get(destination) : undefined;
      const shown = Boolean(from && to && source !== destination && moving && !stale && !reduced.matches);
      packet.style.display = shown ? "" : "none";
      if (!shown || !pulse || !from || !to) continue;
      const progress = Math.min(1, (performance.now() - pulse.at) / 1600);
      line(packet.querySelector("line")!, from, to);
      packet.style.opacity = String(Math.sin(progress * Math.PI));
      for (const dot of packet.querySelectorAll("circle")) {
        dot.setAttribute("cx", String(from.x + (to.x - from.x) * progress));
        dot.setAttribute("cy", String(from.y + (to.y - from.y) * progress));
      }
    }
  };
  const running = (): boolean => moving && !stale && !reduced.matches && !hovered && !focused && visible && !document.hidden;
  const tick = (time: number): void => {
    frame = 0;
    if (disposed || !running()) {
      last = 0;
      return;
    }
    if (!last || time - last >= 32) {
      const delta = last ? Math.min(time - last, 100) : 0;
      last = time;
      draw(delta);
    }
    frame = requestAnimationFrame(tick);
  };
  const sync = (): void => {
    element.dataset.orbitMoving = String(running());
    for (const transition of transitions) {
      if ((!visible || document.hidden) && transition.playState === "running") transition.pause();
      else if (visible && !document.hidden && transition.playState === "paused") transition.play();
    }
    if (running() && expanded && projection.primary.length > 0 && !frame) frame = requestAnimationFrame(tick);
    else if (!running()) {
      cancelAnimationFrame(frame);
      frame = 0;
      last = 0;
      draw();
    }
  };
  const resize = (): void => {
    width = element.clientWidth;
    height = element.clientHeight;
    for (const [id, node] of nodes) sizes.set(id, {width: node.offsetWidth, height: node.offsetHeight});
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    options.onResize(width);
    draw();
  };
  const pointer = (event: PointerEvent): void => {
    hovered = event.type !== "pointerleave" && event.target instanceof Element && Boolean(event.target.closest("button"));
    sync();
  };
  const focus = (event: FocusEvent): void => {
    const target = event.type === "focusin" ? event.target : event.relatedTarget;
    focused = target instanceof Element && element.contains(target) && target.matches(":focus-visible");
    sync();
  };
  const visibility = new IntersectionObserver(([entry]) => {
    visible = entry?.isIntersecting ?? false;
    sync();
  });
  visibility.observe(element);
  const size = new ResizeObserver(resize);
  size.observe(element);
  element.addEventListener("pointerover", pointer);
  element.addEventListener("pointerleave", pointer);
  element.addEventListener("focusin", focus);
  element.addEventListener("focusout", focus);
  document.addEventListener("visibilitychange", sync);
  reduced.addEventListener("change", sync);
  resize();
  if (expanded && moving && !reduced.matches && !stale) {
    if (focusChanged) {
      for (const [id, node] of nodes) {
        const from = previousPositions?.get(id),
          to = state.positions?.get(id);
        if (!to) continue;
        transitions.push(
          node.animate(
            from
              ? [
                  {translate: `${from.x - to.x}px ${from.y - to.y}px`, scale: String(from.width / to.width)},
                  {translate: "0px 0px", scale: "1"},
                ]
              : [
                  {opacity: 0, scale: "0.7"},
                  {opacity: 1, scale: "1"},
                ],
            {duration: 620, easing: "cubic-bezier(.22,1,.36,1)"}
          )
        );
      }
      transitions.push(svg.animate([{opacity: 0}, {opacity: 1}], {duration: 620, easing: "ease-in"}));
    } else {
      for (const id of arrivals) {
        const node = nodes.get(id),
          parent = model.bodies.get(id)?.parentId;
        const from = parent && state.positions?.get(parent),
          to = state.positions?.get(id);
        if (!node || !from || !to) continue;
        transitions.push(
          node.animate(
            [
              {translate: `${from.x - to.x}px ${from.y - to.y}px`, scale: "0.15", opacity: 0},
              {translate: "0px 0px", scale: "1", opacity: 1},
            ],
            {duration: 850, easing: "cubic-bezier(.16,1,.3,1)"}
          )
        );
      }
    }
  }
  sync();
  return () => {
    disposed = true;
    cancelAnimationFrame(frame);
    for (const transition of transitions) transition.cancel();
    visibility.disconnect();
    size.disconnect();
    element.removeEventListener("pointerover", pointer);
    element.removeEventListener("pointerleave", pointer);
    element.removeEventListener("focusin", focus);
    element.removeEventListener("focusout", focus);
    document.removeEventListener("visibilitychange", sync);
    reduced.removeEventListener("change", sync);
  };
}
