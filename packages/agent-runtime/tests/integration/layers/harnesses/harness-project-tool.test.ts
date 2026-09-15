import {mkdtemp, mkdir, readFile, rm, stat, writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {afterEach, beforeEach, describe, expect, it} from "vitest";
import type {ExtensionContext} from "@earendil-works/pi-coding-agent";
import {HarnessStore} from "@supernova/agent-runtime/layers/harnesses/internal/harness-store";
import {createHarnessProjectTool} from "@supernova/agent-runtime/layers/harnesses/internal/harness-project-tool";
import {createDefaultHarness} from "@supernova/agent-runtime/layers/harnesses/lib/harness-config";

describe("harness lead project management", () => {
  let root: string;
  let store: HarnessStore;
  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "radian-project-tools-"));
    store = new HarnessStore(join(root, "config"));
    await store.saveProject({id: "head", harnessId: "coding", name: "Head", path: root, systemPrompt: "HEAD", contextInstructions: "", agents: []}, 0);
    await store.save({...createDefaultHarness(), coordinatorProjectId: "head"}, 1);
  });
  afterEach(async () => {
    await rm(root, {recursive: true, force: true});
  });

  it("creates and immediately delegates new projects from an already-open lead chat", async () => {
    const head = await store.resolveProject("head");
    expect(head.delegation?.projects).toEqual([]);
    const tool = createHarnessProjectTool(head, store);
    const invoke = (id: string, params: Parameters<typeof tool.execute>[1]) => tool.execute(id, params, undefined, undefined, {} as ExtensionContext);
    const created = await invoke("create-new", {
      action: "create",
      name: "Research",
      path: join(root, "research"),
      createDirectory: true,
      expectedRevision: 2,
      systemPrompt: "Research brief",
    });
    const project = (created.details as {projects: {id: string}[]}).projects[0]!;
    expect((await stat(join(root, "research"))).isDirectory()).toBe(true);
    const child = await store.delegatedProject(head, project.id);
    expect(child.project.parentProjectId).toBe("head");
    expect(child.harness.systemPrompt).toBe("Research brief");
    expect(child.harness.systemPrompt).not.toContain("HEAD");
    await store.bindSession("independent-chat", child);
    await invoke("update", {action: "update", projectId: project.id, systemPrompt: "Revised brief", expectedRevision: 3});
    expect((await store.delegatedProject(head, project.id)).harness.systemPrompt).toBe("Revised brief");
    expect((await store.forSession("independent-chat", child.project.path))?.harness.systemPrompt).toBe("Research brief");
    await expect(invoke("stale", {action: "update", projectId: project.id, name: "Stale", expectedRevision: 3})).rejects.toThrow("changed elsewhere");
  });

  it("links existing folders without changing files and refuses stale roles or other harnesses", async () => {
    const head = await store.resolveProject("head");
    const path = join(root, "existing");
    await mkdir(path);
    await writeFile(join(path, "notes.md"), "Keep my research");
    await store.manageProject(head, {action: "assign", projectId: "existing", name: "Existing", path}, 2);
    expect(await readFile(join(path, "notes.md"), "utf8")).toBe("Keep my research");
    const child = await store.resolveProject("existing");
    await expect(store.manageProject(child, {action: "update", projectId: "existing", name: "Denied"}, 3)).rejects.toThrow("current lead");
    await store.save(createDefaultHarness("other"), 3);
    await mkdir(join(root, "other"));
    await store.saveProject({...child.project, id: "other", harnessId: "other", path: join(root, "other")}, 4);
    await expect(store.manageProject(head, {action: "assign", projectId: "other", name: "Take over"}, 5)).rejects.toThrow("child project");
    await expect(store.delegatedProject(head, "other")).rejects.toThrow("does not report");
    await store.save({...createDefaultHarness(), coordinatorProjectId: "existing"}, 5);
    await expect(store.projectsForLead(head)).rejects.toThrow("current lead");
  });
});
