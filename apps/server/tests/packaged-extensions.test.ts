import {expect, test} from "bun:test";
import {execFile} from "node:child_process";
import {cp, mkdir, mkdtemp, rm, writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join, resolve} from "node:path";
import {promisify} from "node:util";

const execFilePromise = promisify(execFile);

test("relocated server loads TypeScript extensions and legacy Pi aliases under Node", async () => {
  const root = await mkdtemp(join(tmpdir(), "pi-plus-packaged-extension-"));
  const source = process.env.PI_PLUS_PACKAGE_TEST_SOURCE ?? resolve(import.meta.dirname, "../dist");
  const server = join(root, "server");
  try {
    await cp(source, server, {recursive: true});
    await mkdir(join(root, "extension"));
    const extension = join(root, "extension", "index.ts");
    await writeFile(
      extension,
      `
      import {Type} from "@sinclair/typebox";
      import {truncateHead} from "@mariozechner/pi-coding-agent";
      export default function (pi: any) {
        pi.registerTool({name: "packaged_probe", label: "Probe", description: truncateHead("Probe").content,
          parameters: Type.Object({query: Type.String()}),
          async execute() {return {content: [{type: "text", text: "ok"}]};}
        });
      }
    `
    );
    const probe = join(server, "extension-probe.mjs");
    await writeFile(
      probe,
      `
      import {DefaultResourceLoader, SettingsManager} from "@earendil-works/pi-coding-agent";
      const settingsManager = SettingsManager.inMemory({});
      settingsManager.setProjectTrusted(true);
      const loader = new DefaultResourceLoader({cwd: ${JSON.stringify(root)}, agentDir: ${JSON.stringify(join(root, "agent"))},
        settingsManager, noExtensions: true, noSkills: true, noPromptTemplates: true, noThemes: true, noContextFiles: true,
        additionalExtensionPaths: [${JSON.stringify(extension)}]});
      await loader.reload();
      const result = loader.getExtensions();
      console.log(JSON.stringify({errors: result.errors.map(e => e.error), tools: result.extensions.flatMap(e => [...e.tools.keys()])}));
      if (result.errors.length || !result.extensions.some(e => e.tools.has("packaged_probe"))) process.exitCode = 1;
    `
    );
    const {stdout} = await execFilePromise(Bun.which("node") ?? "node", [probe], {
      cwd: root,
      env: {...process.env, NODE_PATH: "", PI_OFFLINE: "1"},
      timeout: 20000,
      maxBuffer: 16000,
    });
    expect(JSON.parse(stdout.trim())).toEqual({errors: [], tools: ["packaged_probe"]});
  } finally {
    await rm(root, {recursive: true, force: true});
  }
}, 60000);
