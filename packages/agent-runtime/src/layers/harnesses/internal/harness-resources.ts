import {readFile, realpath, stat} from "node:fs/promises";
import {basename, dirname, isAbsolute, join, relative, sep} from "node:path";
import {DefaultResourceLoader, getAgentDir, SettingsManager} from "@earendil-works/pi-coding-agent";
import type {HarnessMemoryResult, HarnessResourceResult} from "@supernova/contracts/harnesses/procedures";
import {HarnessStore, harnessStore} from "@supernova/agent-runtime/layers/harnesses/internal/harness-store";

async function resourceScope(store: HarnessStore, harnessId: string, projectId?: string) {
  const library = await store.list();
  const harness = library.harnesses.find((item) => item.id === harnessId);
  if (!harness) throw new Error("Harness not found.");
  const project = library.projects.find((item) => item.id === (projectId ?? harness.coordinatorProjectId) && item.harnessId === harnessId);
  if (projectId && !project) throw new Error("Project is not part of this harness.");
  return {library, harness, project};
}

const catalogue = new Map<string, {until: number; value: Promise<HarnessResourceResult>}>();
/** Registers configured extensions to inspect their actual tools. Never invokes a tool, model or command. */
export async function getHarnessResources(harnessId: string, projectId?: string, store = harnessStore): Promise<HarnessResourceResult> {
  const {library, harness, project} = await resourceScope(store, harnessId, projectId);
  const key = JSON.stringify([store.root, library.revision, harnessId, project?.id]);
  const cached = catalogue.get(key);
  if (cached && cached.until > Date.now()) return cached.value;
  const value = (async () => {
    const settingsManager = SettingsManager.inMemory({});
    settingsManager.setProjectTrusted(true);
    const loader = new DefaultResourceLoader({
      cwd: project?.path ?? harness.source?.rootPath ?? store.root,
      agentDir: getAgentDir(),
      settingsManager,
      noExtensions: true,
      noSkills: true,
      noPromptTemplates: true,
      noThemes: true,
      noContextFiles: true,
      additionalExtensionPaths: [...harness.extensions],
      systemPromptOverride: () => undefined,
      appendSystemPromptOverride: () => [],
    });
    await loader.reload();
    const loaded = loader.getExtensions();
    const extensions = loaded.extensions.map((extension) => ({
      name: basename(extension.path).startsWith("index.") ? basename(dirname(extension.path)) : basename(extension.path),
      toolCount: extension.tools.size,
      commands: [...extension.commands.keys()],
      loaded: true,
    }));
    const tools = loaded.extensions.flatMap((extension, index) =>
      [...extension.tools.values()].map(({definition}) => ({name: definition.name, description: definition.description, group: extensions[index]!.name}))
    );
    for (const error of loaded.errors) extensions.push({name: basename(dirname(error.path)), toolCount: 0, commands: [], loaded: false});
    if (harness.agents.length)
      tools.push(
        {name: "subagent", description: "Delegate bounded work to configured specialists.", group: "pi+ orchestration"},
        {name: "harness_workflow", description: "Run the configured specialist handoff sequence explicitly.", group: "pi+ orchestration"}
      );
    if (project) tools.push({name: "manage_lab_view", description: "Manage permitted project names, colors and ordering in the sidebar.", group: "pi+ orchestration"});
    if (project?.id === harness.coordinatorProjectId)
      tools.push({name: "lab_agent", description: "Delegate a task from Science Space to a project lead.", group: "pi+ orchestration"});
    const warnings = loaded.errors.map(() => "An extension failed to register. Its tools are not available.");
    if (project) {
      for (const file of project.planningDocuments ?? []) {
        // A configured plan that is gone is skipped when the agent starts, so it is reported here instead of failing the chat.
        if (!(await stat(join(project.path, file)).catch(() => undefined))) warnings.push(`Planning document ${file} is missing. Agents run without it.`);
      }
    }
    return {tools, extensions, warnings};
  })();
  catalogue.set(key, {until: Date.now() + 30000, value});
  if (catalogue.size > 30) catalogue.delete(catalogue.keys().next().value!);
  try {
    return await value;
  } catch (error) {
    catalogue.delete(key);
    throw error;
  }
}

/** Read-only view of the project's append-only scientific ledger. Does not create or rebuild memory files. */
export async function getHarnessMemory(harnessId: string, projectId?: string, store = harnessStore): Promise<HarnessMemoryResult> {
  const {harness, project} = await resourceScope(store, harnessId, projectId);
  const empty = {projectName: project?.name ?? harness.name, available: false, total: 0, rejected: 0, records: []};
  if (!project) return empty;
  let root: string;
  try {
    root = await realpath(project.path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return {...empty, unavailableReason: "workspace-missing"};
    throw error;
  }
  let file: string;
  try {
    file = await realpath(join(root, ".science-memory", "ledger.jsonl"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return empty;
    throw error;
  }
  const rel = relative(root, file);
  if (rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel)) throw new Error("Memory path escapes this project.");
  if ((await stat(file)).size > 8_000_000) throw new Error("This memory ledger is too large for the current viewer.");
  const latest = new Map<string, HarnessMemoryResult["records"][number]>();
  let rejected = 0;
  for (const line of (await readFile(file, "utf8")).split("\n")) {
    if (!line.trim()) continue;
    try {
      const event = JSON.parse(line);
      const record = event.record;
      if (
        event.schemaVersion !== 1 ||
        !record ||
        ![record.recordId, record.statement, record.kind, record.epistemicState, record.updatedAt].every((value) => typeof value === "string")
      )
        throw new Error();
      latest.set(record.recordId, {
        id: record.recordId,
        statement: record.statement.slice(0, 8000),
        kind: record.kind,
        state: record.epistemicState,
        updatedAt: record.updatedAt,
        evidence: Array.isArray(record.evidence)
          ? record.evidence
              .filter((item: {ref?: unknown}) => typeof item?.ref === "string")
              .slice(0, 20)
              .map((item: {ref: string}) => item.ref.slice(0, 1000))
          : [],
      });
    } catch {
      rejected++;
    }
  }
  return {...empty, available: true, total: latest.size, rejected, records: [...latest.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 200)};
}
