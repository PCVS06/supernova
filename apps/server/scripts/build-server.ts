import {cp, mkdir, mkdtemp, readFile, realpath, rename, rm} from "node:fs/promises";
import {dirname, join, relative, resolve, sep} from "node:path";

const serverRoot = resolve(import.meta.dirname, "..");
const runtimeRoot = resolve(serverRoot, "../../packages/agent-runtime");
const externalPackages = ["@earendil-works/pi-coding-agent", "@earendil-works/pi-ai", "@earendil-works/pi-agent-core", "@earendil-works/pi-tui", "typebox"];

/** Resolves installed package directories without depending on package.json export conditions. */
async function packageDirectory(name: string, from: string): Promise<string> {
  for (let directory = from; ; directory = dirname(directory)) {
    const candidate = join(directory, "node_modules", name);
    try {
      await readFile(join(candidate, "package.json"));
      return await realpath(candidate);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    if (dirname(directory) === directory) throw Object.assign(new Error(`Missing runtime dependency: ${name}`), {code: "ENOENT"});
  }
}

/** Copies the locked dependency graph as real files, preserving version conflicts and ancestor resolution. */
async function copyRuntime(destination: string): Promise<void> {
  const copied = new Map<string, string>();
  const queue: {source: string; target: string}[] = [];
  const add = async (name: string, source: string, parent: string) => {
    for (let directory = parent; directory.startsWith(destination); directory = dirname(directory)) {
      const existing = copied.get(join(directory, "node_modules", name));
      if (existing) {
        if (existing === source) return;
        break;
      }
    }
    const target = join(parent, "node_modules", name);
    if (copied.has(target)) throw new Error(`Conflicting runtime dependency: ${name}`);
    copied.set(target, source);
    queue.push({source, target});
    await mkdir(dirname(target), {recursive: true});
    await cp(source, target, {recursive: true, dereference: true, filter: (path) => !relative(source, path).split(sep).includes("node_modules")});
  };
  const sdk = await packageDirectory("@earendil-works/pi-coding-agent", runtimeRoot);
  for (const name of externalPackages) {
    const source = await packageDirectory(name, name === "typebox" ? runtimeRoot : sdk);
    await add(name, source, destination);
  }
  for (let index = 0; index < queue.length; index++) {
    const {source, target} = queue[index]!;
    const manifest = JSON.parse(await readFile(join(source, "package.json"), "utf8"));
    const required = manifest.dependencies ?? {};
    const optional = {...manifest.peerDependencies, ...manifest.optionalDependencies};
    for (const name of Object.keys({...required, ...optional})) {
      let dependency: string;
      try {
        dependency = await packageDirectory(name, source);
      } catch (error) {
        if (name in optional && (error as NodeJS.ErrnoException).code === "ENOENT") continue;
        throw error;
      }
      await add(name, dependency, target);
    }
  }
}

/** Builds a relocatable Node server. Pi stays on disk because its extension loader resolves SDK files dynamically. */
export async function buildServer(outdir = join(serverRoot, "dist")): Promise<void> {
  const output = resolve(outdir);
  await mkdir(output, {recursive: true});
  const staging = await mkdtemp(join(output, ".runtime-stage-"));
  try {
    await copyRuntime(staging);
    const result = await Bun.build({entrypoints: [join(serverRoot, "src/cli.ts")], target: "node", outdir: staging, external: externalPackages});
    if (!result.success) throw new AggregateError(result.logs, "Server build failed");
    await rm(join(output, "node_modules"), {recursive: true, force: true});
    await rename(join(staging, "node_modules"), join(output, "node_modules"));
    await rename(join(staging, "cli.js"), join(output, "cli.js"));
  } finally {
    await rm(staging, {recursive: true, force: true});
  }
}

if (import.meta.main) await buildServer();
