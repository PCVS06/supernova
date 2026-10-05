import {existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync} from "node:fs";
import {join} from "node:path";
import {randomUUID} from "node:crypto";
import {expect, test} from "@playwright/test";
import type {Page} from "@playwright/test";
import {createRpcClient} from "@/rpc/transport/client";

const root = process.env.SUPERNOVA_E2E_ROOT!;

async function openProject(page: Page) {
  const path = join(root, "projects", randomUUID());
  mkdirSync(path, {recursive: true});
  const projectId = Buffer.from(encodeURIComponent(path)).toString("base64").replaceAll("=", "");
  await page.addInitScript(
    ({projectId, path}) => {
      localStorage.setItem("supernova-projects", JSON.stringify({state: {projects: [{id: projectId, path, name: "Setup test", addedAt: new Date().toISOString()}]}, version: 0}));
    },
    {projectId, path}
  );
  await page.goto(`/session/new?projectId=${encodeURIComponent(projectId)}`);
  await expect(page.getByRole("button", {name: "Chat settings"})).toBeEnabled();
  return path;
}

async function chooseMode(page: Page, mode: string) {
  await page.getByRole("button", {name: "Chat settings"}).click();
  await page.getByRole("menuitem", {name: "Team", exact: true}).click();
  await page.getByRole("menuitemradio", {name: mode, exact: true}).click();
  await expect(page.getByRole("button", {name: "Chat settings"})).toHaveAttribute("title", new RegExp(` · ${mode} · `));
}

async function send(page: Page, text: string) {
  await page.locator('[contenteditable="true"]').first().fill(text);
  await page.getByRole("button", {name: "Send message", exact: true}).click();
  await expect(page).toHaveURL(/\/session\/(?!new)[^?]+/);
}

async function settled(page: Page, text: string) {
  await expect(page.getByText(`Runtime response: ${text}`, {exact: true})).toBeVisible();
  await expect(page.getByRole("group", {name: "Message composer", exact: true})).toHaveAttribute("data-stream-status", "idle");
}

test.use({contextOptions: {reducedMotion: "reduce"}});

test("selects a new-chat preset, changes saved harnesses, and preserves transcript and workspace", async ({page}, testInfo) => {
  const path = await openProject(page);
  const client = createRpcClient(`http://127.0.0.1:${process.env.PLAYWRIGHT_RUNTIME_PORT ?? 4318}`);
  try {
    await chooseMode(page, "Compare");
    await send(page, "Compare two plans");
    await settled(page, "Compare two plans");
    const sessionId = new URL(page.url()).pathname.split("/")[2]!;
    const runs = await client.run((rpc) => rpc.listWorkflowRuns({sessionId}));
    expect(runs).toHaveLength(1);
    expect(runs[0]).toMatchObject({workflowId: "radian-collaboration", status: "completed", stepCount: 2});
    const library = await client.run((rpc) => rpc.getHarnessLibrary({}));
    const source = library.harnesses.find((item) => item.id === "coding")!;
    const harness = {...source, id: `alternate-${randomUUID()}`, name: "Alternate test", systemPrompt: "Alternate setup marker", agents: [], workflows: [], graph: {steps: []}};
    await client.run((rpc) => rpc.saveHarness({harness, expectedRevision: library.revision}));
    await page.reload();
    await page.locator('[contenteditable="true"]').first().fill("Keep this draft");
    await page.getByRole("button", {name: "Chat settings"}).click();
    await page.getByRole("menuitem", {name: "Harness", exact: true}).click();
    await page.getByRole("menuitemradio", {name: "Alternate test", exact: true}).click();
    await expect(page.locator('[contenteditable="true"]').first()).toHaveText("Keep this draft");
    await expect(page.locator('[contenteditable="true"]').first()).toBeFocused();
    await chooseMode(page, "Solo");
    await send(page, "Continue with another setup");
    await settled(page, "Continue with another setup");
    await page.reload();
    await expect(page.getByRole("button", {name: "Chat settings"})).toHaveAttribute("title", /Alternate test · Solo ·/);
    const session = await client.run((rpc) => rpc.getSession({sessionId}));
    expect(realpathSync(session.projectPath)).toBe(realpathSync(path));
    expect(session.turns).toHaveLength(2);
    const context = await client.run((rpc) => rpc.getChatHarness({sessionId}));
    expect(context.snapshot?.harness.id).toBe(harness.id);
    expect(context.runtime?.systemPrompt).toContain("Alternate setup marker");
    expect(context.runtime?.tools).toContain("bash");
    const controls = await client.run((rpc) => rpc.getSessionControls({sessionId}));
    const expectedSelectionId = controls.harness!.id;
    await client.run((rpc) => rpc.updateSessionControls({sessionId, action: {type: "pause_queue"}}));
    const pending = await client.run((rpc) => rpc.updateSessionControls({sessionId, action: {type: "set_harness", harnessId: harness.id, mode: "advisor", expectedSelectionId}}));
    await expect(
      client.run((rpc) => rpc.updateSessionControls({sessionId, action: {type: "set_harness", harnessId: harness.id, mode: "compare", expectedSelectionId}}))
    ).rejects.toThrow("The chat setup changed");
    await client.run((rpc) => rpc.updateSessionControls({sessionId, action: {type: "cancel_harness_change", expectedSelectionId: pending.pendingHarness!.id}}));
    await page.reload();
    await page.getByRole("button", {name: "Chat settings"}).click();
    await expect(page.getByRole("menu")).toHaveCSS("opacity", "1");
    await page.screenshot({animations: "disabled", path: testInfo.outputPath("harness-setup.png")});
    await page.keyboard.press("Escape");
    await page.setViewportSize({width: 800, height: 750});
    await page.getByRole("button", {name: "Chat settings"}).click();
    await page.getByRole("menuitem", {name: "Team", exact: true}).click();
    await expect(page.getByRole("menuitemradio", {name: "Fuse", exact: true})).toBeVisible();
    await expect(page.getByRole("menu")).toHaveCSS("opacity", "1");
    await page.screenshot({animations: "disabled", path: testInfo.outputPath("harness-setup-narrow.png")});
  } finally {
    await client.dispose();
  }
});

test("defers a running-chat change, survives reload, and runs all document Fuse stages", async ({page}) => {
  await openProject(page);
  const client = createRpcClient(`http://127.0.0.1:${process.env.PLAYWRIGHT_RUNTIME_PORT ?? 4318}`);
  const control = join(root, "control");
  try {
    await send(page, "Harness switching during answer");
    await expect.poll(() => existsSync(join(control, "started-harness-switching"))).toBe(true);
    await chooseMode(page, "Fuse");
    await expect(page.getByRole("button", {name: "Chat settings"})).toContainText("Next");
    const sessionId = new URL(page.url()).pathname.split("/")[2]!;
    expect(await client.run((rpc) => rpc.listWorkflowRuns({sessionId}))).toHaveLength(0);
    await page.reload();
    await expect(page.getByRole("button", {name: "Chat settings"})).toHaveAttribute("title", / · Fuse · /);
    await page.locator('[contenteditable="true"]').first().fill("Synthesize a project plan");
    await page.getByRole("button", {name: "Queue next", exact: true}).click();
    await expect(page.locator('[contenteditable="true"]').first()).toHaveText("");
    writeFileSync(join(control, "release-harness-switching"), "");
    await settled(page, "Synthesize a project plan");
    await expect(page.getByText("Runtime response: Harness switching during answer", {exact: true})).toBeVisible();
    const runs = await client.run((rpc) => rpc.listWorkflowRuns({sessionId}));
    expect(runs).toHaveLength(1);
    const run = await client.run((rpc) => rpc.getWorkflowRun({sessionId, runId: runs[0]!.id}));
    expect(run.steps.map((step) => step.stepId)).toEqual(["proposal-a", "proposal-b", "critic", "synthesizer"]);
    expect(run.status).toBe("completed");
    await expect(page.locator("[data-workflow-run]")).toHaveCount(1);
    await expect(page.locator("[data-workflow-run]")).toContainText("4/4 complete");
    expect(Object.keys(run.steps[0]!.input.reads as object)).toHaveLength(0);
    expect(Object.keys(run.steps[1]!.input.reads as object)).toHaveLength(0);
    expect(Object.keys(run.steps[3]!.input.reads as object)).toEqual(["proposal-a", "proposal-b", "critic"]);
    const context = await client.run((rpc) => rpc.getChatHarness({sessionId}));
    expect(context.runtime?.tools.toSorted()).toEqual(["find", "grep", "ls", "read", "web_fetch"]);
    const steps = readFileSync(join(control, "collaboration-steps.jsonl"), "utf8")
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
    for (const step of steps) expect(step.tools.toSorted()).toEqual(["find", "grep", "ls", "read", "web_fetch"]);
    await expect(page.getByRole("button", {name: "Chat settings"})).not.toContainText("Next");
  } finally {
    writeFileSync(join(control, "release-harness-switching"), "");
    await client.dispose();
  }
});

test("keeps the draft and original harness when replacement resources cannot load", async ({page}) => {
  await openProject(page);
  await send(page, "Original setup works");
  await settled(page, "Original setup works");
  const client = createRpcClient(`http://127.0.0.1:${process.env.PLAYWRIGHT_RUNTIME_PORT ?? 4318}`);
  try {
    const sessionId = new URL(page.url()).pathname.split("/")[2]!;
    const library = await client.run((rpc) => rpc.getHarnessLibrary({}));
    const source = library.harnesses.find((item) => item.id === "coding")!;
    const harness = {...source, id: `broken-${randomUUID()}`, name: "Broken test", context: {...source.context, files: ["missing-required-context.md"]}};
    await client.run((rpc) => rpc.saveHarness({harness, expectedRevision: library.revision}));
    await page.reload();
    await page.getByRole("button", {name: "Chat settings"}).click();
    await page.getByRole("menuitem", {name: "Harness", exact: true}).click();
    await page.getByRole("menuitemradio", {name: "Broken test", exact: true}).click();
    await send(page, "Retain this request");
    await expect(page.locator('[contenteditable="true"]').first()).toHaveText("Retain this request");
    const context = await client.run((rpc) => rpc.getChatHarness({sessionId}));
    expect(context.snapshot?.harness.id).toBe("coding");
    await page.getByRole("button", {name: "Chat settings"}).click();
    await page.getByRole("menuitem", {name: "Cancel setup change", exact: true}).click();
    await send(page, "Retain this request");
    await settled(page, "Retain this request");
    expect((await client.run((rpc) => rpc.getSession({sessionId}))).turns).toHaveLength(2);
  } finally {
    await client.dispose();
  }
});

test("a malformed advisor result fails visibly instead of silently answering Solo", async ({page}) => {
  await openProject(page);
  await chooseMode(page, "Advisor");
  await send(page, "Malformed collaboration output");
  await expect(page.getByText("The collaboration did not complete. Inspect its recorded run before retrying or switching to Solo.", {exact: false}).first()).toBeVisible();
  await expect(page.getByText("Runtime response: Malformed collaboration output", {exact: true})).toHaveCount(0);
});

test("Stop cancels the collaboration workers and allows a subsequent Solo turn", async ({page}) => {
  await openProject(page);
  await chooseMode(page, "Advisor");
  const client = createRpcClient(`http://127.0.0.1:${process.env.PLAYWRIGHT_RUNTIME_PORT ?? 4318}`);
  try {
    await send(page, "Hold collaboration for cancellation");
    await expect.poll(() => existsSync(join(root, "control", "started-collaboration"))).toBe(true);
    await page.getByRole("button", {name: "Stop streaming", exact: true}).click();
    const sessionId = new URL(page.url()).pathname.split("/")[2]!;
    await expect.poll(async () => (await client.run((rpc) => rpc.listWorkflowRuns({sessionId})))[0]?.status).toBe("cancelled");
    const workers = await client.run((rpc) => rpc.listHarnessRuns({sessionId}));
    expect(workers).toHaveLength(1);
    expect(workers.every((worker) => worker.status === "cancelled")).toBe(true);
    await expect(page.getByRole("group", {name: "Message composer", exact: true})).toHaveAttribute("data-stream-status", "idle");
    await chooseMode(page, "Solo");
    await send(page, "Continue after stopping");
    await settled(page, "Continue after stopping");
  } finally {
    writeFileSync(join(root, "control", "release-collaboration"), "");
    await client.dispose();
  }
});
