import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import {mkdtempSync, mkdirSync, writeFileSync} from "node:fs";
import {createRequire} from "node:module";
import {tmpdir} from "node:os";
import {join, resolve} from "node:path";

// Run from the repository root after package:desktop. The production main/preload
// bundles are unchanged; this bootstrap only isolates Electron's profile folder.
const root = process.cwd();
const webRequire = createRequire(join(root, "packages/web/package.json"));
const desktopRequire = createRequire(join(root, "apps/desktop/package.json"));
const {_electron, expect} = webRequire("@playwright/test");
const sandbox = mkdtempSync(join(tmpdir(), "radian-desktop-recovery-"));
const profile = join(sandbox, "profile");
const data = join(sandbox, "data");
const projectPath = join(sandbox, "project");
for (const directory of [profile, data, projectPath]) mkdirSync(directory, {recursive: true});
const agentDirectory = join(data, "userdata", "agent");
mkdirSync(agentDirectory, {recursive: true});
// A local-only test model enables the editor; this check never sends a prompt.
writeFileSync(
  join(agentDirectory, "models.json"),
  JSON.stringify({
    providers: {
      "recovery-fixture": {
        api: "openai-completions",
        apiKey: "local-test-key",
        baseUrl: "http://127.0.0.1:9",
        models: [{id: "recovery-fixture", name: "Recovery test model", contextWindow: 32000, maxTokens: 1000}],
      },
    },
  })
);
const bootstrap = join(sandbox, "bootstrap.cjs");
writeFileSync(
  bootstrap,
  `const {app} = require("electron");\napp.setPath("appData", ${JSON.stringify(profile)});\nrequire(${JSON.stringify(join(root, "apps/desktop/out/main/index.js"))});\n`
);
const output = resolve("docs/qa/radian-2026-09-15-refinement");
const application = await _electron.launch({
  executablePath: desktopRequire("electron"),
  args: [bootstrap],
  env: {...process.env, SUPERNOVA_HOME: data, PI_OFFLINE: "1"},
  timeout: 60_000,
});
try {
  const page = await application.firstWindow();
  page.setDefaultTimeout(20_000);
  await expect(page.getByLabel("Connection status")).toHaveCount(0);
  const desktop = await page.evaluate(async () => ({url: window.desktopApi.serverUrl, data: window.desktopApi.dataDirectory, state: await window.desktopApi.getServerState()}));
  assert.equal(desktop.data, data);
  assert.equal(desktop.state.status, "running");
  const mainPid = application.process().pid;
  const port = new URL(desktop.url).port;
  const childPid = Number(execFileSync("lsof", ["-t", `-iTCP:${port}`, "-sTCP:LISTEN"], {encoding: "utf8"}).trim());
  assert.equal(Number(execFileSync("ps", ["-o", "ppid=", "-p", String(childPid)], {encoding: "utf8"}).trim()), mainPid);
  const id = Buffer.from(encodeURIComponent(projectPath)).toString("base64").replaceAll("=", "");
  await page.evaluate(
    ({id, projectPath}) => {
      localStorage.setItem(
        "supernova-projects",
        JSON.stringify({
          state: {projects: [{addedAt: new Date().toISOString(), id, name: "Recovery acceptance", path: projectPath, pinned: false, pinnedSessionIds: []}]},
          version: 0,
        })
      );
    },
    {id, projectPath}
  );
  await page.goto(`supernova://app/session/new?projectId=${encodeURIComponent(id)}`);
  const editor = page.locator('[contenteditable="true"]').first();
  await expect(editor).toBeVisible();
  await editor.fill("Keep this desktop recovery draft");
  const beforeUrl = page.url();
  const marker = await page.evaluate(() => {
    window.recoveryMarker = crypto.randomUUID();
    return window.recoveryMarker;
  });
  process.kill(childPid, "SIGKILL");
  await expect(page.getByLabel("Connection status")).toContainText("Local agent interrupted");
  await expect(editor).toHaveText("Keep this desktop recovery draft");
  await page.screenshot({path: join(output, "desktop-interrupted.png")});
  await page.getByRole("button", {name: "Restart local agent", exact: true}).click();
  await expect(page.getByLabel("Connection status")).toHaveCount(0);
  assert.equal(page.url(), beforeUrl);
  assert.equal(await page.evaluate(() => window.recoveryMarker), marker);
  assert.equal(await page.evaluate(() => window.desktopApi.serverUrl), desktop.url);
  assert.equal((await fetch(`${desktop.url}/health`)).status, 200);
  await expect(editor).toHaveText("Keep this desktop recovery draft");
  await page.screenshot({path: join(output, "desktop-recovered.png")});
  console.log(JSON.stringify({passed: true, sandbox, endpoint: desktop.url, unchangedRenderer: true, draftPreserved: true}));
} finally {
  await application.close();
}
