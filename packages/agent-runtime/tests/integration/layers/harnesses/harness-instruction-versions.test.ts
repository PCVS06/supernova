import {mkdir, mkdtemp, readdir, rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {afterEach, beforeEach, describe, expect, it} from "vitest";
import type {HarnessConfig, HarnessProject} from "@supernova/contracts/harnesses/schemas";
import {HarnessStore} from "@supernova/agent-runtime/layers/harnesses/internal/harness-store";
import {createDefaultHarness} from "@supernova/agent-runtime/layers/harnesses/lib/harness-config";

describe("instruction version history", () => {
  let root: string;
  let store: HarnessStore;
  const reviewer = {name: "reviewer", description: "Review", systemPrompt: "Verify every claim.", tools: ["read"]};

  function harness(overrides: Partial<HarnessConfig> = {}): HarnessConfig {
    return {...createDefaultHarness(), systemPrompt: "Shared rules", context: {...createDefaultHarness().context, instructions: "Context rules"}, agents: [reviewer], ...overrides};
  }
  function project(overrides: Partial<HarnessProject> = {}): HarnessProject {
    return {id: "project-a", harnessId: "coding", name: "Project A", path: join(root, "project"), systemPrompt: "Project rules", contextInstructions: "", agents: [], ...overrides};
  }

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "pi-plus-versions-test-"));
    store = new HarnessStore(join(root, "config"));
    await mkdir(join(root, "project"));
  });
  afterEach(async () => {
    await rm(root, {recursive: true, force: true});
  });

  it("keeps the previous text of every changed piece and nothing else", async () => {
    await store.save(harness(), 0);
    await store.saveProject(project(), 1);
    // The first save had nothing to replace, so no piece has a history yet.
    await expect(store.listVersions({kind: "harness", harnessId: "coding"})).resolves.toEqual([]);

    await store.save(harness({systemPrompt: "Shared rules, revised", agents: [{...reviewer, systemPrompt: "Verify every claim twice."}]}), 2);

    const shared = await store.listVersions({kind: "harness", harnessId: "coding"});
    expect(shared.map((version) => version.revision)).toEqual([2]);
    expect(await store.readVersion({kind: "harness", harnessId: "coding"}, 2)).toBe("Shared rules");
    expect(await store.readVersion({kind: "role", harnessId: "coding", agentName: "reviewer"}, 2)).toBe("Verify every claim.");
    // Context rules and the project prompt were untouched by that save.
    expect(await store.listVersions({kind: "context", harnessId: "coding"})).toEqual([]);
    expect(await store.listVersions({kind: "project", harnessId: "coding", projectId: "project-a"})).toEqual([]);

    await store.saveProject(project({systemPrompt: "Project rules, revised", agents: [{...reviewer, systemPrompt: "Project-specific review."}]}), 3);
    await store.saveProject(project({systemPrompt: "Project rules, revised again", agents: [{...reviewer, systemPrompt: "Project-specific review, shorter."}]}), 4);

    const projectVersions = await store.listVersions({kind: "project", harnessId: "coding", projectId: "project-a"});
    expect(projectVersions.map((version) => version.revision)).toEqual([4, 3]);
    expect(projectVersions[0]?.size).toBe("Project rules, revised".length);
    expect(await store.readVersion({kind: "project", harnessId: "coding", projectId: "project-a"}, 3)).toBe("Project rules");
    expect(await store.readVersion({kind: "role", harnessId: "coding", projectId: "project-a", agentName: "reviewer"}, 4)).toBe("Project-specific review.");
  });

  it("keeps the text of a removed role and reports a revision that was never saved", async () => {
    await store.save(harness(), 0);
    await store.save(harness({agents: []}), 1);

    expect(await store.readVersion({kind: "role", harnessId: "coding", agentName: "reviewer"}, 1)).toBe("Verify every claim.");
    await expect(store.readVersion({kind: "role", harnessId: "coding", agentName: "reviewer"}, 7)).rejects.toThrow("No saved version");
  });

  it("writes one directory per artefact, keyed by harness, project and role", async () => {
    await store.save(harness(), 0);
    await store.saveProject(project({agents: [reviewer]}), 1);
    await store.save(harness({systemPrompt: "Changed", context: {...createDefaultHarness().context, instructions: "Changed rules"}}), 2);
    await store.saveProject(project({systemPrompt: "Changed", agents: [{...reviewer, systemPrompt: "Changed too."}]}), 3);

    expect((await readdir(join(root, "config", "versions", "coding"))).sort()).toEqual(["context", "harness", "project-project-a", "project-project-a-role-reviewer"].sort());
    expect(await store.readVersion({kind: "context", harnessId: "coding"}, 2)).toBe("Context rules");
  });
});
