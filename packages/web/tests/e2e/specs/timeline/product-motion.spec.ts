import {test, expect} from "@e2e/support/timeline-fixture";

test("keeps symbols aligned through interrupted sidebar closing", async ({page, timeline}) => {
  await page.emulateMedia({reducedMotion: "no-preference"});
  await timeline.openMainSession();
  const sidebar = page.getByRole("complementary", {name: "Workspace ledger"});
  await sidebar.getByRole("button", {name: "Expand chats in Research", exact: true}).click();
  const row = sidebar.getByRole("button", {name: "Open chat: Research conversation 2", exact: true});
  await expect(row).toBeVisible();
  const before = await row.boundingBox();
  await sidebar.getByRole("button", {name: "Collapse chats in Research", exact: true}).evaluate((button: HTMLButtonElement) => button.click());
  await expect(page.locator('[data-sidebar-presence="closing"]')).not.toHaveCount(0);
  expect(Math.abs((await page.locator('[aria-label="Open chat: Research conversation 2"]').boundingBox())!.x - before!.x)).toBeLessThan(1);
  await sidebar.getByRole("button", {name: "Expand chats in Research", exact: true}).evaluate((button: HTMLButtonElement) => button.click());
  await expect(row).toBeVisible();
  await expect(row.locator(".sidebar-label-name")).toHaveCSS("opacity", "1");
  await expect(page.locator('[data-sidebar-presence="closing"]')).toHaveCount(0);
  expect(Math.abs((await row.boundingBox())!.x - before!.x)).toBeLessThan(1);
});

test("shares ledger boundaries and keeps pointer focus quiet with visible keyboard focus", async ({page, timeline}) => {
  await timeline.openMainSession();
  const toggle = page.getByRole("button", {name: "Toggle workspace panel"});
  await toggle.click();
  await expect(page.getByRole("complementary", {name: "Workspace panel"})).toBeVisible();
  expect(await toggle.evaluate((element) => getComputedStyle(element).outlineStyle)).toBe("none");
  const edges = await page.locator(".workspace-content-seam, .workspace-panel-seam").evaluateAll((elements) =>
    elements.map((element) => {
      const style = getComputedStyle(element, "::before");
      return {width: style.width, top: style.top, bottom: style.bottom, color: style.backgroundImage};
    })
  );
  expect(edges).toHaveLength(2);
  expect(edges[0]).toEqual(edges[1]);
  await page.keyboard.press("Tab");
  await toggle.focus();
  expect(await toggle.evaluate((element) => element.matches(":focus-visible"))).toBe(true);
  expect(await toggle.evaluate((element) => Number.parseFloat(getComputedStyle(element).borderRadius))).toBeGreaterThan(0);
  expect(await toggle.evaluate((element) => Number.parseFloat(getComputedStyle(element).outlineWidth))).toBeGreaterThan(0);
});

test("keeps one anchored chat symbol through goal entry and a completed response", async ({page, timeline}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.emulateMedia({reducedMotion: "no-preference"});
  await timeline.openMainSession();
  const mark = page.locator(".chat-orbit-sun > .constant-orb");
  await mark.evaluate((element) => Object.assign(window, {__originalChatMark: element}));
  const original = (await mark.boundingBox())!;
  const editor = page.locator('[contenteditable="true"]').first();
  for (let i = 0; i < 3; i++) {
    await editor.fill("/goal Read the evidence");
    await expect(page.getByLabel("Goal draft")).toBeVisible();
    await page.getByRole("button", {name: "Cancel goal mode"}).click();
    await expect(editor).toBeFocused();
    const box = (await mark.boundingBox())!;
    expect(box.width).toBeCloseTo(original.width, 2);
    expect(box.height).toBeCloseTo(original.height, 2);
  }
  await timeline.sendMessage("Verify motion continuity", {awaitBottom: false});
  await timeline.completeMessage();
  await expect(mark).toHaveAttribute("data-state", "idle");
  expect(await mark.evaluate((element) => element === (window as unknown as {__originalChatMark: Element}).__originalChatMark)).toBe(true);
  expect((await mark.boundingBox())!.width).toBeCloseTo(original.width, 2);
  expect(errors).toEqual([]);
});

test("keeps orbit entries on their paths and worker details compact", async ({page, timeline}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.emulateMedia({reducedMotion: "no-preference"});
  await timeline.openMainSession();
  await page.getByRole("button", {name: "Open chat solar system", exact: true}).click();
  const canvas = page.getByRole("group", {name: "Orbital delegation"});
  await expect(canvas.locator(".chat-orbit-bodies")).toHaveCSS("transform", "none");
  await canvas.getByRole("button", {name: /^Research lead/}).click();
  const result = page.getByRole("region", {name: "Selected work: Research lead", exact: true});
  await expect(result.getByRole("button", {name: "Result", exact: true})).toHaveAttribute("aria-expanded", "false");
  await result.getByRole("button", {name: "Result", exact: true}).click();
  await expect(result.getByRole("article", {name: "Agent result"})).toBeVisible();
  await result.getByRole("button", {name: "Result", exact: true}).click();
  await expect(result.getByRole("article", {name: "Agent result"})).toHaveCount(0);
  await page.getByRole("link", {name: "Open full agent conversation ↗", exact: true}).click();
  await expect(page.locator(".worker-run-surface")).toBeVisible();
  await expect(page.getByRole("region", {name: "Chat solar system", exact: true})).toHaveCount(0);
  await expect(page.getByRole("button", {name: "Conversation", exact: true})).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByRole("button", {name: "Delegated work", exact: true})).toHaveAttribute("aria-expanded", "false");
  await page.screenshot({path: testInfo.outputPath("worker-summary.png")});
  await page.getByRole("link", {name: "Back to chat", exact: true}).click();
  await expect(page.getByRole("button", {name: "Back to parent system"})).toBeVisible();
  await expect(page.getByRole("region", {name: "Selected work: Research lead", exact: true})).toBeVisible();
  await expect(canvas).toHaveAttribute("data-expanded", "true");
  expect(errors).toEqual([]);
});

test("pointer dragging and scrolling do not adjust effort", async ({page, timeline}) => {
  await timeline.openMainSession();
  const editor = page.locator('[contenteditable="true"]').first();
  await editor.fill("Keep the current writing position");
  const dial = page.getByRole("button", {name: "Reasoning effort", exact: true});
  const original = await dial.textContent();
  await dial.hover();
  await page.mouse.wheel(0, 40);
  await expect(dial).toHaveText(original!);
  const bounds = (await dial.boundingBox())!;
  await page.mouse.move(bounds.x + 10, bounds.y + 10);
  await page.mouse.down();
  await page.mouse.move(bounds.x + 10, bounds.y - 80);
  await page.mouse.up();
  await expect(dial).toHaveText(original!);
  await expect(editor).toHaveText("Keep the current writing position");
});

test("reverses orbital entry without replacing the sun or jumping its layout", async ({page, timeline}) => {
  await page.emulateMedia({reducedMotion: "no-preference"});
  await timeline.openMainSession();
  const canvas = page.getByRole("group", {name: "Orbital delegation"});
  const sun = canvas.locator(".chat-orbit-sun");
  await sun.evaluate((element) => Object.assign(window, {__originalSun: element}));
  for (let index = 0; index < 3; index++) {
    await sun.evaluate((element: HTMLButtonElement) => element.click());
    await expect.poll(() => canvas.evaluate((element) => element.clientHeight)).toBeGreaterThan(120);
    // Measure the interruption in one browser task, excluding test-runner
    // round-trip latency while the opening animation is already moving.
    const {before, after} = await sun.evaluate(async (element: HTMLButtonElement) => {
      const bounds = () => ({left: Number.parseFloat(getComputedStyle(element).left), width: element.getBoundingClientRect().width});
      const before = bounds();
      element.click();
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      return {before, after: bounds()};
    });
    expect(Math.abs(after.left - before.left)).toBeLessThan(40);
    expect(Math.abs(after.width - before.width)).toBeLessThan(8);
    await expect(canvas).toHaveCSS("height", "80px");
    expect(await sun.evaluate((element) => element === (window as unknown as {__originalSun: Element}).__originalSun)).toBe(true);
  }
  await page.emulateMedia({reducedMotion: "reduce"});
  await sun.click();
  await expect(canvas).toHaveCSS("height", "480px");
  await expect(sun).toHaveCSS("transition-duration", "0s");
});
