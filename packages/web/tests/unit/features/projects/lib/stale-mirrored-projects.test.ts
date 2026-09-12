import {describe, expect, it} from "vitest";
import {staleMirroredProjects} from "@/features/projects/lib/stale-mirrored-projects";

const stored = (path: string, managedBy?: string) => ({id: path, name: path, path, addedAt: "2026-09-12T00:00:00.000Z", ...(managedBy && {managedBy})});

describe("staleMirroredProjects", () => {
  const library = {
    harnesses: [{id: "science", source: {packagePath: "/pkg", rootPath: "/space"}}, {id: "coding"}],
    projects: [{path: "/space"}, {path: "/space/labs/kept"}],
  } as never;

  it("drops mirrored rows and imported-workspace folders the library no longer lists", () => {
    const stale = staleMirroredProjects([stored("/space/labs/kept", "science"), stored("/space/labs/gone", "science"), stored("/space/labs/legacy"), stored("/space")], library);
    expect(stale.map((project) => project.path)).toEqual(["/space/labs/gone", "/space/labs/legacy"]);
  });

  it("keeps folders the user opened by hand outside any imported workspace", () => {
    expect(staleMirroredProjects([stored("/home/me/app"), stored("/spaceship")], library)).toEqual([]);
  });
});
