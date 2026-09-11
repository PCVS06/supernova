import {mkdtemp, mkdir, readFile, rename, rm, symlink, writeFile, access} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {afterEach, beforeEach, describe, expect, it} from "vitest";
import {HarnessStore} from "@supernova/agent-runtime/layers/harnesses/internal/harness-store";
import {getHarnessMemory, getHarnessResources} from "@supernova/agent-runtime/layers/harnesses/internal/harness-resources";

describe("resource and memory visibility", () => {
  let root: string;
  let store: HarnessStore;
  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "pi-plus-resources-test-"));
    store = new HarnessStore(join(root, "config"));
    await mkdir(join(root, "project"));
    await store.saveProject({id: "lab", harnessId: "coding", name: "Lab", path: join(root, "project"), systemPrompt: "", contextInstructions: "", agents: []}, 0);
  });
  afterEach(async () => {
    await rm(root, {recursive: true, force: true});
  });
  it("does not create memory files just by opening the viewer", async () => {
    expect(await getHarnessMemory("coding", "lab", store)).toMatchObject({available: false, total: 0});
    await expect(access(join(root, "project", ".science-memory"))).rejects.toThrow();
  });
  it("distinguishes an unavailable project folder from an empty memory ledger", async () => {
    await rename(join(root, "project"), join(root, "moved-project"));
    expect(await getHarnessMemory("coding", "lab", store)).toMatchObject({available: false, unavailableReason: "workspace-missing", total: 0});
    await expect(access(join(root, "project"))).rejects.toThrow();
  });
  it("shows the latest state with evidence and reports corrupt rows without rewriting them", async () => {
    await mkdir(join(root, "project", ".science-memory"));
    const record = {recordId: "C-1", statement: "A bounded claim", kind: "claim", epistemicState: "proposed", updatedAt: "2026-09-11", evidence: []};
    const ledger = [
      JSON.stringify({schemaVersion: 1, record}),
      "corrupt",
      JSON.stringify({schemaVersion: 1, record: {...record, epistemicState: "verified", evidence: [{ref: "S-1"}]}}),
    ].join("\n");
    const file = join(root, "project", ".science-memory", "ledger.jsonl");
    await writeFile(file, ledger);
    const memory = await getHarnessMemory("coding", "lab", store);
    expect(memory).toMatchObject({available: true, total: 1, rejected: 1, records: [{id: "C-1", state: "verified", evidence: ["S-1"]}]});
    expect(await readFile(file, "utf8")).toBe(ledger);
  });
  it("rejects cross-harness projects and memory symlinks that escape a project", async () => {
    await expect(getHarnessMemory("coding", "not-in-harness", store)).rejects.toThrow("not part");
    await mkdir(join(root, "outside"));
    await writeFile(join(root, "outside", "ledger.jsonl"), "private");
    await symlink(join(root, "outside"), join(root, "project", ".science-memory"));
    await expect(getHarnessMemory("coding", "lab", store)).rejects.toThrow("escapes");
  });
  it("does not invent extension tools or connectors for an empty harness", async () => {
    const resources = await getHarnessResources("coding", "lab", store);
    expect(resources.extensions).toEqual([]);
    expect(resources.warnings).toEqual([]);
    expect(resources.tools.map((tool) => tool.name)).toEqual(["manage_lab_view"]);
  });
});
