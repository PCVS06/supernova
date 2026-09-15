import {HarnessStore} from "@supernova/agent-runtime/layers/harnesses/internal/harness-store";
import {mkdtemp, mkdir, realpath, rm, symlink, writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import type {HarnessSnapshot} from "@supernova/contracts/harnesses/schemas";
import type {ExtensionContext} from "@earendil-works/pi-coding-agent";
import type {PiSdkServiceShape} from "@supernova/agent-runtime/layers/pi-sdk";
import {createDefaultHarness, resolveHarnessProject} from "@supernova/agent-runtime/layers/harnesses/lib/harness-config";
import {createHarnessResources, createHarnessTools} from "@supernova/agent-runtime/layers/harnesses/internal/harness-runtime";
import {fauxAssistantMessage, selectedPiModel} from "@tests/support/layers/pi-session-test-utils";

describe("harness runtime resources", () => {
  let root: string;
  let snapshot: HarnessSnapshot;
  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "pi-plus-resources-test-"));
    snapshot = {
      revision: 1,
      harness: createDefaultHarness(),
      project: {id: "project", harnessId: "coding", name: "Test", path: root, systemPrompt: "", contextInstructions: "", agents: []},
    };
  });
  afterEach(async () => {
    await rm(root, {recursive: true, force: true});
  });

  it("loads configured context and compaction while ignoring ambient extensions", async () => {
    await mkdir(join(root, ".pi", "extensions"), {recursive: true});
    await writeFile(join(root, ".pi", "extensions", "ambient.ts"), "throw new Error('Ambient extension must not run');");
    await writeFile(join(root, "context.md"), "Exact project context");
    snapshot = {
      ...snapshot,
      harness: {...snapshot.harness, systemPrompt: "Harness instruction", context: {...snapshot.harness.context, files: ["context.md"], autoCompaction: false}},
    };
    const {resourceLoader, settingsManager} = await createHarnessResources(snapshot);
    expect(resourceLoader.getAppendSystemPrompt().join("\n")).toContain("Exact project context");
    expect(resourceLoader.getAppendSystemPrompt()).toContain("Harness instruction");
    expect(settingsManager.getCompactionSettings().enabled).toBe(false);
    expect(resourceLoader.getExtensions().errors).toEqual([]);
  });

  it("appends project planning documents and skips one that is missing", async () => {
    await writeFile(join(root, "roadmap.md"), "Ship the planning editor");
    snapshot = {...snapshot, project: {...snapshot.project, planningDocuments: ["roadmap.md", "plans/gone.md"]}};

    const {resourceLoader} = await createHarnessResources(snapshot);

    const prompt = resourceLoader.getAppendSystemPrompt().join("\n");
    expect(prompt).toContain("Project planning document: roadmap.md\n\nShip the planning editor");
    expect(prompt).not.toContain("gone.md");
  });

  it("rejects context symlinks that escape the project", async () => {
    await symlink(tmpdir(), join(root, "outside"));
    snapshot = {...snapshot, harness: {...snapshot.harness, context: {...snapshot.harness.context, files: ["outside"]}}};
    await expect(createHarnessResources(snapshot)).rejects.toThrow("escapes");
  });

  it("uses each specialist's actual prompt and tools and disposes the child", async () => {
    const dispose = vi.fn();
    const child = {
      bindExtensions: vi.fn(async () => {}),
      prompt: vi.fn(async () => {}),
      agent: {waitForIdle: vi.fn(async () => {})},
      state: {messages: [fauxAssistantMessage("Verified result")]},
      dispose,
    };
    const createAgentSession = vi.fn(async (options: Parameters<PiSdkServiceShape["createAgentSession"]>[0]) => {
      void options;
      return {session: child};
    });
    const sdk = {createAgentSession, modelRuntime: {}} as unknown as PiSdkServiceShape;
    snapshot = {...snapshot, harness: {...snapshot.harness, agents: [{name: "reviewer", description: "Review", systemPrompt: "Only verify evidence", tools: ["read", "grep"]}]}};
    const tool = createHarnessTools(snapshot, sdk)[0]!;
    const result = await tool.execute("call", {agent: "reviewer", task: "Review the evidence"}, undefined, undefined, {} as ExtensionContext);
    expect(createAgentSession).toHaveBeenCalledWith(
      expect.objectContaining({tools: ["read", "grep"], excludeTools: ["subagent", "harness_workflow", "lab_agent", "manage_lab_view", "manage_projects"]})
    );
    const options = createAgentSession.mock.calls[0]![0]!;
    expect(options.resourceLoader?.getSystemPrompt()).toBeUndefined();
    expect(options.resourceLoader?.getAppendSystemPrompt()).toContain("Only verify evidence");
    expect(result.content).toEqual([{type: "text", text: "reviewer\nVerified result"}]);
    expect(dispose).toHaveBeenCalledOnce();
  });

  it("layers global, project, and specialist instructions and filters actual loaded skills", async () => {
    for (const name of ["review-evidence", "write-report"]) {
      await mkdir(join(root, "skills", name), {recursive: true});
      await writeFile(join(root, "skills", name, "SKILL.md"), `---\nname: ${name}\ndescription: Test procedure\n---\nFollow the procedure.`);
    }
    const harness = {
      ...snapshot.harness,
      systemPrompt: "Shared science rules",
      orchestratorPrompt: "HEAD ROLE ONLY",
      skills: [join(root, "skills")],
      enabledSkills: ["review-evidence", "write-report"],
    };
    const project = {...snapshot.project, systemPrompt: "Lab-specific rules"};
    const resolved = resolveHarnessProject(harness, project, 1);
    const resources = await createHarnessResources(resolved, "REVIEWER ROLE", ["review-evidence"]);
    const prompt = resources.resourceLoader.getAppendSystemPrompt().join("\n");
    expect(prompt).toContain("Shared science rules\n\nLab-specific rules");
    expect(prompt).toContain("REVIEWER ROLE");
    expect(prompt).not.toContain("HEAD ROLE ONLY");
    expect(resources.resourceLoader.getSkills().skills.map((skill) => skill.name)).toEqual(["review-evidence"]);
    const none = await createHarnessResources(resolved, "REVIEWER ROLE", []);
    expect(none.resourceLoader.getSkills().skills).toEqual([]);
  });

  it("applies a specialist's effort while inheriting the configured project model", async () => {
    const createAgentSession = vi.fn(async () => ({
      session: {
        bindExtensions: vi.fn(),
        prompt: vi.fn(),
        agent: {waitForIdle: vi.fn()},
        state: {messages: [fauxAssistantMessage("Done")]},
        dispose: vi.fn(),
      },
    }));
    const sdk = {createAgentSession, modelRuntime: {getAvailableSnapshot: () => [selectedPiModel]}} as unknown as PiSdkServiceShape;
    snapshot = {
      ...snapshot,
      harness: {
        ...snapshot.harness,
        execution: {model: {id: selectedPiModel.id, providerId: selectedPiModel.provider}, effort: "low"},
        agents: [{name: "reviewer", description: "Review", systemPrompt: "Verify", tools: ["read"], execution: {effort: "high"}}],
      },
    };
    await createHarnessTools(snapshot, sdk)[0]!.execute("call", {agent: "reviewer", task: "Check"}, undefined, undefined, {} as ExtensionContext);
    expect(createAgentSession).toHaveBeenCalledWith(expect.objectContaining({model: selectedPiModel, thinkingLevel: "high"}));
  });

  it("delegates only to child labs with their own directory and prompts, without leaking the head role", async () => {
    const createAgentSession = vi.fn(async (options: Parameters<PiSdkServiceShape["createAgentSession"]>[0]) => ({
      session: {
        bindExtensions: vi.fn(),
        prompt: vi.fn(),
        agent: {waitForIdle: vi.fn()},
        state: {messages: [fauxAssistantMessage(options?.cwd ?? "")]},
        dispose: vi.fn(),
      },
    }));
    const sdk = {createAgentSession, modelRuntime: {}} as unknown as PiSdkServiceShape;
    const labPath = join(root, "lab");
    await mkdir(labPath);
    const harness = {...snapshot.harness, coordinatorProjectId: "head", systemPrompt: "GLOBAL", orchestratorPrompt: "HEAD ROLE"};
    const lab = {...snapshot.project, id: "lab", parentProjectId: "head", path: labPath, systemPrompt: "LAB RULES", orchestratorPrompt: "LAB ROLE"};
    const head = {...snapshot.project, id: "head", systemPrompt: "HEAD PROJECT"};
    const configuration = new HarnessStore(join(root, "config"));
    await configuration.save({...harness, coordinatorProjectId: undefined}, 0);
    await configuration.saveProject(head, 1);
    await configuration.saveProject(lab, 2);
    await configuration.save(harness, 3);
    const tool = createHarnessTools(await configuration.resolveProject("head"), sdk, undefined, configuration).find((item) => item.name === "lab_agent")!;
    await expect(tool.execute("bad", {projectId: "unrelated", task: "Check"}, undefined, undefined, {} as ExtensionContext)).rejects.toThrow("does not report");
    expect(createAgentSession).not.toHaveBeenCalled();
    await tool.execute("good", {projectId: "lab", task: "Check"}, undefined, undefined, {} as ExtensionContext);
    const options = createAgentSession.mock.calls[0]![0]!;
    expect(options.cwd).toBe(await realpath(labPath));
    const prompt = options.resourceLoader!.getAppendSystemPrompt().join("\n");
    expect(prompt).toContain("GLOBAL\n\nLAB RULES");
    expect(prompt).toContain("LAB ROLE");
    expect(prompt).not.toContain("HEAD ROLE");
    expect(prompt).not.toContain("HEAD PROJECT");
    expect(options.customTools?.map((tool) => tool.name)).toContain("subagent");
    expect(options.customTools?.map((tool) => tool.name)).not.toContain("lab_agent");
  });
});
