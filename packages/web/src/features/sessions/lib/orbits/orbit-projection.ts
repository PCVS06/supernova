import type {OrbitBody, OrbitModel} from "@/features/sessions/lib/orbits/orbit-model";

export interface OrbitGroup {
  readonly id: string;
  readonly parentId: string;
  readonly label: string;
  readonly members: readonly string[];
  readonly active: boolean;
  readonly attention: boolean;
}
export interface OrbitProjection {
  readonly root: OrbitBody;
  readonly primary: readonly (OrbitBody | OrbitGroup)[];
  readonly satellites: ReadonlyMap<string, readonly OrbitBody[]>;
  readonly hidden: number;
}

function priority(body: OrbitBody): number {
  return body.attention ? 0 : body.active ? 1 : body.independentChats.length ? 2 : 3;
}

/** Lists a subtree iteratively so damaged or unusually deep records cannot exhaust the call stack. */
export function orbitDescendants(model: OrbitModel, id: string): readonly string[] {
  const seen = new Set<string>(),
    pending = [...(model.children.get(id) ?? [])];
  while (pending.length) {
    const next = pending.pop()!;
    if (seen.has(next)) continue;
    seen.add(next);
    pending.push(...(model.children.get(next) ?? []));
  }
  return [...seen];
}

/** Limits visible bodies, preserving the selected branch and grouping work within its real parent. */
export function projectOrbits(model: OrbitModel, focusId: string, limit: number, selectedId?: string): OrbitProjection {
  const root = model.bodies.get(focusId) ?? model.bodies.get(model.rootId)!;
  const direct = (model.children.get(root.id) ?? []).map((id) => model.bodies.get(id)!).filter(Boolean);
  let protectedId = selectedId;
  const seen = new Set<string>();
  while (protectedId && model.bodies.get(protectedId)?.parentId !== root.id && !seen.has(protectedId)) {
    seen.add(protectedId);
    protectedId = model.bodies.get(protectedId)?.parentId;
  }
  const sorted = direct.toSorted(
    (a, b) =>
      Number(b.id === protectedId) - Number(a.id === protectedId) || priority(a) - priority(b) || (b.updatedAt ?? "").localeCompare(a.updatedAt ?? "") || a.id.localeCompare(b.id)
  );
  const primary: (OrbitBody | OrbitGroup)[] = [];
  if (sorted.length <= limit) primary.push(...sorted);
  else {
    primary.push(...sorted.slice(0, Math.max(1, limit - 2)));
    const rest = sorted.slice(primary.length);
    const working = rest.filter((body) => body.active || body.attention || body.independentChats.length);
    const past = rest.filter((body) => !body.active && !body.attention && !body.independentChats.length);
    for (const [name, members] of [
      ["Current work", working],
      ["Earlier work", past],
    ] as const)
      if (members.length)
        primary.push({
          id: `group:${root.id}:${name}`,
          parentId: root.id,
          label: name,
          members: members.map((body) => body.id),
          active: members.some((body) => body.active),
          attention: members.some((body) => body.attention),
        });
  }
  const satellites = new Map<string, readonly OrbitBody[]>();
  for (const body of primary)
    if (!("members" in body)) {
      const nested = (model.children.get(body.id) ?? []).map((id) => model.bodies.get(id)!).filter(Boolean);
      satellites.set(body.id, nested.toSorted((a, b) => priority(a) - priority(b) || a.id.localeCompare(b.id)).slice(0, 3));
    }
  return {root, primary, satellites, hidden: primary.reduce((sum, body) => sum + ("members" in body ? body.members.length : 0), 0)};
}
