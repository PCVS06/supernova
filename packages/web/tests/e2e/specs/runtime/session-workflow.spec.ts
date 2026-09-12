import {existsSync, mkdirSync, realpathSync, rmSync, writeFileSync} from "node:fs";
import {join} from "node:path";
import {randomUUID} from "node:crypto";
import {expect, test} from "@playwright/test";
import type {Locator, Page} from "@playwright/test";

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
  await expect(page.getByRole("button", {name: "Start dictation"})).toBeVisible();
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
  await expect(panel.getByText("Terminal transport required", {exact: true})).toBeVisible();
  await expect(panel.getByRole("button", {name: "Open Terminal tab"})).toHaveAttribute("aria-current", "page");
  await expect(panel.locator("kbd")).toHaveCount(0);

  await openWorkspaceView(page, "Context");
  await expect(panel).toBeVisible();
  await expect(panel.getByRole("button", {name: "Open Terminal tab"})).toBeVisible();
  await expect(panel.getByRole("button", {name: "Open Context tab"})).toHaveAttribute("aria-current", "page");
  await expect(panel.locator("details").first()).toBeVisible();
  await expect(panel.getByText("Harness", {exact: true})).toBeVisible();
  await expect(panel.getByText("Project", {exact: true})).toBeVisible();
  await expect(panel.getByText("Project files", {exact: true})).toBeVisible();
  await expect(panel.locator("details[open]")).toHaveCount(0);
  await panel.getByText("Project files", {exact: true}).click();
  await expect(panel.getByRole("button", {name: "Open GOAL.md in Files"})).toBeVisible();
  await panel.getByText("Project files", {exact: true}).click();
  await panel.getByText("Runtime", {exact: true}).click();
  await expect(panel.getByText("Exact runtime system prompt", {exact: true})).toBeVisible();

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
  await expect(panel.getByText("Terminal transport required", {exact: true})).toBeVisible();
  await panel.getByRole("button", {name: "Close Terminal tab"}).click();
  await expect(panel).not.toBeVisible();
  await page.getByRole("button", {name: "Toggle workspace panel"}).click();
  await expect(panel.getByRole("navigation", {name: "Workspace view switcher"})).toBeVisible();
});

test("queued messages survive reload, can be removed and run in FIFO order", async ({page}) => {
  await openProject(page);
  resetControl("queue-acceptance");
  await sendMessage(page, "Queue acceptance message");
  await expect.poll(() => existsSync(controlPath("started-queue-acceptance"))).toBe(true);
  const tray = page.getByRole("region", {name: "Goal and queued messages"});
  for (const [index, message] of ["First follow-up", "Remove this follow-up", "Last follow-up"].entries()) {
    const editor = page.locator('[contenteditable="true"]').first();
    await editor.fill(message);
    await page.getByRole("button", {name: "Queue message", exact: true}).click();
    await expect(tray.locator("li")).toHaveCount(index + 1);
  }
  await expect(tray.locator("li")).toHaveCount(3);
  await tray.getByRole("button", {name: "Remove queued message 2", exact: true}).click();
  await expect(tray.locator("li")).toHaveCount(2);
  await page.reload();
  await expect(tray.locator("li")).toHaveCount(2);
  await expect(tray.locator("summary").getByText("First follow-up", {exact: true})).toBeVisible();
  writeFileSync(controlPath("release-queue-acceptance"), "");
  await expectResponse(page, "Last follow-up");
  const transcript = await sessionTimeline(page).innerText();
  expect(transcript.indexOf("Runtime response: First follow-up")).toBeGreaterThan(-1);
  expect(transcript.indexOf("Runtime response: First follow-up")).toBeLessThan(transcript.indexOf("Runtime response: Last follow-up"));
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

test("steering is applied to the active run and the accepted draft clears", async ({page}) => {
  await openProject(page);
  resetControl("steering-acceptance");
  await sendMessage(page, "Steering acceptance message");
  await expect.poll(() => existsSync(controlPath("started-steering-acceptance"))).toBe(true);
  const editor = page.locator('[contenteditable="true"]').first();
  await editor.fill("Focus on the acceptance criteria");
  await expect(page.getByRole("button", {name: "Queue message", exact: true})).toBeVisible();
  await editor.press("Enter");
  await expect(editor).toHaveText("");
  writeFileSync(controlPath("release-steering-acceptance"), "");
  await expectResponse(page, "Focus on the acceptance criteria");
  await page.reload();
  await expect(sessionTimeline(page).getByText("Runtime response: Focus on the acceptance criteria", {exact: true})).toHaveCount(1);
});

test("a first-message goal pauses, survives reload and stops at its pass limit", async ({page}) => {
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
  await expect(tray.getByText(/Active goal/)).toBeVisible();
  await tray.getByRole("button", {name: "Pause", exact: true}).click();
  await expect(tray.getByText(/Paused goal/)).toBeVisible();
  await page.reload();
  await expect(tray.getByText(/Paused goal/)).toBeVisible();
  writeFileSync(controlPath("release-goal-acceptance"), "");
  await expect(page.getByRole("button", {name: "Start dictation", exact: true})).toBeVisible();
  await expect(tray.getByText(/1 of 10 passes/, {exact: false}).first()).toBeVisible();
  await tray.getByRole("button", {name: "Resume", exact: true}).click();
  await expect(tray.getByText(/Paused goal · 10 of 10 passes/)).toBeVisible({timeout: 30_000});
  await expect(tray.getByRole("button", {name: "Resume", exact: true})).toHaveCount(0);
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
