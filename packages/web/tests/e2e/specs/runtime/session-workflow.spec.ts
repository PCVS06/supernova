import {execFileSync} from "node:child_process";
import {existsSync, readFileSync, mkdirSync, realpathSync, rmSync, writeFileSync} from "node:fs";
import {join} from "node:path";
import {randomUUID} from "node:crypto";
import {expect, test} from "@playwright/test";
import type {Locator, Page} from "@playwright/test";
import {enqueueRuntimeMessages} from "@e2e/support/runtime-controls";

function resolveE2eRoot(): string {
  const root = process.env.SUPERNOVA_E2E_ROOT;
  if (!root) throw new Error("SUPERNOVA_E2E_ROOT is required.");
  return root;
}

const e2eRoot = resolveE2eRoot();

function projectId(projectPath: string): string {
  return Buffer.from(encodeURIComponent(projectPath)).toString("base64").replaceAll("=", "");
}

async function openProject(page: Page): Promise<string> {
  const directory = join(e2eRoot, "projects", randomUUID());
  mkdirSync(directory, {recursive: true});
  const projectPath = realpathSync(directory);
  const id = projectId(projectPath);
  writeFileSync(join(projectPath, "PLAN.md"), "# Project plan\n\n- Check evidence\n- Verify the result\n");
  writeFileSync(join(projectPath, "GOAL.md"), "# Project goal\n\nShip a calm, reliable workspace.\n");
  writeFileSync(join(projectPath, "CONTEXT.md"), "# Project context\n\nKeep the file tabs understandable.\n");

  await page.addInitScript(
    ({id: storedProjectId, path}) => {
      localStorage.setItem(
        "supernova-projects",
        JSON.stringify({
          state: {projects: [{addedAt: new Date().toISOString(), id: storedProjectId, name: "runtime-e2e", path, pinned: false, pinnedSessionIds: []}]},
          version: 0,
        })
      );
      localStorage.setItem(
        "supernova-sidebar-sections",
        JSON.stringify({state: {expandedProjects: [storedProjectId], isPinnedCollapsed: false, isProjectsCollapsed: false, sidebarWidth: 288}, version: 0})
      );
    },
    {id, path: projectPath}
  );

  await page.goto(`/session/new?projectId=${encodeURIComponent(id)}`);
  await expect(page.getByRole("heading", {name: "What would you like to work on?"})).toBeVisible();
  await expect(page.getByText("runtime-e2e", {exact: true}).last()).toBeVisible();
  return id;
}

function sessionTimeline(page: Page): Locator {
  return page.getByLabel("Session timeline");
}

async function sendMessage(page: Page, prompt: string): Promise<void> {
  const editor = page.locator('[contenteditable="true"]').first();
  await expect(editor).toBeEditable();
  await editor.fill(prompt);
  await page.getByRole("button", {name: "Send message"}).click();
  await expect(sessionTimeline(page).getByText(prompt, {exact: true})).toHaveCount(1);
}

async function expectResponse(page: Page, prompt: string): Promise<void> {
  await expect(sessionTimeline(page).getByText(`Runtime response: ${prompt}`, {exact: true})).toBeVisible();
  await expect(page.getByRole("group", {name: "Message composer", exact: true}).first()).toHaveAttribute("data-stream-status", "idle");
}

async function openWorkspaceView(page: Page, view: "Browser" | "Context" | "Files" | "Terminal"): Promise<void> {
  const panel = page.getByRole("complementary", {name: "Workspace panel"});
  if (!(await panel.isVisible())) {
    await page.getByRole("button", {name: "Toggle workspace panel"}).click();
    await expect(panel).toBeVisible();
  }
  const switcher = panel.getByRole("navigation", {name: "Workspace view switcher"});
  if (!(await switcher.isVisible())) {
    await panel.getByRole("button", {name: "Add workspace tab"}).click();
    await expect(switcher).toBeVisible();
  }
  await switcher.getByRole("button", {name: `Open ${view} workspace`}).click();
}

async function runCheckpointCommand(page: Page, command: "redo" | "undo"): Promise<void> {
  const editor = page.locator('[contenteditable="true"]').first();
  const suggestionName = command === "undo" ? /^Undo Roll back to the previous checkpoint$/ : /^Redo Restore the next undone checkpoint$/;
  await editor.fill(`/${command}`);
  await page.getByRole("button", {name: suggestionName}).click();
  await page
    .getByRole("dialog", {name: "Review and restore"})
    .getByRole("button", {name: /^Restore (files and )?conversation$/})
    .click();
}

function controlPath(name: string): string {
  return join(e2eRoot, "control", name);
}

function resetControl(controlId: string): void {
  rmSync(controlPath(`release-${controlId}`), {force: true});
  rmSync(controlPath(`started-${controlId}`), {force: true});
}

test("creates a session, streams a response, and reloads the persisted conversation", async ({page}) => {
  const prompt = "Persist this workflow";

  await test.step("Create a session and receive a streamed response", async () => {
    await openProject(page);
    await sendMessage(page, prompt);
    await expect(page.getByRole("button", {name: `Open chat: ${prompt}`})).toBeVisible();
    await expectResponse(page, prompt);
  });

  await test.step("Reload and verify the conversation was persisted", async () => {
    await page.reload();
    await expect(page.getByRole("button", {name: `Open chat: ${prompt}`})).toBeVisible();
    await expect(sessionTimeline(page).getByText(prompt, {exact: true})).toHaveCount(1);
    await expect(sessionTimeline(page).getByText(`Runtime response: ${prompt}`, {exact: true})).toHaveCount(1);
  });
});

test("switching away and back during streaming never duplicates the active user message", async ({page}) => {
  const prompt = "Duplicate regression message";
  const id = await test.step("Create an alternate completed session", async () => {
    const projectId = await openProject(page);
    await sendMessage(page, "Create alternate session");
    await expectResponse(page, "Create alternate session");
    return projectId;
  });

  await test.step("Start a held response in a second session", async () => {
    await page.goto(`/session/new?projectId=${encodeURIComponent(id)}`);
    await expect(page.getByRole("heading", {name: "What would you like to work on?"})).toBeVisible();
    resetControl("duplicate-message");
    await sendMessage(page, prompt);
    await expect(page.getByRole("button", {name: `Open chat: ${prompt}`})).toBeVisible();
    await expect.poll(() => existsSync(controlPath("started-duplicate-message"))).toBe(true);
    await expect(page.getByRole("button", {name: "Stop streaming"})).toBeVisible();
  });

  await test.step("Switch away and back while the response is active", async () => {
    await page.locator("aside").getByText("Create alternate session", {exact: true}).click();
    await expect(page.getByRole("button", {name: "Open chat: Create alternate session"})).toHaveAttribute("aria-current", "page");
    await page.locator("aside").getByText(prompt, {exact: true}).click();
    await expect(page.getByRole("button", {name: `Open chat: ${prompt}`})).toHaveAttribute("aria-current", "page");
    await expect(sessionTimeline(page).getByText(prompt, {exact: true})).toHaveCount(1);
  });

  await test.step("Complete the response without duplicating the user message", async () => {
    writeFileSync(controlPath("release-duplicate-message"), "");
    await expectResponse(page, prompt);
    await expect(sessionTimeline(page).getByText(prompt, {exact: true})).toHaveCount(1);
  });

  await test.step("Reload and verify the committed conversation", async () => {
    await page.reload();
    await expect(sessionTimeline(page).getByText(prompt, {exact: true})).toHaveCount(1);
    await expect(sessionTimeline(page).getByText(`Runtime response: ${prompt}`, {exact: true})).toHaveCount(1);
  });
});

test("stopping a response leaves the session able to send another message", async ({page}) => {
  const abortedPrompt = "Abort recovery message";

  await test.step("Start a held response", async () => {
    await openProject(page);
    resetControl("abort-recovery");
    await sendMessage(page, abortedPrompt);
    await expect.poll(() => existsSync(controlPath("started-abort-recovery"))).toBe(true);
  });

  await test.step("Stop the active response", async () => {
    await page.getByRole("button", {name: "Stop streaming"}).click();
    await expect(page.getByRole("button", {name: "Start dictation"})).toBeVisible();
  });

  await test.step("Send and receive another response in the same session", async () => {
    const recoveryPrompt = "Message after abort";
    await sendMessage(page, recoveryPrompt);
    await expectResponse(page, recoveryPrompt);
    await expect(sessionTimeline(page).getByText(abortedPrompt, {exact: true})).toHaveCount(1);
  });
});

test("reloading during streaming reconnects to the server-owned response", async ({page}) => {
  const prompt = "Reload during streaming message";

  await test.step("Start a held response", async () => {
    await openProject(page);
    resetControl("reload-streaming");
    await sendMessage(page, prompt);
    await expect.poll(() => existsSync(controlPath("started-reload-streaming"))).toBe(true);
  });

  await test.step("Reload while the provider request remains active", async () => {
    await page.reload();
    await expect(page.getByRole("button", {name: `Open chat: ${prompt}`})).toHaveAttribute("aria-current", "page");
  });

  await test.step("Release and verify the response completes exactly once", async () => {
    writeFileSync(controlPath("release-reload-streaming"), "");
    await expectResponse(page, prompt);
    await expect(sessionTimeline(page).getByText(prompt, {exact: true})).toHaveCount(1);
    await expect(sessionTimeline(page).getByText(`Runtime response: ${prompt}`, {exact: true})).toHaveCount(1);
  });
});

test("a provider failure is shown and the session accepts another message", async ({page}) => {
  const failedPrompt = "Provider failure message";

  await test.step("Receive a provider error", async () => {
    await openProject(page);
    await sendMessage(page, failedPrompt);
    await expect(sessionTimeline(page).getByText("Synthetic provider failure.", {exact: true})).toBeVisible();
    await expect(page.getByRole("button", {name: "Start dictation"})).toBeVisible();
  });

  await test.step("Send a successful message after the failure", async () => {
    const recoveryPrompt = "Message after provider failure";
    await sendMessage(page, recoveryPrompt);
    await expectResponse(page, recoveryPrompt);
    await expect(sessionTimeline(page).getByText(failedPrompt, {exact: true})).toHaveCount(1);
  });
});

test("two sessions can run independently", async ({page}) => {
  const firstPrompt = "Concurrent session A message";
  const secondPrompt = "Concurrent session B message";

  await test.step("Start a held response in session A", async () => {
    await openProject(page);
    resetControl("concurrent-session-a");
    await sendMessage(page, firstPrompt);
    await expect.poll(() => existsSync(controlPath("started-concurrent-session-a"))).toBe(true);
  });

  await test.step("Complete a response in session B while session A is active", async () => {
    await page.getByRole("button", {exact: true, name: "New chat in runtime-e2e"}).click();
    await expect(page.getByRole("heading", {name: "What would you like to work on?"})).toBeVisible();
    await sendMessage(page, secondPrompt);
    await expectResponse(page, secondPrompt);
  });

  await test.step("Return to session A and complete its response", async () => {
    await page.locator("aside").getByText(firstPrompt, {exact: true}).click();
    await expect(page.getByRole("button", {name: `Open chat: ${firstPrompt}`})).toHaveAttribute("aria-current", "page");
    await expect(page.getByRole("button", {name: "Stop streaming"})).toBeVisible();
    writeFileSync(controlPath("release-concurrent-session-a"), "");
    await expectResponse(page, firstPrompt);
    await expect(sessionTimeline(page).getByText(firstPrompt, {exact: true})).toHaveCount(1);
  });

  await test.step("Verify session B kept its own conversation", async () => {
    await page.locator("aside").getByText(secondPrompt, {exact: true}).click();
    await expect(sessionTimeline(page).getByText(secondPrompt, {exact: true})).toHaveCount(1);
    await expect(sessionTimeline(page).getByText(`Runtime response: ${secondPrompt}`, {exact: true})).toHaveCount(1);
  });
});

test("undo and redo survive a reload", async ({page}) => {
  const firstPrompt = "Undo first message";
  const secondPrompt = "Undo second message";

  await test.step("Complete two turns", async () => {
    await openProject(page);
    await sendMessage(page, firstPrompt);
    await expectResponse(page, firstPrompt);
    await sendMessage(page, secondPrompt);
    await expectResponse(page, secondPrompt);
  });

  await test.step("Undo the latest turn", async () => {
    await runCheckpointCommand(page, "undo");
    await expect(sessionTimeline(page).getByText(secondPrompt, {exact: true})).toHaveCount(0);
    await page.getByRole("button", {name: "Chat history", exact: true}).click();
    await page.getByRole("button", {name: "History details", exact: true}).click();
    await page.getByRole("button", {name: "Expand rolled back messages"}).click();
    await expect(page.getByRole("button", {name: "Restore rolled back message"})).toBeEnabled();
  });

  await test.step("Redo the latest turn", async () => {
    await runCheckpointCommand(page, "redo");
    await expect(sessionTimeline(page).getByText(secondPrompt, {exact: true})).toHaveCount(1);
    await expect(sessionTimeline(page).getByText(`Runtime response: ${secondPrompt}`, {exact: true})).toHaveCount(1);
  });

  await test.step("Reload and verify the restored transcript", async () => {
    await page.reload();
    await expect(sessionTimeline(page).getByText(firstPrompt, {exact: true})).toHaveCount(1);
    await expect(sessionTimeline(page).getByText(secondPrompt, {exact: true})).toHaveCount(1);
  });
});

test("offers terminal and context beside readable project files", async ({page}) => {
  await openProject(page);
  await sendMessage(page, "Review this plan");
  await expectResponse(page, "Review this plan");

  await expect(page.locator(".chat-workspace > header")).toHaveCount(0);
  await expect(page.getByText("Enter sends · Shift+Enter adds a line", {exact: true})).toHaveCount(0);
  await expect(page.getByRole("button", {name: "/goal", exact: true})).toHaveCount(0);
  await openWorkspaceView(page, "Terminal");
  const panel = page.getByRole("complementary", {name: "Workspace panel"});
  const primarySidebar = page.getByRole("complementary", {name: "Primary sidebar"});
  await expect
    .poll(async () => {
      const [primarySidebarBounds, panelBounds] = await Promise.all([primarySidebar.boundingBox(), panel.boundingBox()]);
      if (!primarySidebarBounds || !panelBounds) return Number.POSITIVE_INFINITY;
      return Math.abs(primarySidebarBounds.width - panelBounds.width);
    })
    .toBeLessThan(2);
  await expect(panel.getByText("Terminal unavailable in this version", {exact: true})).toBeVisible();
  await expect(panel.getByRole("button", {name: "Open Terminal tab"})).toHaveAttribute("aria-current", "page");
  await expect(panel.locator("kbd")).toHaveCount(0);

  await openWorkspaceView(page, "Context");
  await expect(panel).toBeVisible();
  await expect(panel.getByRole("button", {name: "Open Terminal tab"})).toBeVisible();
  await expect(panel.getByRole("button", {name: "Open Context tab"})).toHaveAttribute("aria-current", "page");
  await expect(panel.getByRole("region", {name: "Context provenance"})).toContainText("Captured for this chat");
  await expect(panel.getByText("Model at capture", {exact: true})).toBeVisible();
  await expect(panel.locator("details").first()).toBeVisible();
  await expect(panel.getByText("Harness", {exact: true})).toBeVisible();
  await expect(panel.getByText("Project", {exact: true})).toBeVisible();
  await expect(panel.getByText("Project files", {exact: true})).toBeVisible();
  await expect(panel.locator("details[open]")).toHaveCount(0);
  await panel.getByText("Project files", {exact: true}).click();
  await expect(panel.getByRole("button", {name: "Open GOAL.md in Files"})).toBeVisible();
  await panel.getByText("Project files", {exact: true}).click();
  await panel.getByText("Runtime", {exact: true}).click();
  await expect(panel.getByText("System prompt at capture", {exact: true})).toBeVisible();

  await openWorkspaceView(page, "Files");
  await expect(panel.getByRole("button", {name: "Open Files tab"})).toHaveAttribute("aria-current", "page");
  await panel.getByRole("button", {name: "PLAN.md", exact: true}).click();
  await expect(panel.getByRole("heading", {name: "Project plan"})).toBeVisible();
  const fileNavigation = panel.getByRole("complementary", {name: "Project file navigation"});
  const fileListResize = panel.getByRole("separator", {name: "Resize file list"});
  await expect(fileNavigation).toBeVisible();
  await expect(fileListResize).toBeVisible();
  const fileListWidth = await fileNavigation.evaluate((element) => element.getBoundingClientRect().width);
  await fileListResize.press("ArrowRight");
  await expect.poll(() => fileNavigation.evaluate((element) => element.getBoundingClientRect().width)).toBeLessThan(fileListWidth);
  await expect(panel.getByRole("navigation", {name: "Workspace tabs"})).toBeVisible();
  await expect.poll(async () => (await panel.boundingBox())?.width ?? 0).toBeGreaterThan(700);
  await panel.getByRole("button", {name: "Source", exact: true}).click();
  await expect(panel.getByText("# Project plan", {exact: true})).toBeVisible();
  await panel.getByRole("button", {name: "Add to chat", exact: true}).click();
  await expect(page.locator('[contenteditable="true"]').first()).toContainText("PLAN.md");

  await panel.getByRole("button", {name: "CONTEXT.md", exact: true}).click();
  await expect(panel.getByRole("heading", {name: "Project context"})).toBeVisible();
  await panel.getByRole("button", {name: "PLAN.md", exact: true}).click();
  await expect(panel.getByRole("heading", {name: "Project plan"})).toBeVisible();

  await panel.getByRole("button", {name: "Close Context tab"}).click();
  await expect(panel.getByRole("button", {name: "Open Context tab"})).toHaveCount(0);
  await panel.getByRole("button", {name: "Close Files tab"}).click();
  await expect(panel.getByText("Terminal unavailable in this version", {exact: true})).toBeVisible();
  await panel.getByRole("button", {name: "Close Terminal tab"}).click();
  await expect(panel).not.toBeVisible();
  await page.getByRole("button", {name: "Toggle workspace panel"}).click();
  await expect(panel.getByRole("navigation", {name: "Workspace view switcher"})).toBeVisible();
});

test("queued messages can be edited, reordered, removed and delivered in the saved order after reload", async ({page}) => {
  await openProject(page);
  resetControl("queue-acceptance");
  await sendMessage(page, "Queue acceptance message");
  await expect.poll(() => existsSync(controlPath("started-queue-acceptance"))).toBe(true);
  const tray = page.getByRole("region", {name: "Goal and queued messages"});
  const editor = page.locator('[contenteditable="true"]').first();
  await editor.fill("First follow-up");
  await editor.press("Enter");
  await expect(editor).toHaveText("");
  for (const text of ["Remove this follow-up", "Last follow-up"]) {
    await editor.fill(text);
    await page.getByRole("button", {name: "Queue next", exact: true}).click();
    await expect(editor).toHaveText("");
  }
  await expect(tray.locator("li")).toHaveCount(3);
  await tray.getByRole("button", {name: "Pause queue", exact: true}).click();
  await tray.getByRole("button", {name: "Edit queued message 1", exact: true}).click();
  await tray.getByRole("textbox", {name: "Edit queued message 1"}).fill("Revised follow-up");
  await tray.getByRole("button", {name: "Save queued message", exact: true}).click();
  await expect(tray.getByText("Revised follow-up", {exact: true})).toBeVisible();
  await tray.getByRole("button", {name: "Remove queued message 2", exact: true}).click();
  await expect(tray.locator("li")).toHaveCount(2);
  await tray.getByRole("button", {name: "Move queued message 2 up", exact: true}).click();
  await page.reload();
  await expect(tray.locator("li")).toHaveCount(2);
  await expect(tray.getByText("Revised follow-up", {exact: true})).toBeVisible();
  await tray.getByRole("button", {name: "Resume queue", exact: true}).click();
  writeFileSync(controlPath("release-queue-acceptance"), "");
  await expectResponse(page, "Revised follow-up");
  const transcript = await sessionTimeline(page).innerText();
  expect(transcript.indexOf("Runtime response: Revised follow-up")).toBeGreaterThan(-1);
  expect(transcript.indexOf("Runtime response: Revised follow-up")).toBeGreaterThan(transcript.indexOf("Runtime response: Last follow-up"));
  expect(transcript).not.toContain("Remove this follow-up");
  await expect(tray).not.toBeVisible();
});

test("keeps workspace tools at the right edge while chats are split", async ({page}) => {
  await openProject(page);
  await sendMessage(page, "First split chat");
  await expectResponse(page, "First split chat");
  await page.getByRole("button", {name: "New chat in runtime-e2e", exact: true}).click();
  await sendMessage(page, "Second split chat");
  await expectResponse(page, "Second split chat");
  const splitButton = page.getByRole("button", {name: "Open a chat beside this one"});
  const workspaceButton = page.getByRole("button", {name: "Toggle workspace panel"});
  const [splitButtonBounds, workspaceButtonBounds] = await Promise.all([splitButton.boundingBox(), workspaceButton.boundingBox()]);
  expect(splitButtonBounds).not.toBeNull();
  expect(workspaceButtonBounds).not.toBeNull();
  expect(splitButtonBounds!.x).toBeLessThan(workspaceButtonBounds!.x);
  expect(Math.abs(splitButtonBounds!.y - workspaceButtonBounds!.y)).toBeLessThan(2);
  await splitButton.click();
  await page
    .getByRole("dialog", {name: "Open a chat beside this one"})
    .getByRole("button", {name: /First split chat/})
    .click();
  await expect(page.locator(".chat-workspace")).toHaveCount(2);

  await openWorkspaceView(page, "Files");
  const panel = page.getByRole("complementary", {name: "Workspace panel"});
  await expect(panel).toBeInViewport({ratio: 1});
  const bounds = await panel.boundingBox();
  expect(bounds).not.toBeNull();
  expect(Math.abs(bounds!.x + bounds!.width - page.viewportSize()!.width)).toBeLessThan(2);
  await expect(panel.getByRole("button", {name: "PLAN.md", exact: true})).toBeVisible();

  await page.route("https://example.com/pi-workspace-test", (route) =>
    route.fulfill({contentType: "text/html", body: "<!doctype html><html><body><h1>Reference alongside chats</h1></body></html>"})
  );
  await openWorkspaceView(page, "Browser");
  await panel.getByRole("textbox", {name: "Page address"}).fill("https://example.com/pi-workspace-test");
  await panel.getByRole("textbox", {name: "Page address"}).press("Enter");
  await expect(page.frameLocator('iframe[title="Workspace browser"]').getByRole("heading", {name: "Reference alongside chats"})).toBeVisible();
  await expect(panel).toBeInViewport({ratio: 1});
});

test("steering is applied to the active run while attachments stay in the draft", async ({page}, testInfo) => {
  await openProject(page);
  resetControl("steering-acceptance");
  await sendMessage(page, "Steering acceptance message");
  await expect.poll(() => existsSync(controlPath("started-steering-acceptance"))).toBe(true);
  const editor = page.locator('[contenteditable="true"]').first();
  const composer = page.getByRole("group", {name: "Message composer", exact: true});
  await composer.locator('input[type="file"]').setInputFiles({name: "evidence.md", mimeType: "text/markdown", buffer: Buffer.from("# Supporting evidence")});
  await editor.fill("Focus on the acceptance criteria");
  await expect(composer.getByText("Steer now sends only text and keeps your attachments here. Queue next sends the complete message.", {exact: true})).toBeVisible();
  await expect(page.getByRole("button", {name: "Queue next", exact: true})).toBeVisible();
  await page.setViewportSize({width: 900, height: 800});
  await expect(composer.getByRole("button", {name: "Queue next", exact: true})).toBeInViewport({ratio: 1});
  await expect(composer.getByRole("button", {name: "Steer now", exact: true})).toBeInViewport({ratio: 1});
  await page.screenshot({path: testInfo.outputPath("follow-up-controls.png")});
  await page.getByRole("button", {name: "Steer now", exact: true}).click();
  await expect(editor).toHaveText("");
  await expect(editor).toBeFocused();
  await expect(page.getByText("Steering accepted", {exact: true})).toBeVisible();
  await expect(page.getByLabel("Accepted steering")).toContainText("Focus on the acceptance criteria");
  await expect(composer.getByRole("button", {name: "Remove evidence.md", exact: true})).toBeVisible();
  await composer.getByRole("button", {name: "Remove evidence.md", exact: true}).click();
  writeFileSync(controlPath("release-steering-acceptance"), "");
  await expectResponse(page, "Focus on the acceptance criteria");
  await page.reload();
  await expect(sessionTimeline(page).getByText("Runtime response: Focus on the acceptance criteria", {exact: true})).toHaveCount(1);
});

test("steers an existing deferred message into the active interaction exactly once", async ({page}) => {
  await openProject(page);
  resetControl("steering-acceptance");
  try {
    await sendMessage(page, "Steering acceptance message");
    await expect.poll(() => existsSync(controlPath("started-steering-acceptance"))).toBe(true);
    await enqueueRuntimeMessages(page, ["Follow the revised project priority"]);
    const tray = page.getByRole("region", {name: "Goal and queued messages"});
    await expect(tray.locator("li")).toHaveCount(1);
    await tray.getByRole("button", {name: "Steer", exact: true}).click();
    await expect(page.getByText("Steering accepted", {exact: true})).toBeVisible();
    await expect(tray.locator("li")).toHaveCount(0);
    writeFileSync(controlPath("release-steering-acceptance"), "");
    await expectResponse(page, "Follow the revised project priority");
    await page.reload();
    await expect(sessionTimeline(page).getByText("Runtime response: Follow the revised project priority", {exact: true})).toHaveCount(1);
  } finally {
    writeFileSync(controlPath("release-steering-acceptance"), "");
  }
});

test("steering wakes a lead waiting for a worker without cancelling that worker", async ({page}) => {
  await openProject(page);
  resetControl("delegated-steering-worker");
  rmSync(controlPath("waiting-delegation-steering"), {force: true});
  try {
    await sendMessage(page, "Orchestrate steering acceptance");
    await expect.poll(() => existsSync(controlPath("started-delegated-steering-worker"))).toBe(true);
    await expect.poll(() => existsSync(controlPath("waiting-delegation-steering"))).toBe(true);
    const editor = page.locator('[contenteditable="true"]').first();
    await editor.fill("Prioritize the correction now");
    await page.getByRole("button", {name: "Steer now", exact: true}).click();
    await expect(editor).toHaveText("");
    await expect(editor).toBeFocused();
    await expectResponse(page, "Prioritize the correction now");
    expect(existsSync(controlPath("release-delegated-steering-worker"))).toBe(false);
    await page.getByRole("button", {name: "Open chat solar system", exact: true}).click();
    await expect(page.getByRole("group", {name: "Orbital delegation"}).getByRole("button", {name: /^workflow-reviewer · running/})).toBeVisible();
  } finally {
    writeFileSync(controlPath("release-delegated-steering-worker"), "");
  }
});

test("a goal edits in place, uses normal Stop, survives reload and resubmits without clearing", async ({page}, testInfo) => {
  await openProject(page);
  resetControl("goal-acceptance");
  const editor = page.locator('[contenteditable="true"]').first();
  await editor.fill("/goal Send this normally");
  await expect(page.getByLabel("Goal draft")).toBeVisible();
  await page.getByRole("button", {name: "Cancel goal mode"}).click();
  await expect(editor).toHaveText("Send this normally");
  await expect(page.getByRole("button", {name: "Send message"})).toBeVisible();
  await expect(page.getByLabel("Goal draft")).toHaveCount(0);
  await editor.fill("/goal Validate the workspace controls");
  await editor.press("Enter");
  await expect.poll(() => existsSync(controlPath("started-goal-acceptance"))).toBe(true);
  const tray = page.getByRole("region", {name: "Goal and queued messages"});
  await expect(tray.getByText("Active", {exact: true})).toBeVisible();
  await expect(tray).toHaveCSS("border-bottom-width", "0px");
  const composer = page.getByRole("group", {name: "Message composer"});
  const [trayBounds, composerBounds] = await Promise.all([tray.boundingBox(), composer.boundingBox()]);
  expect(trayBounds).not.toBeNull();
  expect(composerBounds).not.toBeNull();
  expect(Math.abs(trayBounds!.x - composerBounds!.x)).toBeLessThanOrEqual(2);
  expect(Math.abs(trayBounds!.width - composerBounds!.width)).toBeLessThanOrEqual(2);
  await expect(tray.getByRole("button")).toHaveCount(2);
  await expect(tray.getByRole("button", {name: "Pause", exact: true})).toHaveCount(0);
  await page.getByRole("button", {name: "Stop streaming", exact: true}).click();
  await expect(tray.getByText("Paused", {exact: true})).toBeVisible();
  await page.reload();
  await expect(tray.getByText("Paused", {exact: true})).toBeVisible();
  writeFileSync(controlPath("release-goal-acceptance"), "");
  await expect(page.getByRole("button", {name: "Start dictation", exact: true})).toBeVisible();
  await editor.fill("Keep this ordinary draft");
  await tray.getByRole("button", {name: /Validate the workspace controls/}).click();
  const objective = tray.getByRole("textbox", {name: "Goal objective"});
  await expect(objective).toHaveValue("Validate the workspace controls");
  await objective.fill("Verify the revised workspace controls");
  await expect(tray.getByText("Paused", {exact: true})).toBeVisible();
  await expect(tray.getByRole("button")).toHaveCount(2);
  await page.screenshot({path: testInfo.outputPath("goal-editor.png")});
  await page.getByRole("button", {name: "Update goal", exact: true}).click();
  await expect(editor).toHaveText("Keep this ordinary draft");
  await expect(tray.getByRole("button", {name: /Verify the revised workspace controls/})).toBeVisible();
  await expect(tray.getByText("Paused", {exact: true})).toBeVisible({timeout: 30_000});
  await expect(tray.getByRole("button", {name: "Resume", exact: true})).toHaveCount(0);
  await page.reload();
  await expect(tray.getByRole("button", {name: /Verify the revised workspace controls/})).toBeVisible();
});

test("dictation writes recognized speech into the composer", async ({page}) => {
  await page.addInitScript(() => {
    class FakeSpeechRecognition {
      continuous = false;
      interimResults = false;
      lang = "";
      onend: (() => void) | null = null;
      onerror: ((event: {error: string}) => void) | null = null;
      onresult: ((event: {resultIndex: number; results: ArrayLike<{isFinal: boolean; 0: {transcript: string}}>}) => void) | null = null;

      start(): void {
        queueMicrotask(() => {
          this.onresult?.({resultIndex: 0, results: [{0: {transcript: "Dictated acceptance message"}, isFinal: true}]});
          this.onend?.();
        });
      }

      stop(): void {
        this.onend?.();
      }

      abort(): void {
        this.onend?.();
      }
    }

    Object.defineProperty(window, "SpeechRecognition", {configurable: true, value: FakeSpeechRecognition});
  });
  await openProject(page);

  await page.getByRole("button", {name: "Start dictation"}).click();
  const editor = page.locator('[contenteditable="true"]').first();
  await expect(editor).toHaveText("Dictated acceptance message");
  await expect(page.getByRole("button", {name: "Send message"})).toBeVisible();
});

test("reviews file restoration without mutation and requires fresh approval after manual edits", async ({page}, testInfo) => {
  const id = await openProject(page);
  const projectPath = decodeURIComponent(Buffer.from(id, "base64").toString());
  execFileSync("git", ["init"], {cwd: projectPath});
  execFileSync("git", ["add", "."], {cwd: projectPath});
  execFileSync("git", ["-c", "user.name=Test", "-c", "user.email=test@example.com", "commit", "-m", "Fixture"], {cwd: projectPath});
  resetControl("queue-acceptance");
  try {
    await sendMessage(page, "Queue acceptance message");
    await expect.poll(() => existsSync(controlPath("started-queue-acceptance"))).toBe(true);
    writeFileSync(join(projectPath, "PLAN.md"), "# Changed during turn\n");
    writeFileSync(controlPath("release-queue-acceptance"), "");
    await expectResponse(page, "Queue acceptance message");
    writeFileSync(join(projectPath, "PLAN.md"), "# Manual edit after turn\n");
    writeFileSync(join(projectPath, "unrelated.md"), "Keep my unrelated edit\n");
    const review = page.getByRole("dialog", {name: "Review and restore"});
    await sessionTimeline(page).getByRole("button", {name: "Revert to this message", exact: true}).last().click();
    await expect(review.getByLabel("Restore preview")).toContainText("PLAN.md");
    await expect(review).toContainText("manual changes");
    await expect(sessionTimeline(page).getByText("Queue acceptance message", {exact: true})).toHaveCount(1);
    expect(readFileSync(join(projectPath, "PLAN.md"), "utf8")).toContain("Manual edit after turn");
    await review.getByRole("button", {name: "Cancel", exact: true}).click();
    await sessionTimeline(page).getByRole("button", {name: "Revert to this message", exact: true}).last().click();
    await expect(review).toBeVisible();
    writeFileSync(join(projectPath, "PLAN.md"), "# Newer manual edit\n");
    await review.getByRole("button", {name: "Restore files and conversation", exact: true}).click();
    await expect(review).toContainText("Files changed since the preview");
    expect(readFileSync(join(projectPath, "PLAN.md"), "utf8")).toContain("Newer manual edit");
    await page.screenshot({animations: "disabled", path: testInfo.outputPath("restore-preview.png")});
    await review.getByRole("button", {name: "Restore files and conversation", exact: true}).click();
    await expect(review).not.toBeVisible();
    await expect(page.getByRole("group", {name: "Message composer", exact: true})).toHaveAttribute("data-stream-status", "idle");
    await expect.poll(() => readFileSync(join(projectPath, "PLAN.md"), "utf8")).toContain("# Project plan");
    expect(readFileSync(join(projectPath, "unrelated.md"), "utf8")).toContain("Keep my unrelated edit");
    await expect(sessionTimeline(page).getByText("Queue acceptance message", {exact: true})).toHaveCount(0);
    await page.reload();
    await page.getByRole("button", {name: "Chat history", exact: true}).click();
    await expect(page.getByRole("button", {name: "Step forward", exact: true})).toBeEnabled();
    await expect(page.getByRole("button", {name: "Expand rolled back messages"})).toHaveCount(0);
  } finally {
    writeFileSync(controlPath("release-queue-acceptance"), "");
  }
});

test("reconnects a surviving run while keeping an unsent draft and delivering no duplicate", async ({page, context}, testInfo) => {
  test.skip(process.env.PLAYWRIGHT_DEV === "1", "Network restoration reloads the Vite development page; verify draft recovery with the production client.");
  await page.addInitScript(() => {
    const NativeSocket = window.WebSocket;
    const sockets: WebSocket[] = [];
    window.WebSocket = class extends NativeSocket {
      constructor(url: string | URL, protocols?: string | string[]) {
        super(url, protocols);
        if (new URL(url, window.location.href).pathname === "/ws") sockets.push(this);
      }
    };
    Object.assign(window, {closeTestSockets: () => sockets.forEach((socket) => socket.close())});
  });
  await openProject(page);
  resetControl("reload-streaming");
  try {
    await sendMessage(page, "Reload during streaming message");
    await expect.poll(() => existsSync(controlPath("started-reload-streaming"))).toBe(true);
    const editor = page.locator('[contenteditable="true"]').first();
    await editor.fill("Keep this unsent draft");
    await context.setOffline(true);
    await page.evaluate(() => (window as unknown as {closeTestSockets: () => void}).closeTestSockets());
    await expect(page.getByLabel("Connection status")).toContainText("Reconnecting");
    await expect(editor).toBeEditable();
    await expect(editor).toHaveText("Keep this unsent draft");
    await expect(page.getByRole("button", {name: "Queue next", exact: true})).toBeDisabled();
    await page.screenshot({path: testInfo.outputPath("reconnecting-draft.png")});
    await context.setOffline(false);
    await expect(page.getByLabel("Connection status")).toHaveCount(0);
    await expect(page.getByRole("button", {name: "Stop streaming", exact: true})).toBeVisible();
    writeFileSync(controlPath("release-reload-streaming"), "");
    await expectResponse(page, "Reload during streaming message");
    await expect(editor).toHaveText("Keep this unsent draft");
    await expect(sessionTimeline(page).getByText("Runtime response: Reload during streaming message", {exact: true})).toHaveCount(1);
  } finally {
    await context.setOffline(false);
    writeFileSync(controlPath("release-reload-streaming"), "");
  }
});

test("renders chat formulas by default and places reverse inside a headerless composer", async ({page}, testInfo) => {
  await page.emulateMedia({reducedMotion: "reduce"});
  await openProject(page);
  const formula = String.raw`Show the velocity calculation:

$$
\begin{aligned}
|\vec v_B| &= \sqrt{v_A^2+u^2+2v_Au\cos\theta} \\
&\approx 8.68\,\mathrm{m\,s^{-1}}.
\end{aligned}
$$

$$
\boxed{|\vec v_B|\approx 8.68\,\mathrm{m\,s^{-1}}}
$$`;
  await page.locator('[contenteditable="true"]').first().fill(formula);
  await page.getByRole("button", {name: "Send message", exact: true}).click();
  await expect(page.getByRole("button", {name: "Stop streaming", exact: true})).toHaveCount(0);
  const conversation = sessionTimeline(page);
  await expect(conversation.locator(".katex-display")).toHaveCount(4);
  await expect(conversation.locator(".katex-error")).toHaveCount(0);
  await expect(page.getByLabel("Chat identity")).toHaveCount(0);
  const composer = page.getByRole("group", {name: "Message composer", exact: true});
  const reverse = composer.getByRole("button", {name: "Chat history", exact: true});
  await expect(reverse).toBeEnabled();
  await page.screenshot({animations: "disabled", path: testInfo.outputPath("math-chat.png")});
  await page.reload();
  await expect(conversation.locator(".katex-display")).toHaveCount(4);
  await page.setViewportSize({width: 720, height: 700});
  await expect(conversation.locator(".katex-display")).toHaveCount(4);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({animations: "disabled", path: testInfo.outputPath("math-chat-narrow.png")});
});

test("history arrows step backward and forward through files and turns without a dialog or draft loss", async ({page}, testInfo) => {
  const id = await openProject(page);
  const projectPath = decodeURIComponent(Buffer.from(id, "base64").toString());
  execFileSync("git", ["init"], {cwd: projectPath});
  execFileSync("git", ["add", "."], {cwd: projectPath});
  execFileSync("git", ["-c", "user.name=Test", "-c", "user.email=test@example.com", "commit", "-m", "Fixture"], {cwd: projectPath});
  const original = readFileSync(join(projectPath, "PLAN.md"), "utf8");
  resetControl("queue-acceptance");
  try {
    await sendMessage(page, "Queue acceptance message");
    await expect.poll(() => existsSync(controlPath("started-queue-acceptance"))).toBe(true);
    writeFileSync(join(projectPath, "PLAN.md"), "# Updated in the first turn\n");
    writeFileSync(controlPath("release-queue-acceptance"), "");
    await expectResponse(page, "Queue acceptance message");
    await sendMessage(page, "Second history turn");
    await expectResponse(page, "Second history turn");
    const composer = page.getByRole("group", {name: "Message composer", exact: true});
    const editor = composer.locator('[contenteditable="true"]');
    await editor.fill("Keep this unsent draft");
    await composer.getByRole("button", {name: "Chat history", exact: true}).click();
    const back = composer.getByRole("button", {name: "Step backward", exact: true});
    const forward = composer.getByRole("button", {name: "Step forward", exact: true});
    await expect(forward).toBeDisabled();
    for (const position of [1, 0]) {
      await back.click();
      await expect(composer.getByLabel("History position")).toHaveText(`${position}/2`);
      await expect(composer).toHaveAttribute("data-stream-status", "idle");
      await expect(page.getByRole("dialog")).toHaveCount(0);
      await expect(editor).toHaveText("Keep this unsent draft");
      await expect(page.getByRole("button", {name: "Expand rolled back messages"})).toHaveCount(0);
    }
    await expect(back).toBeDisabled();
    expect(readFileSync(join(projectPath, "PLAN.md"), "utf8")).toBe(original);
    await page.reload();
    await composer.getByRole("button", {name: "Chat history", exact: true}).click();
    await expect(composer.getByLabel("History position")).toHaveText("0/2");
    await editor.fill("Keep this unsent draft");
    for (const position of [1, 2]) {
      await forward.click();
      await expect(composer.getByLabel("History position")).toHaveText(`${position}/2`);
      await expect(composer).toHaveAttribute("data-stream-status", "idle");
      await expect(page.getByRole("dialog")).toHaveCount(0);
      await expect(editor).toHaveText("Keep this unsent draft");
      expect(readFileSync(join(projectPath, "PLAN.md"), "utf8")).toContain("Updated in the first turn");
    }
    await expectResponse(page, "Second history turn");
    await expect(forward).toBeDisabled();
    await page.setViewportSize({width: 720, height: 700});
    await expect(back).toBeInViewport({ratio: 1});
    await expect(forward).toBeInViewport({ratio: 1});
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({path: testInfo.outputPath("history-arrows.png")});
  } finally {
    writeFileSync(controlPath("release-queue-acceptance"), "");
  }
});

test("history arrows keep manual-edit conflicts inline and cancellation leaves files and conversation intact", async ({page}) => {
  const id = await openProject(page);
  const projectPath = decodeURIComponent(Buffer.from(id, "base64").toString());
  execFileSync("git", ["init"], {cwd: projectPath});
  execFileSync("git", ["add", "."], {cwd: projectPath});
  execFileSync("git", ["-c", "user.name=Test", "-c", "user.email=test@example.com", "commit", "-m", "Fixture"], {cwd: projectPath});
  resetControl("queue-acceptance");
  try {
    await sendMessage(page, "Queue acceptance message");
    await expect.poll(() => existsSync(controlPath("started-queue-acceptance"))).toBe(true);
    writeFileSync(join(projectPath, "PLAN.md"), "# Agent changes\n");
    writeFileSync(controlPath("release-queue-acceptance"), "");
    await expectResponse(page, "Queue acceptance message");
    writeFileSync(join(projectPath, "PLAN.md"), "# Keep my manual changes\n");
    const composer = page.getByRole("group", {name: "Message composer", exact: true});
    await composer.locator('[contenteditable="true"]').fill("Draft stays here");
    await composer.getByRole("button", {name: "Chat history", exact: true}).click();
    await composer.getByRole("button", {name: "Step backward", exact: true}).click();
    const notice = page.getByRole("region", {name: "History conflict"});
    await expect(notice).toContainText("manual edits");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(composer.getByRole("button", {name: "Step backward", exact: true})).toBeDisabled();
    await expect(sessionTimeline(page).getByText("Queue acceptance message", {exact: true})).toHaveCount(1);
    await notice.getByRole("button", {name: "Cancel", exact: true}).click();
    await expect(notice).toHaveCount(0);
    await expect(composer).toHaveAttribute("data-stream-status", "idle");
    expect(readFileSync(join(projectPath, "PLAN.md"), "utf8")).toContain("Keep my manual changes");
    await expect(composer.locator('[contenteditable="true"]')).toHaveText("Draft stays here");
    await expect(composer.getByLabel("History position")).toHaveText("1/1");
  } finally {
    writeFileSync(controlPath("release-queue-acceptance"), "");
  }
});
