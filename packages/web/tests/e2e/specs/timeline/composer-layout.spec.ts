import {test, expect} from "@e2e/support/timeline-fixture";

for (const width of [1280, 820]) {
  test(`keeps long drafts and controls inside the window through solar and goal transitions at ${width}px`, async ({page, timeline}) => {
    await page.setViewportSize({width, height: 480});
    await page.emulateMedia({reducedMotion: "reduce"});
    await timeline.openMainSession();
    const composer = page.getByRole("group", {name: "Message composer", exact: true});
    const editor = page.getByRole("textbox", {name: "Message", exact: true});
    const initial = (await composer.boundingBox())!;
    const bottom = initial.y + initial.height;
    const draft = Array.from({length: 18}, (_, index) => `Draft line ${index + 1}`).join("\n");
    await editor.fill(draft);

    for (const goal of [false, true, false]) {
      await editor.fill(`${goal ? "/goal " : ""}${draft}`);
      for (const open of [true, false]) {
        await page.getByRole("button", {name: open ? "Open chat solar system" : "Close chat solar system", exact: true}).click();
        await expect.poll(() => composer.evaluate((element) => Math.round(element.getBoundingClientRect().bottom))).toBe(Math.round(bottom));
        const box = (await composer.boundingBox())!;
        expect(box.y, "the whole composer remains inside the chat").toBeGreaterThanOrEqual(0);
        await editor.focus();
        await editor.press("ControlOrMeta+End");
        await editor.press("Shift+Enter");
        await editor.press("x");
        await expect
          .poll(
            () =>
              editor.evaluate((element) => {
                const selection = window.getSelection();
                if (!selection?.rangeCount) return false;
                const caret = selection.getRangeAt(0).getBoundingClientRect();
                const bounds = element.getBoundingClientRect();
                return caret.top >= bounds.top - 1 && caret.bottom <= bounds.bottom + 1;
              }),
            {message: "the current line stays visible while typing"}
          )
          .toBe(true);
        expect(await page.evaluate(() => document.scrollingElement?.scrollTop ?? 0)).toBe(0);
      }
    }
  });
}
