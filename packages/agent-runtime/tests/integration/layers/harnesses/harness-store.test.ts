import {mkdtemp, mkdir, readFile, rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {afterEach, beforeEach, describe, expect, it} from "vitest";
import {HarnessStore} from "@supernova/agent-runtime/layers/harnesses/internal/harness-store";
import {createDefaultHarness, validateHarness} from "@supernova/agent-runtime/layers/harnesses/lib/harness-config";

describe("harness persistence and isolation", () => {
  let root: string;
  let store: HarnessStore;
  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "pi-plus-harness-test-"));
    store = new HarnessStore(join(root, "config"));
    await mkdir(join(root, "project"));
  });
  afterEach(async () => {
    await rm(root, {recursive: true, force: true});
  });

  it("reports a missing project folder without persisting the flag or failing the reader", async () => {
    await store.save(createDefaultHarness(), 0);
    const project = {id: "project-a", harnessId: "coding", name: "Project A", path: join(root, "project"), systemPrompt: "", contextInstructions: "", agents: []};
    await store.saveProject({...project, folderMissing: true}, 1);
    expect(await readFile(join(root, "config", "harnesses.json"), "utf8")).not.toContain("folderMissing");
    expect((await store.describe()).projects[0]?.folderMissing).toBeUndefined();

    await rm(join(root, "project"), {recursive: true});
    expect((await store.describe()).projects[0]?.folderMissing).toBe(true);
    expect((await store.list()).projects[0]?.folderMissing).toBeUndefined();
    await expect(store.resolveProject("project-a")).rejects.toThrow("The project folder is missing");
    // The project stays editable so its plan and instructions survive until the folder returns.
    await store.saveProject({...project, name: "Renamed"}, 2);
    expect((await store.list()).projects[0]?.name).toBe("Renamed");
    await expect(store.saveProject({...project, id: "project-b", path: join(root, "elsewhere")}, 3)).rejects.toThrow();
  });

  it("rejects lost updates and retains a valid atomic configuration", async () => {
    await store.save({...createDefaultHarness(), systemPrompt: "First"}, 0);
    await expect(store.save({...createDefaultHarness(), systemPrompt: "Stale"}, 0)).rejects.toThrow("changed elsewhere");
    expect((await store.list()).harnesses[0]?.systemPrompt).toBe("First");
    expect(JSON.parse(await readFile(join(root, "config", "harnesses.json"), "utf8")).revision).toBe(1);
  });

  it("rejects concurrent writes from independent stores", async () => {
    const otherStore = new HarnessStore(store.root);
    const results = await Promise.allSettled([
      store.save({...createDefaultHarness(), systemPrompt: "First writer"}, 0),
      otherStore.save({...createDefaultHarness(), systemPrompt: "Second writer"}, 0),
    ]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
    expect((await store.list()).revision).toBe(1);
    await store.save({...createDefaultHarness(), systemPrompt: "Next writer"}, 1);
    expect((await store.list()).revision).toBe(2);
  });

  it("pins chat prompts and specialists independently from later harness edits", async () => {
    const agent = {name: "reviewer", description: "Review", systemPrompt: "Shared specialist", tools: ["read"]};
    await store.save({...createDefaultHarness(), systemPrompt: "Shared instructions", agents: [agent]}, 0);
    await store.saveProject(
      {
        id: "project-a",
        harnessId: "coding",
        name: "Project A",
        path: join(root, "project"),
        systemPrompt: "Project instructions",
        contextInstructions: "Project context",
        agents: [{...agent, systemPrompt: "Project specialist"}],
      },
      1
    );
    const captured = await store.resolveProject("project-a");
    await store.bindSession("chat-a", captured);
    await store.save({...createDefaultHarness(), systemPrompt: "Changed later", agents: [agent]}, 2);
    const pinned = await store.forSession("chat-a", join(root, "project"));
    expect(pinned?.harness.systemPrompt).toBe("Shared instructions\n\nProject instructions");
    expect(pinned?.harness.agents[0]?.systemPrompt).toBe("Project specialist");
    expect(pinned?.harness.context.instructions).toBe("Project context");
    expect((await store.resolveProject("project-a")).harness.systemPrompt).toBe("Changed later\n\nProject instructions");
    await expect(store.forSession("chat-a", root)).rejects.toThrow("does not belong");
    await expect(store.bindSession("../escape", captured)).rejects.toThrow("Invalid session");
  });

  it("does not allow the same folder to drift between harness projects", async () => {
    const project = {id: "one", harnessId: "coding", name: "One", path: join(root, "project"), systemPrompt: "", contextInstructions: "", agents: []};
    await store.saveProject(project, 0);
    await expect(store.saveProject({...project, id: "two"}, 1)).rejects.toThrow("already linked");
    expect(await store.forSession("unmanaged-chat", join(root, "nonexistent"))).toBeUndefined();
  });

  it("applies Coding defaults to new chats in legacy folders without changing old chats", async () => {
    await store.save({...createDefaultHarness(), systemPrompt: "Coding defaults"}, 0);
    const snapshot = await store.resolveNewSession(join(root, "project"));
    expect(snapshot.harness.id).toBe("coding");
    expect(snapshot.harness.systemPrompt).toBe("Coding defaults");
    expect(await store.forSession("old-chat", join(root, "project"))).toBeUndefined();
    await store.bindSession("new-chat", snapshot);
    expect((await store.forSession("new-chat", join(root, "project")))?.harness.systemPrompt).toBe("Coding defaults");
    expect((await store.list()).projects).toEqual([]);
  });

  it("rejects unsafe loop values, dangling graph references, and recursive specialists", () => {
    expect(() => validateHarness({...createDefaultHarness(), loop: {maxTurns: 0, timeoutSeconds: 10}})).toThrow("Max turns");
    expect(() => validateHarness({...createDefaultHarness(), graph: {steps: ["missing"]}})).toThrow("defined agents");
    expect(() => validateHarness({...createDefaultHarness(), agents: [{name: "loop", description: "", systemPrompt: "Loop", tools: ["subagent"]}]})).toThrow("recursively");
  });

  it("normalizes Science Space as head and pins its lab configuration for delegation", async () => {
    const labPath = join(root, "lab");
    await mkdir(labPath);
    await store.save({...createDefaultHarness("science", "Science Pi"), source: {rootPath: join(root, "project"), packagePath: root}}, 0);
    await store.saveProject({id: "head", harnessId: "science", name: "Science Space", path: join(root, "project"), systemPrompt: "HEAD", contextInstructions: "", agents: []}, 1);
    await store.saveProject({id: "lab", harnessId: "science", name: "Lab", path: labPath, systemPrompt: "LAB", contextInstructions: "", agents: []}, 2);
    const library = await store.list();
    expect(library.harnesses.find((item) => item.id === "science")?.coordinatorProjectId).toBe("head");
    expect(library.projects.find((item) => item.id === "lab")?.parentProjectId).toBe("head");
    const head = await store.resolveProject("head");
    await store.bindSession("head-chat", head);
    const lab = library.projects.find((item) => item.id === "lab")!;
    await store.saveProject({...lab, systemPrompt: "UPDATED LAB"}, 3);
    expect((await store.forSession("head-chat", join(root, "project")))?.delegation?.projects[0]?.systemPrompt).toBe("LAB");
    expect((await store.resolveProject("head")).delegation?.projects[0]?.systemPrompt).toBe("UPDATED LAB");
    expect((await store.resolveProject("lab")).delegation).toBeUndefined();
  });
});
