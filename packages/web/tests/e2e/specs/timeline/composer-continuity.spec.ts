import {test, expect} from "@e2e/support/timeline-fixture";

test("keeps typing focus after sending an accepted message", async ({page, timeline}) => {
  await timeline.openMainSession();
  const editor = page.locator('[contenteditable="true"]').first();
  await editor.fill("Keep my typing position");
  await editor.press("Enter");
  await expect(editor).toHaveText("");
  await expect(editor).toBeFocused();
  await page.keyboard.type("Next correction");
  await expect(editor).toHaveText("Next correction");
});

test("keeps completed projects orbiting after entering their system with the mouse", async ({page, timeline}) => {
  await page.emulateMedia({reducedMotion: "no-preference"});
  await timeline.openMainSession();
  await page.getByRole("button", {name: "Open chat solar system", exact: true}).click();
  const canvas = page.getByRole("group", {name: "Orbital delegation"});
  await canvas.getByRole("button", {name: /^Research lead/}).click();
  await page.mouse.move(0, 0);
  await expect(canvas).toHaveAttribute("data-orbit-moving", "true");
  const moon = canvas.locator(".chat-orbit-body").first();
  const before = await moon.getAttribute("style");
  await expect(moon).not.toHaveAttribute("style", before!);
});

for (const choice of ["model", "effort"] as const) {
  test(`returns to the existing draft after choosing ${choice}`, async ({page, timeline}) => {
    await timeline.openMainSession();
    const editor = page.locator('[contenteditable="true"]').first();
    await editor.fill("Keep this draft");
    await editor.press("End");
    const settings = page.getByRole("button", {name: "Chat settings", exact: true});
    await settings.click();
    if (choice === "model") {
      await page.getByRole("menuitem", {name: "Model", exact: true}).click();
      await page.getByRole("menuitemradio", {name: "Timeline Test Model", exact: true}).last().click();
    } else {
      await page.getByRole("menuitem", {name: "Effort", exact: true}).click();
      await page.getByRole("menuitemradio", {name: "Medium", exact: true}).click();
      await expect(settings).toContainText("Medium");
    }
    await expect(editor).toBeFocused();
    await page.keyboard.type(" here");
    await expect(editor).toHaveText("Keep this draft here");
  });
}

for (const section of ["Model", "Effort"] as const) {
  test(`chooses ${section.toLowerCase()} with the keyboard and returns to the draft`, async ({page, timeline}) => {
    await timeline.openMainSession();
    const editor = page.locator('[contenteditable="true"]').first();
    const draft = "Keep my keyboard draft";
    const readCaret = () =>
      editor.evaluate((element) => {
        const selection = window.getSelection();
        if (!selection?.anchorNode || !element.contains(selection.anchorNode)) return null;
        const range = document.createRange();
        range.selectNodeContents(element);
        range.setEnd(selection.anchorNode, selection.anchorOffset);
        return {collapsed: selection.isCollapsed, offset: range.toString().length};
      });
    await editor.fill(draft);
    await editor.press("End");
    await expect.poll(readCaret).toEqual({collapsed: true, offset: draft.length});
    const settings = page.getByRole("button", {name: "Chat settings", exact: true});
    await settings.focus();
    await page.keyboard.press("Enter");
    const row = page.getByRole("menuitem", {name: section, exact: true});
    for (let step = 0; step < 4 && !(await row.evaluate((element) => element === document.activeElement)); step++) {
      await page.keyboard.press("ArrowDown");
    }
    await expect(row).toBeFocused();
    await page.keyboard.press("Enter");
    if (section === "Model") {
      const search = page.getByPlaceholder("Search models");
      await expect(search).toBeFocused();
      await page.keyboard.type("Timeline");
      await page.keyboard.press("ArrowDown");
      await expect(page.getByRole("menuitemradio", {name: "Timeline Test Model", exact: true}).first()).toBeFocused();
    } else {
      await expect(page.locator('[role="menuitemradio"][aria-checked="true"]')).toBeFocused();
      await page.keyboard.press("Home");
      await page.keyboard.press("ArrowDown");
      await expect(page.getByRole("menuitemradio").first()).toBeFocused();
    }
    await page.keyboard.press("Home");
    await expect(page.getByRole("menuitem", {name: "Back to chat settings", exact: true})).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(row).toBeFocused();
    await page.keyboard.press("Enter");
    if (section === "Model") {
      await expect(page.getByPlaceholder("Search models")).toBeFocused();
      await page.keyboard.press("ArrowDown");
      await expect(page.getByRole("menuitemradio", {name: "Timeline Test Model", exact: true}).first()).toBeFocused();
    }
    await page.keyboard.press("Enter");
    await expect(editor).toBeFocused();
    await expect.poll(readCaret).toEqual({collapsed: true, offset: draft.length});
    await page.keyboard.type(" here");
    await expect(editor).toHaveText(`${draft} here`);
  });
}

test("animates composer growth and keeps the editor usable during goal mode", async ({page, timeline}) => {
  await page.emulateMedia({reducedMotion: "no-preference"});
  await timeline.openMainSession();
  const composer = page.getByRole("group", {name: "Message composer", exact: true});
  const editor = page.locator('[contenteditable="true"]').first();
  const before = (await composer.boundingBox())!.height;
  await composer.evaluate((element) => {
    const samples: number[] = [];
    Object.assign(window, {__composerHeights: samples});
    element.addEventListener(
      "input",
      () => {
        const start = performance.now();
        const capture = () => {
          samples.push(element.getBoundingClientRect().height);
          if (performance.now() - start < 900) requestAnimationFrame(capture);
        };
        requestAnimationFrame(capture);
      },
      {once: true}
    );
  });
  await editor.fill("/goal A useful result");
  await expect(page.getByLabel("Goal draft")).toBeVisible();
  await expect.poll(async () => (await composer.boundingBox())!.height).toBeGreaterThan(before + 10);
  const samples = await page.evaluate(() => (window as unknown as {__composerHeights: number[]}).__composerHeights);
  const after = Math.max(...samples);
  expect(samples.filter((height) => height > before + 1 && height < after - 1).length).toBeGreaterThan(1);
  await page.getByRole("button", {name: "Cancel goal mode"}).click();
  await expect(editor).toBeFocused();
  await expect(editor).toHaveText("A useful result");
});
