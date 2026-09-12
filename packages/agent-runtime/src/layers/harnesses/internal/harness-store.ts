import {createHash, randomUUID} from "node:crypto";
import {mkdir, readFile, readdir, realpath, rename, rmdir, stat, writeFile} from "node:fs/promises";
import {homedir} from "node:os";
import {basename, isAbsolute, join, resolve} from "node:path";
import {getAgentDir, loadSkills, parseFrontmatter} from "@earendil-works/pi-coding-agent";
import {Schema} from "effect";
import {HarnessLibrary, HarnessSnapshot} from "@supernova/contracts/harnesses/schemas";
import type {CurationTarget, HarnessAgent, HarnessConfig, HarnessProject, InstructionVersion} from "@supernova/contracts/harnesses/schemas";
import {createDefaultHarness, normalizeHarnessHierarchy, resolveHarnessProject, validateHarness} from "@supernova/agent-runtime/layers/harnesses/lib/harness-config";

async function optionalText(path: string): Promise<string> {
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return "";
    throw error;
  }
}

async function directory(path: string): Promise<string> {
  const expanded = path.startsWith("~/") ? join(homedir(), path.slice(2)) : path;
  if (!isAbsolute(expanded)) throw new Error("Use an absolute directory path.");
  const canonical = await realpath(expanded);
  if (!(await stat(canonical)).isDirectory()) throw new Error("The selected path is not a directory.");
  return canonical;
}

/** True when the path is an existing directory. A vanished project folder is reported to the UI, not thrown at every reader. */
async function isDirectory(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isDirectory();
  } catch {
    return false;
  }
}

function missingFolderError(path: string): Error {
  return new Error(`The project folder is missing: ${path}. Restore the folder, or remove the project and add it again, before starting a chat.`);
}

/** Keeps an identifier usable as one path segment; project and agent identifiers are already narrow, legacy ones are not. */
function safeSegment(value: string): string {
  const safe = value.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 120);
  if (!safe || safe === "." || safe === "..") throw new Error("Invalid instruction version key.");
  return safe;
}

/** The folder one instruction artefact's history lives in, derived from the target the curator addresses it by. */
export function instructionVersionKey(target: CurationTarget): string {
  switch (target.kind) {
    case "harness":
      return "harness";
    case "context":
      return "context";
    case "project":
      if (!target.projectId) throw new Error("A project instruction version needs a project.");
      return `project-${safeSegment(target.projectId)}`;
    case "role": {
      if (!target.agentName) throw new Error("A role instruction version needs an agent name.");
      const role = `role-${safeSegment(target.agentName)}`;
      return target.projectId ? `project-${safeSegment(target.projectId)}-${role}` : role;
    }
    default:
      throw new Error("Only instruction texts have a version history.");
  }
}

/** Server-owned, revision-checked configuration store. Never writes into imported projects. */
export class HarnessStore {
  private queue: Promise<unknown> = Promise.resolve();
  public constructor(public readonly root: string) {}

  /** Reads persisted configuration or a minimal default library. */
  public async list(): Promise<HarnessLibrary> {
    const contents = await optionalText(join(this.root, "harnesses.json"));
    return normalizeHarnessHierarchy(contents ? Schema.decodeUnknownSync(HarnessLibrary)(JSON.parse(contents)) : {revision: 0, harnesses: [createDefaultHarness()], projects: []});
  }

  /** Marks projects whose folder disappeared so the UI can warn before a chat fails. */
  public async withFolderStatus(library: HarnessLibrary): Promise<HarnessLibrary> {
    const projects = await Promise.all(library.projects.map(async (project) => ((await isDirectory(project.path)) ? project : {...project, folderMissing: true})));
    return {...library, projects};
  }

  /** The library as the UI should see it: persisted configuration plus folder availability. */
  public async describe(): Promise<HarnessLibrary> {
    return this.withFolderStatus(await this.list());
  }

  private async update(expectedRevision: number, mutate: (library: HarnessLibrary) => Promise<HarnessLibrary>): Promise<HarnessLibrary> {
    const operation = this.queue
      .catch(() => undefined)
      .then(async () => {
        await mkdir(this.root, {recursive: true, mode: 0o700});
        // Atomic directory creation also protects against a second app/server process.
        const lock = join(this.root, "harnesses.write-lock");
        try {
          await mkdir(lock, {mode: 0o700});
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code === "EEXIST") throw new Error("Configuration is being saved elsewhere. Wait a moment and retry.");
          throw error;
        }
        try {
          const current = await this.list();
          if (current.revision !== expectedRevision) throw new Error("Configuration changed elsewhere. Reload before saving.");
          const next = normalizeHarnessHierarchy({...(await mutate(current)), revision: current.revision + 1});
          await this.archiveInstructions(current, next);
          const temporary = join(this.root, `harnesses-${randomUUID()}.tmp`);
          await writeFile(temporary, JSON.stringify(next, null, 2), {mode: 0o600});
          await rename(temporary, join(this.root, "harnesses.json"));
          return next;
        } finally {
          await rmdir(lock);
        }
      });
    this.queue = operation;
    return operation;
  }

  private versionDirectory(target: CurationTarget): string {
    return join(this.root, "versions", safeSegment(target.harnessId), instructionVersionKey(target));
  }

  /**
   * Keeps the text every changed instruction artefact had at `current.revision`, so an applied curation or a hand
   * edit can be read back and restored. Unchanged text is never written, and text that was empty has nothing to keep.
   */
  private async archiveInstructions(current: HarnessLibrary, next: HarnessLibrary): Promise<void> {
    const changes: {target: CurationTarget; text: string}[] = [];
    const keep = (target: CurationTarget, before: string, after: string | undefined) => {
      if (before && before !== after) changes.push({target, text: before});
    };
    for (const harness of current.harnesses) {
      const after = next.harnesses.find((item) => item.id === harness.id);
      keep({kind: "harness", harnessId: harness.id}, harness.systemPrompt, after?.systemPrompt);
      keep({kind: "context", harnessId: harness.id}, harness.context.instructions, after?.context.instructions);
      for (const agent of harness.agents) {
        keep({kind: "role", harnessId: harness.id, agentName: agent.name}, agent.systemPrompt, after?.agents.find((item) => item.name === agent.name)?.systemPrompt);
      }
    }
    for (const project of current.projects) {
      const after = next.projects.find((item) => item.id === project.id);
      keep({kind: "project", harnessId: project.harnessId, projectId: project.id}, project.systemPrompt, after?.systemPrompt);
      for (const agent of project.agents) {
        keep(
          {kind: "role", harnessId: project.harnessId, projectId: project.id, agentName: agent.name},
          agent.systemPrompt,
          after?.agents.find((item) => item.name === agent.name)?.systemPrompt
        );
      }
    }
    for (const change of changes) {
      const directory = this.versionDirectory(change.target);
      await mkdir(directory, {recursive: true, mode: 0o700});
      const temporary = join(directory, `${randomUUID()}.tmp`);
      await writeFile(temporary, change.text, {mode: 0o600});
      await rename(temporary, join(directory, `${current.revision}.md`));
    }
  }

  /** The saved previous texts of one instruction artefact, newest first. */
  public async listVersions(target: CurationTarget): Promise<InstructionVersion[]> {
    const directory = this.versionDirectory(target);
    let names: string[];
    try {
      names = await readdir(directory);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw error;
    }
    const versions: InstructionVersion[] = [];
    for (const name of names.filter((name) => /^\d+\.md$/.test(name))) {
      const info = await stat(join(directory, name));
      versions.push({target, revision: Number(name.slice(0, -3)), savedAt: info.mtime.toISOString(), size: info.size});
    }
    return versions.sort((a, b) => b.revision - a.revision);
  }

  /** The exact text one instruction artefact had at the given library revision. */
  public async readVersion(target: CurationTarget, revision: number): Promise<string> {
    if (!Number.isInteger(revision) || revision < 0) throw new Error("A version is addressed by its library revision.");
    try {
      return await readFile(join(this.versionDirectory(target), `${revision}.md`), "utf8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") throw new Error("No saved version of this instruction text at that revision.");
      throw error;
    }
  }

  /** Saves one shared harness without changing any project overrides. */
  public save(harness: HarnessConfig, expectedRevision: number): Promise<HarnessLibrary> {
    validateHarness(harness);
    return this.update(expectedRevision, async (library) => {
      const saved = harness.source ? {...harness, source: {packagePath: await directory(harness.source.packagePath), rootPath: await directory(harness.source.rootPath)}} : harness;
      if (harness.coordinatorProjectId && !library.projects.some((project) => project.id === harness.coordinatorProjectId && project.harnessId === harness.id))
        throw new Error("The head orchestrator must be a project in this harness.");
      for (const project of library.projects.filter((project) => project.harnessId === harness.id)) resolveHarnessProject(harness, project, library.revision);
      for (const path of [...harness.extensions, ...harness.skills]) {
        if (!isAbsolute(path)) throw new Error("Extension and skill paths must be absolute local paths.");
        await stat(path);
      }
      return {
        ...library,
        harnesses: library.harnesses.some((item) => item.id === saved.id) ? library.harnesses.map((item) => (item.id === saved.id ? saved : item)) : [...library.harnesses, saved],
      };
    });
  }

  /** Links a project folder or saves its overrides. Project files remain unchanged. */
  public saveProject(project: HarnessProject, expectedRevision: number): Promise<HarnessLibrary> {
    return this.update(expectedRevision, async (library) => {
      const harness = library.harnesses.find((item) => item.id === project.harnessId);
      if (!harness) throw new Error("Harness not found.");
      if (!/^[a-zA-Z0-9_-]{1,100}$/.test(project.id) || !project.name.trim()) throw new Error("A project needs a valid ID and name.");
      const existing = library.projects.find((item) => item.id === project.id);
      // A linked project stays editable while its folder is unavailable; reassigning the folder is refused below either way.
      const path = existing && !(await isDirectory(existing.path)) ? existing.path : await directory(project.path);
      if (library.projects.some((item) => item.id !== project.id && item.path === path)) throw new Error("This folder is already linked to a harness project.");
      if (existing && (existing.path !== path || existing.harnessId !== project.harnessId)) throw new Error("An existing project's folder and harness cannot be reassigned.");
      const saved = {...project, path};
      resolveHarnessProject(harness, saved, library.revision);
      return {...library, projects: existing ? library.projects.map((item) => (item.id === project.id ? saved : item)) : [...library.projects, saved]};
    });
  }

  /** Unlinks a project. Its folder and files stay on disk; chats already bound to it keep their pinned snapshot. */
  public removeProject(projectId: string, expectedRevision: number): Promise<HarnessLibrary> {
    return this.update(expectedRevision, async (library) => {
      if (!library.projects.some((item) => item.id === projectId)) throw new Error("Harness project not found.");
      const labs = library.projects.filter((item) => item.parentProjectId === projectId).length;
      if (labs) throw new Error(`This project coordinates ${labs === 1 ? "one lab" : `${labs} labs`}. Remove the labs first.`);
      return {
        ...library,
        harnesses: library.harnesses.map((harness) => (harness.coordinatorProjectId === projectId ? {...harness, coordinatorProjectId: undefined} : harness)),
        projects: library.projects.filter((item) => item.id !== projectId),
      };
    });
  }

  /** Grants the head access to its known labs; project leads can change only their own presentation. */
  public updateView(
    actor: HarnessSnapshot,
    change: {projectId: string; name?: string; color?: string; beforeProjectId?: string},
    expectedRevision: number
  ): Promise<HarnessLibrary> {
    return this.update(expectedRevision, async (library) => {
      const currentActor = library.projects.find((item) => item.id === actor.project.id && item.harnessId === actor.harness.id && item.path === actor.project.path);
      const target = library.projects.find((item) => item.id === change.projectId && item.harnessId === actor.harness.id);
      const harness = library.harnesses.find((item) => item.id === actor.harness.id);
      const head = harness?.coordinatorProjectId === currentActor?.id && actor.harness.coordinatorProjectId === actor.project.id;
      const allowed =
        currentActor &&
        target &&
        (target.id === currentActor.id || (head && target.parentProjectId === currentActor.id && actor.delegation?.projects.some((item) => item.id === target.id)));
      if (!allowed || !target || !harness) throw new Error("This lead cannot manage that lab's view.");
      if (change.name !== undefined && (!change.name.trim() || change.name.length > 120)) throw new Error("Use a name between 1 and 120 characters.");
      if (change.color !== undefined && !/^#[0-9a-fA-F]{6}$/.test(change.color)) throw new Error("Use a six-digit hex color.");
      let projects = library.projects.map((item) =>
        item.id === target.id ? {...item, ...(change.name !== undefined && {name: change.name.trim()}), ...(change.color !== undefined && {color: change.color})} : item
      );
      if (change.beforeProjectId !== undefined) {
        if (target.id === harness.coordinatorProjectId) throw new Error("Science Space stays above its labs.");
        const ordered = projects.filter((item) => item.harnessId === harness.id && item.id !== harness.coordinatorProjectId).toSorted((a, b) => (a.order ?? 0) - (b.order ?? 0));
        const others = ordered.filter((item) => item.id !== target.id);
        const index = change.beforeProjectId === "" ? others.length : others.findIndex((item) => item.id === change.beforeProjectId);
        if (index < 0) throw new Error("The destination must be another lab in this harness, or empty for the end.");
        others.splice(index, 0, projects.find((item) => item.id === target.id)!);
        projects = projects.map((item) => {
          const order = others.findIndex((lab) => lab.id === item.id);
          return order < 0 ? item : {...item, order};
        });
      }
      return {...library, projects};
    });
  }

  /** Imports the local Science Pi package and lab folders as an independent configuration. */
  public importScience(packagePath: string, rootPath: string, expectedRevision: number): Promise<HarnessLibrary> {
    return this.update(expectedRevision, async (library) => {
      if (library.harnesses.some((item) => item.id === "science")) throw new Error("Science Pi is already imported; its configuration has not been overwritten.");
      const source = {packagePath: await directory(packagePath), rootPath: await directory(rootPath)};
      const manifest = JSON.parse(await readFile(join(source.packagePath, "package.json"), "utf8"));
      if (manifest.name !== "pi-scientific-tools") throw new Error("Select the pi-scientific-tools package directory.");
      const agents: HarnessAgent[] = [];
      for (const entry of (await readdir(join(source.packagePath, "agents"))).filter((name) => name.endsWith(".md")).sort()) {
        const {frontmatter, body} = parseFrontmatter<Record<string, unknown>>(await readFile(join(source.packagePath, "agents", entry), "utf8"));
        if (typeof frontmatter.name !== "string" || typeof frontmatter.description !== "string") continue;
        const tools = Array.isArray(frontmatter.tools) ? frontmatter.tools : typeof frontmatter.tools === "string" ? frontmatter.tools.split(",") : [];
        agents.push({
          name: frontmatter.name,
          description: frontmatter.description,
          systemPrompt: body,
          tools: tools.filter((tool): tool is string => typeof tool === "string").map((tool) => tool.trim()),
        });
      }
      const harness: HarnessConfig = {
        ...createDefaultHarness("science", "Science Pi"),
        source,
        agents,
        description: "Scientific research, evidence, literature, memory, and Idea Graph tools. Imported from your local Science Pi setup.",
        systemPrompt: await readFile(join(source.packagePath, "APPEND_SYSTEM.md"), "utf8"),
        // The app supplies isolated specialists in place of the package's CLI subprocess tool.
        extensions: (manifest.pi.extensions as string[]).filter((path) => !path.includes("/subagent/")).map((path) => resolve(source.packagePath, path)),
        skills: [join(source.packagePath, "skills")],
        graph: {steps: ["research-architect", "methodologist", "source-verifier", "scientific-synthesizer"].filter((name) => agents.some((agent) => agent.name === name))},
      };
      validateHarness(harness);
      const labEntries = await readdir(join(source.rootPath, "labs"), {withFileTypes: true});
      const folders = [
        {name: "Science Space", path: source.rootPath},
        ...labEntries.filter((entry) => entry.isDirectory()).map((entry) => ({name: entry.name, path: join(source.rootPath, "labs", entry.name)})),
      ];
      const projects: HarnessProject[] = [];
      for (const folder of folders) {
        if (library.projects.some((project) => project.path === folder.path)) continue;
        projects.push({
          id: randomUUID(),
          harnessId: "science",
          ...folder,
          agents: [],
          contextInstructions: "",
          systemPrompt: await optionalText(join(folder.path, ".pi", "APPEND_SYSTEM.md")),
        });
      }
      return {...library, harnesses: [...library.harnesses, harness], projects: [...library.projects, ...projects]};
    });
  }

  /** Resolves the exact configuration to capture when a new chat is created. */
  public async resolveProject(projectId: string): Promise<HarnessSnapshot> {
    const library = await this.list();
    const project = library.projects.find((item) => item.id === projectId);
    const harness = library.harnesses.find((item) => item.id === project?.harnessId);
    if (!project || !harness) throw new Error("Harness project not found.");
    if (!(await isDirectory(project.path))) throw missingFolderError(project.path);
    await directory(project.path);
    const snapshot = resolveHarnessProject(harness, project, library.revision);
    return harness.coordinatorProjectId === project.id
      ? {...snapshot, delegation: {harness, projects: library.projects.filter((item) => item.parentProjectId === project.id)}}
      : snapshot;
  }

  /** Lists the same explicitly connected skills used by runtime agents. */
  public async listSkills(harnessId: string) {
    const harness = (await this.list()).harnesses.find((item) => item.id === harnessId);
    if (!harness) throw new Error("Harness not found.");
    return loadSkills({cwd: harness.source?.rootPath ?? this.root, agentDir: getAgentDir(), skillPaths: [...harness.skills], includeDefaults: false}).skills;
  }

  /** Gives pre-existing sidebar folders the Coding defaults for newly created chats. */
  public async resolveNewSession(projectPath: string): Promise<HarnessSnapshot> {
    const path = await directory(projectPath);
    const library = await this.list();
    const linked = library.projects.find((item) => item.path === path);
    if (linked) return this.resolveProject(linked.id);
    const project = library.projects.find((item) => item.path === path) ?? {
      id: `legacy-${createHash("sha256").update(path).digest("hex").slice(0, 24)}`,
      harnessId: "coding",
      name: basename(path),
      path,
      systemPrompt: "",
      contextInstructions: "",
      agents: [],
    };
    const harness = library.harnesses.find((item) => item.id === project.harnessId);
    if (!harness) throw new Error("Harness not found.");
    return resolveHarnessProject(harness, project, library.revision);
  }

  /** Pins a chat to a configuration snapshot; editing defaults cannot silently retarget it. */
  public async bindSession(sessionId: string, snapshot: HarnessSnapshot): Promise<void> {
    if (!/^[a-zA-Z0-9_-]+$/.test(sessionId)) throw new Error("Invalid session ID.");
    const path = join(this.root, "sessions");
    await mkdir(path, {recursive: true, mode: 0o700});
    await writeFile(join(path, `${sessionId}.json`), JSON.stringify(snapshot), {flag: "wx", mode: 0o600});
  }

  /** Distinguishes a saved chat snapshot from a legacy chat using current defaults. */
  public async hasSnapshot(sessionId: string): Promise<boolean> {
    if (!/^[a-zA-Z0-9_-]+$/.test(sessionId)) throw new Error("Invalid session ID.");
    return Boolean(await optionalText(join(this.root, "sessions", `${sessionId}.json`)));
  }

  /** The project a chat was pinned to, without the folder checks a full snapshot read performs. */
  public async projectOfSession(sessionId: string): Promise<{id: string; path: string} | undefined> {
    if (!/^[a-zA-Z0-9_-]+$/.test(sessionId)) throw new Error("Invalid session ID.");
    const saved = await optionalText(join(this.root, "sessions", `${sessionId}.json`));
    if (!saved) return undefined;
    const snapshot = Schema.decodeUnknownSync(HarnessSnapshot)(JSON.parse(saved));
    return {id: snapshot.project.id, path: snapshot.project.path};
  }

  /** Loads a chat's pinned configuration, or current defaults for an imported legacy chat. */
  public async forSession(sessionId: string, cwd: string): Promise<HarnessSnapshot | undefined> {
    if (!/^[a-zA-Z0-9_-]+$/.test(sessionId)) throw new Error("Invalid session ID.");
    const saved = await optionalText(join(this.root, "sessions", `${sessionId}.json`));
    if (saved) {
      const snapshot = Schema.decodeUnknownSync(HarnessSnapshot)(JSON.parse(saved));
      if ((await realpath(snapshot.project.path)) !== (await realpath(cwd))) throw new Error("Session does not belong to its harness project.");
      return snapshot;
    }
    const library = await this.list();
    let canonical: string;
    try {
      canonical = library.projects.length ? await directory(cwd) : resolve(cwd);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
      throw error;
    }
    const project = library.projects.find((item) => item.path === canonical);
    return project ? this.resolveProject(project.id) : undefined;
  }
}

export const harnessStore = new HarnessStore(join(homedir(), ".config", "pi-plus"));
