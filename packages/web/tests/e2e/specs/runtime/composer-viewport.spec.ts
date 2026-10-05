import {existsSync, mkdirSync, realpathSync, rmSync, writeFileSync} from "node:fs";
import {join} from "node:path";
import {randomUUID} from "node:crypto";
import {expect, test} from "@playwright/test";
import {enqueueRuntimeMessages} from "@e2e/support/runtime-controls";

for (const width of [1280, 820]) {
  test(`keeps the composer accessible with a goal, queued messages and a long draft at ${width}px`, async ({page}, testInfo) => {
    const root = process.env.SUPERNOVA_E2E_ROOT!;
    rmSync(join(root, "control", "started-goal-acceptance"), {force: true});
    rmSync(join(root, "control", "release-goal-acceptance"), {force: true});
    const directory = join(root, "projects", randomUUID());
    mkdirSync(directory, {recursive: true});
    const projectPath = realpathSync(directory);
    const projectId = Buffer.from(encodeURIComponent(projectPath)).toString("base64").replaceAll("=", "");
    await page.addInitScript(
      ({id, path}) => {
        localStorage.setItem(
          "supernova-projects",
          JSON.stringify({state: {projects: [{id, path, name: "Composer layout", addedAt: new Date().toISOString(), pinned: false, pinnedSessionIds: []}]}, version: 0})
        );
      },
      {id: projectId, path: projectPath}
    );
    await page.setViewportSize({width, height: 480});
    await page.emulateMedia({reducedMotion: "reduce"});
    await page.goto(`/session/new?projectId=${encodeURIComponent(projectId)}`);
    const editor = page.getByRole("textbox", {name: "Message", exact: true});
    await expect(editor).toBeEditable();
    // The deterministic runtime holds this goal until Stop or its release marker.
    const objective = "Validate the workspace controls";
    await editor.fill(`/goal ${objective}`);
    await editor.press("Enter");
    const controls = page.getByRole("region", {name: "Goal and queued messages"});
    await expect(controls.getByText("Active", {exact: true})).toBeVisible();
    await expect.poll(() => existsSync(join(root, "control", "started-goal-acceptance"))).toBe(true);
    try {
      await enqueueRuntimeMessages(page, ["Queued first follow-up", "Queued second follow-up", "Queued third follow-up"]);
      await expect(controls.locator("li")).toHaveCount(3);
      await editor.fill(Array.from({length: 18}, (_, index) => `Draft line ${index + 1}`).join("\n"));
      const composer = page.getByRole("group", {name: "Message composer", exact: true});
      const bounds = (await composer.boundingBox())!;
      const timelineBounds = (await page.getByLabel("Session timeline").boundingBox())!;
      await testInfo.attach("composer-viewport-geometry", {
        body: JSON.stringify({
          viewport: page.viewportSize(),
          composer: bounds,
          timeline: timelineBounds,
          editor: await editor.boundingBox(),
          controls: await controls.boundingBox(),
        }),
        contentType: "application/json",
      });
      await expect(composer.getByRole("button", {name: "Queue next", exact: true})).toBeInViewport({ratio: 1});
      await expect(composer.getByRole("button", {name: "Steer now", exact: true})).toBeInViewport({ratio: 1});
      expect(bounds.y, "the composer must not extend above the window").toBeGreaterThanOrEqual(0);
      expect(bounds.y + bounds.height, "the composer must remain above its bottom inset").toBeLessThanOrEqual(453);
      expect(timelineBounds.height, "the chat must keep room for readable messages").toBeGreaterThanOrEqual(96);
      await editor.press("ControlOrMeta+End");
      await editor.press("Shift+Enter");
      await editor.press("x");
      await expect
        .poll(() =>
          editor.evaluate((element) => {
            const selection = window.getSelection();
            if (!selection?.rangeCount) return false;
            const caret = selection.getRangeAt(0).getBoundingClientRect();
            const bounds = element.getBoundingClientRect();
            let visibleTop = Math.max(0, bounds.top);
            let visibleBottom = Math.min(window.innerHeight, bounds.bottom);
            for (let ancestor = element.parentElement; ancestor; ancestor = ancestor.parentElement) {
              if (getComputedStyle(ancestor).overflowY === "visible") continue;
              const ancestorBounds = ancestor.getBoundingClientRect();
              visibleTop = Math.max(visibleTop, ancestorBounds.top + ancestor.clientTop);
              visibleBottom = Math.min(visibleBottom, ancestorBounds.top + ancestor.clientTop + ancestor.clientHeight);
            }
            return caret.top >= visibleTop - 1 && caret.bottom <= visibleBottom + 1;
          })
        )
        .toBe(true);
    } finally {
      writeFileSync(join(root, "control", "release-goal-acceptance"), "");
      const stop = page.getByRole("button", {name: "Stop streaming", exact: true});
      if (await stop.isEnabled().catch(() => false)) await stop.click();
    }
  });
}
