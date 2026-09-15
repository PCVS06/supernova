import {test, expect} from "@e2e/support/timeline-fixture";

test("mathematical sky spans the interface, drifts without blocking controls and respects motion preferences", async ({page, timeline}, testInfo) => {
  await page.emulateMedia({reducedMotion: "no-preference"});
  await timeline.openMainSession();
  const sky = page.locator(".mathematical-sky");
  await expect(sky).toHaveCount(1);
  await expect(sky).toHaveAttribute("aria-hidden", "true");
  await expect(sky).toHaveCSS("pointer-events", "none");
  const bounds = (await sky.boundingBox())!;
  expect(bounds.x).toBe(0);
  expect(bounds.y).toBe(0);
  expect(bounds.width).toBe(page.viewportSize()!.width);
  expect(bounds.height).toBe(page.viewportSize()!.height);
  const formula = sky.locator(".mathematical-sky-formula").first();
  expect(await formula.evaluate((el) => parseFloat(getComputedStyle(el).fontSize))).toBeLessThanOrEqual(8);
  const initial = await formula.evaluate((el) => getComputedStyle(el).transform);
  await expect.poll(() => formula.evaluate((el) => getComputedStyle(el).transform)).not.toBe(initial);
  const meteor = sky.locator(".mathematical-sky-meteor").first();
  // Sample the visible part of the actual animation without waiting for a meteor's quiet interval.
  await meteor.evaluate((el) => {
    const animation = el.getAnimations()[0]!;
    animation.pause();
    animation.currentTime = 4500;
  });
  await expect.poll(() => meteor.evaluate((el) => Number(getComputedStyle(el).opacity))).toBeGreaterThan(0);
  await page.getByRole("button", {name: "Chat history", exact: true}).click();
  await expect(page.getByRole("button", {name: "Step backward", exact: true})).toBeVisible();
  await page.screenshot({path: testInfo.outputPath("mathematical-sky.png")});
  await page.getByRole("link", {name: "Open settings", exact: true}).click();
  await expect(sky).toHaveCount(1);
  await expect(sky).toBeVisible();
  await page.screenshot({path: testInfo.outputPath("mathematical-sky-settings.png")});
  await page.emulateMedia({reducedMotion: "reduce"});
  await expect(formula).toHaveCSS("animation-name", "none");
  await expect(meteor).toHaveCSS("display", "none");
  await page.emulateMedia({reducedMotion: "no-preference"});
  await page.evaluate(() => {
    document.documentElement.dataset.motionPaused = "true";
  });
  await expect(formula).toHaveCSS("animation-play-state", "paused");
  await page.evaluate(() => {
    document.documentElement.dataset.mathematicalMotion = "off";
  });
  await expect(formula).toHaveCSS("animation-name", "none");
  await expect(meteor).toHaveCSS("display", "none");
});
