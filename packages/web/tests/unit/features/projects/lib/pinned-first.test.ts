import {describe, expect, it} from "vitest";
import {pinnedFirst} from "@/features/projects/lib/pinned-first";

describe("pinnedFirst", () => {
  it("moves pinned items ahead while preserving the order within both groups", () => {
    const ordered = pinnedFirst([
      {id: "recent", pinned: false},
      {id: "important", pinned: true},
      {id: "older", pinned: false},
      {id: "also-important", pinned: true},
    ]);

    expect(ordered.map(({id}) => id)).toEqual(["important", "also-important", "recent", "older"]);
  });

  it("does not mutate the source list", () => {
    const source = [
      {id: "recent", pinned: false},
      {id: "important", pinned: true},
    ];

    expect(pinnedFirst(source)).not.toBe(source);
    expect(source.map(({id}) => id)).toEqual(["recent", "important"]);
  });
});
