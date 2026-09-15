import {test, expect} from "@e2e/support/timeline-fixture";

test("chooses effort from a clickable menu and keeps the draft", async ({page, timeline}, testInfo) => {
  await timeline.openMainSession();
  const editor = page.locator('[contenteditable="true"]').first();
  await editor.fill("Keep my draft");
  const dial = page.getByRole("button", {name: "Reasoning effort", exact: true});
  await dial.click();
  await expect(page.getByRole("menuitemradio", {name: "High", exact: true})).toHaveAttribute("aria-checked", "true");
  await page.screenshot({animations: "disabled", path: testInfo.outputPath("clickable-effort.png")});
  await page.getByRole("menuitemradio", {name: "Medium", exact: true}).click();
  await expect(dial).toContainText("Medium");
  await expect(editor).toHaveText("Keep my draft");
  await expect(editor).toBeFocused();
  await expect(page.getByRole("slider", {name: "Reasoning effort"})).toHaveCount(0);
});

test("keeps planetary chrome quiet and opens project detail progressively", async ({page, timeline}) => {
  await timeline.openMainSession();
  await page.getByRole("button", {name: "Open chat solar system", exact: true}).click();
  await expect(page.getByRole("button", {name: "Close solar system", exact: true})).toHaveCount(0);
  const canvas = page.getByRole("group", {name: "Orbital delegation"});
  await canvas.getByRole("button", {name: /^Research lead/}).click();
  const selected = page.getByRole("region", {name: "Selected work: Research lead", exact: true});
  await expect(selected).toBeVisible();
  await expect(selected.getByText("comparing hardware", {exact: false})).toBeVisible();
  await selected.getByRole("button", {name: "Result", exact: true}).click();
  await expect(selected.getByText("comparing hardware", {exact: false})).not.toBeVisible();
  await selected.getByRole("button", {name: "Result", exact: true}).click();
  await expect(selected.getByText("comparing hardware", {exact: false})).toBeVisible();
});

test("keeps sidebar numeric rings moving when the owning chat is selected", async ({page, timeline}) => {
  await page.emulateMedia({reducedMotion: "no-preference"});
  await timeline.openMainSession();
  const sidebar = page.getByRole("complementary", {name: "Workspace ledger"});
  const digits = sidebar.locator('.constant-orb[data-constant="tau"] .constant-orb-compact .constant-orb-digits').first();
  await expect(digits).toBeVisible();
  const before = await digits.evaluate((element) => getComputedStyle(element).transform);
  await expect.poll(() => digits.evaluate((element) => getComputedStyle(element).transform)).not.toBe(before);
  await page.emulateMedia({reducedMotion: "reduce"});
  await expect(digits).toHaveCSS("animation-name", "none");
});

test("opening or dismissing effort choices does not change the selected level", async ({page, timeline}) => {
  await timeline.openMainSession();
  const dial = page.getByRole("button", {name: "Reasoning effort", exact: true});
  const original = await dial.textContent();
  await dial.click();
  await expect(page.getByRole("menu")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dial).toHaveText(original!);
  await expect(dial).toBeFocused();
  await dial.press("Enter");
  await page.keyboard.press("Home");
  await page.keyboard.press("Enter");
  await expect(dial).toContainText("Low");
});

test("opening a worker conversation preserves the disclosure's reading position", async ({page, timeline}) => {
  await page.emulateMedia({reducedMotion: "no-preference"});
  await timeline.openMainSession();
  await page.getByRole("button", {name: "Open chat solar system", exact: true}).click();
  await page
    .getByRole("group", {name: "Orbital delegation"})
    .getByRole("button", {name: /^Research lead/})
    .click();
  const selected = page.getByRole("region", {name: "Selected work: Research lead", exact: true});
  const disclosure = selected.getByRole("button", {name: "Conversation", exact: true});
  await disclosure.scrollIntoViewIfNeeded();
  const before = (await disclosure.boundingBox())!.y;
  await disclosure.click();
  await expect(disclosure).toHaveAttribute("aria-expanded", "true");
  await disclosure.evaluate(async (element) => {
    const reveal = element.parentElement!.querySelector(".ui-disclosure-reveal")!;
    await Promise.all(reveal.getAnimations().map((animation) => animation.finished));
  });
  expect(Math.abs((await disclosure.boundingBox())!.y - before)).toBeLessThan(3);
});

test("selected planets have no solid ring and numeric coronas still rotate on hover", async ({page, timeline}) => {
  await page.emulateMedia({reducedMotion: "no-preference"});
  await timeline.openMainSession();
  await page.getByRole("button", {name: "Open chat solar system", exact: true}).click();
  const canvas = page.getByRole("group", {name: "Orbital delegation"});
  await canvas.getByRole("button", {name: /^Research lead/}).click();
  const planet = canvas.locator(".chat-orbit-body").first();
  await planet.hover();
  const digits = planet.locator(".constant-orb-digits").first();
  const before = await digits.evaluate((element) => getComputedStyle(element).transform);
  await expect.poll(() => digits.evaluate((element) => getComputedStyle(element).transform)).not.toBe(before);
  expect(await planet.evaluate((element) => getComputedStyle(element).outlineStyle)).toBe("none");
});

test("keeps mathematical star formulas inside short and tall planetary views", async ({page, timeline}) => {
  await page.emulateMedia({reducedMotion: "reduce"});
  await timeline.openMainSession();
  await page.getByRole("button", {name: "Open chat solar system", exact: true}).click();
  const canvas = page.getByRole("group", {name: "Orbital delegation"});
  for (const height of [800, 480]) {
    await page.setViewportSize({width: 1280, height});
    await expect(canvas.locator(".chat-orbit-starmap text")).toHaveCount(18);
    expect(
      await canvas
        .locator(".chat-orbit-starmap text")
        .first()
        .evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize))
    ).toBeLessThanOrEqual(10);
    await expect
      .poll(() =>
        canvas.evaluate((element) => {
          const bounds = element.getBoundingClientRect();
          return [...element.querySelectorAll(".chat-orbit-starmap text")].every((formula) => {
            const box = formula.getBoundingClientRect();
            return box.top >= bounds.top && box.bottom <= bounds.bottom && box.left >= bounds.left && box.right <= bounds.right;
          });
        })
      )
      .toBe(true);
  }
});

test("shows ordinary teams individually even with the compact preference", async ({page, timeline}, testInfo) => {
  await page.addInitScript(() => localStorage.setItem("radian-workspace-map", JSON.stringify({state: {orbitDensity: "compact", orbitMotion: true}, version: 0})));
  await page.emulateMedia({reducedMotion: "reduce"});
  await timeline.openMainSession();
  await page.evaluate(() => window.__supernovaTimelineMock?.setOrbitSize(5));
  await page.getByRole("button", {name: "Open chat solar system", exact: true}).click();
  const canvas = page.getByRole("group", {name: "Orbital delegation"});
  await expect(canvas.getByRole("button", {name: /^Participant/})).toHaveCount(5, {timeout: 15000});
  await expect(canvas.getByRole("button", {name: /Earlier work|Current work/})).toHaveCount(0);
  await canvas.scrollIntoViewIfNeeded();
  await page.screenshot({path: testInfo.outputPath("individual-participants.png")});
});

test("drifts background formulas and respects reduced motion and collapsed views", async ({page, timeline}) => {
  await page.emulateMedia({reducedMotion: "no-preference"});
  await timeline.openMainSession();
  await page.getByRole("button", {name: "Open chat solar system", exact: true}).click();
  const canvas = page.getByRole("group", {name: "Orbital delegation"});
  await canvas.scrollIntoViewIfNeeded();
  const formula = canvas.locator(".chat-orbit-starmap text").first();
  const initial = await formula.evaluate((element) => getComputedStyle(element).transform);
  await expect.poll(() => formula.evaluate((element) => getComputedStyle(element).transform)).not.toBe(initial);
  await page.emulateMedia({reducedMotion: "reduce"});
  await expect(formula).toHaveCSS("animation-name", "none");
  await page.emulateMedia({reducedMotion: "no-preference"});
  await page.getByRole("button", {name: "Close chat solar system", exact: true}).click();
  await expect(formula).toHaveCSS("animation-play-state", "paused");
});
