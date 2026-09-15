interface Pinnable {
  readonly pinned: boolean;
}

/** Returns a stable copy with pinned items before unpinned items. */
export function pinnedFirst<T extends Pinnable>(items: readonly T[]): T[] {
  return items.toSorted((left, right) => Number(right.pinned) - Number(left.pinned));
}
