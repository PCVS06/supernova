export interface OrbitPoint {
  readonly x: number;
  readonly y: number;
}
export interface OrbitLane {
  readonly radius: number;
  readonly eccentricity: number;
  readonly phase: number;
  readonly period: number;
  readonly tilt?: number;
  readonly flatten?: number;
}

export interface OrbitEllipse extends OrbitPoint {
  readonly rx: number;
  readonly ry: number;
  readonly rotation: number;
}

/** Divides overlapping hit areas at their perpendicular bisector, keeping each visible body's center clickable. */
export function orbitHitArea(center: OrbitPoint, width: number, height: number, neighbors: readonly OrbitPoint[]): string {
  let polygon: OrbitPoint[] = [
    {x: 0, y: 0},
    {x: width, y: 0},
    {x: width, y: height},
    {x: 0, y: height},
  ];
  for (const other of neighbors) {
    const dx = other.x - center.x,
      dy = other.y - center.y;
    const distanceSquared = dx * dx + dy * dy;
    if (distanceSquared < 0.01 || distanceSquared > width * width + height * height) continue;
    const limit = distanceSquared / 2 + (dx * width) / 2 + (dy * height) / 2;
    const clipped: OrbitPoint[] = [];
    for (let index = 0; index < polygon.length; index++) {
      const from = polygon[index]!,
        to = polygon[(index + 1) % polygon.length]!;
      const a = from.x * dx + from.y * dy - limit,
        b = to.x * dx + to.y * dy - limit;
      if (a <= 0) clipped.push(from);
      if (a <= 0 !== b <= 0) {
        const fraction = a / (a - b);
        clipped.push({x: from.x + (to.x - from.x) * fraction, y: from.y + (to.y - from.y) * fraction});
      }
    }
    polygon = clipped;
  }
  return `polygon(${polygon.map((point) => `${point.x.toFixed(2)}px ${point.y.toFixed(2)}px`).join(",")})`;
}

/** Stable phases keep a recorded body in place across snapshots and list reordering. */
export function orbitPhase(id: string): number {
  let hash = 2166136261;
  for (let i = 0; i < id.length; i++) hash = Math.imul(hash ^ id.charCodeAt(i), 16777619);
  // Avalanche neighboring identifiers so numbered workers do not form a single radial stack.
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x85ebca6b);
  hash ^= hash >>> 13;
  hash = Math.imul(hash, 0xc2b2ae35);
  hash ^= hash >>> 16;
  return ((hash >>> 0) / 4294967296) * Math.PI * 2;
}

/** Projects an elliptic orbit around its parent's focus, with slower outer revolutions. */
export function orbitPosition(lane: OrbitLane, seconds: number, vertical = false): OrbitPoint {
  const mean = lane.phase + (seconds / lane.period) * Math.PI * 2;
  let eccentric = mean;
  for (let i = 0; i < 4; i++) eccentric -= (eccentric - lane.eccentricity * Math.sin(eccentric) - mean) / (1 - lane.eccentricity * Math.cos(eccentric));
  const x = lane.radius * (Math.cos(eccentric) - lane.eccentricity);
  const y = lane.radius * Math.sqrt(1 - lane.eccentricity ** 2) * Math.sin(eccentric);
  const flatten = lane.flatten ?? 0.72;
  const projected = vertical ? {x: y * flatten, y: x} : {x, y: y * flatten};
  const tilt = lane.tilt ?? 0;
  return {x: projected.x * Math.cos(tilt) - projected.y * Math.sin(tilt), y: projected.x * Math.sin(tilt) + projected.y * Math.cos(tilt)};
}

/** Shares the exact projected ellipse between the dotted track and its orbiting body. */
export function orbitEllipse(lane: OrbitLane, vertical = false): OrbitEllipse {
  const minor = lane.radius * Math.sqrt(1 - lane.eccentricity ** 2) * (lane.flatten ?? 0.72);
  const tilt = lane.tilt ?? 0;
  const offset = -lane.radius * lane.eccentricity;
  return {
    x: vertical ? -offset * Math.sin(tilt) : offset * Math.cos(tilt),
    y: vertical ? offset * Math.cos(tilt) : offset * Math.sin(tilt),
    rx: vertical ? minor : lane.radius,
    ry: vertical ? lane.radius : minor,
    rotation: (tilt * 180) / Math.PI,
  };
}
