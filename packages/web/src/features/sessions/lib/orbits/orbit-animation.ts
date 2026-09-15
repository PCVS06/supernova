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
  handoff?: {positions: Map<string, OrbitPoint & {width: number}>; remaining: number};
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
  const handoff = state.handoff;
  const previousPositions = handoff?.positions ?? state.positions;
  state.handoff = undefined;
  const focusChanged = state.focus !== undefined && state.focus !== projection.root.id;
  const transitions: Animation[] = [];
  const arrivals = new Set<string>();
  state.focus = projection.root.id;
  let width = 0,
    height = 0,
    frame = 0,
    last = 0,
    hovered = element.querySelector(".chat-orbit-body:hover") !== null,
    focused = element.querySelector(".chat-orbit-body:focus-visible") !== null,
    visible = true,
    disposed = false;
  const previous = state.order.get(projection.root.id) ?? [];
  const currentIds = projection.primary.map((body) => body.id);
  const order = [...previous.filter((id) => currentIds.includes(id)), ...currentIds.filter((id) => !previous.includes(id))];
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
    const minimum = vertical ? (nested ? 144 : 94) : nested ? 188 : 144;
    const points = new Map<string, OrbitPoint>([[projection.root.id, center]]);
    // Nearby projected lanes share a phase clock so planetary systems cannot drift through one another.
    const clockKey = `${projection.root.id}:formation`;
    const clock = (state.phases.get(clockKey) ?? orbitPhase(projection.root.id)) + (delta / 70000) * Math.PI * 2;
    state.phases.set(clockKey, clock % (Math.PI * 2));
    for (const body of projection.primary) {
      const index = order.indexOf(body.id);
      // Peers share one orbit. Status changes affect the mark, not its lane.
      const target = Math.min(maximum, minimum + 40);
      const key = `${projection.root.id}:${body.id}`;
      const radius = Math.min(
        maximum,
        !moving || reduced.matches ? target : (state.radii.get(key) ?? target) + (target - (state.radii.get(key) ?? target)) * (1 - Math.exp(-delta / 600))
      );
      if (expanded) state.radii.set(key, Math.min(radius, maximum));
      const eccentricity = 0.025;
      const period = 70;
      const phase = clock + (index * Math.PI * 2) / order.length;
      const lane = {radius, eccentricity, phase, period, tilt: vertical ? 0.04 : -0.1, flatten: 0.72};
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
      node.style.setProperty("--orbit-luminance", String(0.92 + depth * 0.08));
      node.style.zIndex = String(2 + Math.round(depth * 3));
      node.dataset.labelEdge = point.x < 100 ? "left" : point.x > width - 100 ? "right" : "center";
      node.dataset.labelSide = point.y < center.y ? "above" : "below";
    }
    for (const satellite of satellites) {
      const parent = points.get(satellite.dataset.parent!);
      if (!parent) continue;
      const index = Number(satellite.dataset.slot);
      const radius = vertical ? 36 : 48;
      const period = 35;
      const count = projection.satellites.get(satellite.dataset.parent!)?.length ?? 1;
      const phase = clock * 2 + orbitPhase(satellite.dataset.parent!) + (index * Math.PI * 2) / count;
      const lane = {radius, eccentricity: 0, phase, period, flatten: 0.92, tilt: -0.15};
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
        moon.dataset.labelEdge = point.x < 100 ? "left" : point.x > width - 100 ? "right" : "center";
        moon.dataset.labelSide = point.y < parent.y ? "above" : "below";
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
    element.dataset.orbitVisible = String(visible && !document.hidden);
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
    height = svg.clientHeight;
    for (const [id, node] of nodes) sizes.set(id, {width: node.offsetWidth, height: node.offsetHeight});
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    options.onResize(width);
    draw();
  };
  const pointer = (event: PointerEvent): void => {
    hovered = event.type !== "pointerleave" && event.target instanceof Element && Boolean(event.target.closest(".chat-orbit-body"));
    sync();
  };
  const focus = (event: FocusEvent): void => {
    const target = event.type === "focusin" ? event.target : event.relatedTarget;
    focused = target instanceof Element && element.contains(target) && target.matches(".chat-orbit-body:focus-visible");
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
    if (focusChanged || handoff) {
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
            {duration: focusChanged ? 620 : handoff!.remaining, easing: "cubic-bezier(.22,1,.36,1)"}
          )
        );
      }
      transitions.push(svg.animate([{opacity: 0}, {opacity: 1}], {duration: 620, easing: "ease-in"}));
    } else {
      for (const id of arrivals) {
        const node = nodes.get(id);
        if (!node) continue;
        transitions.push(node.animate([{opacity: 0}, {opacity: 1}], {duration: 850, easing: "cubic-bezier(.16,1,.3,1)"}));
      }
    }
  }
  sync();
  return () => {
    disposed = true;
    cancelAnimationFrame(frame);
    const unfinished = transitions.filter((transition) => transition.playState === "running" || transition.playState === "paused");
    if (expanded && unfinished.length > 0) {
      const bounds = element.getBoundingClientRect();
      state.handoff = {
        positions: new Map(
          [...nodes].map(([id, node]) => {
            const box = node.getBoundingClientRect();
            return [id, {x: box.x + box.width / 2 - bounds.x, y: box.y + box.height / 2 - bounds.y, width: box.width}];
          })
        ),
        remaining: Math.max(80, ...unfinished.map((transition) => Number(transition.effect?.getComputedTiming().endTime ?? 620) - Number(transition.currentTime ?? 0))),
      };
    }
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
