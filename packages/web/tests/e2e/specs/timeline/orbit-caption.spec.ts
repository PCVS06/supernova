import {test, expect} from "@e2e/support/timeline-fixture";

test.use({contextOptions: {reducedMotion: "reduce"}});

for (const width of [1280, 880]) {
  test(`keeps both solar-system caption lines inside an empty canvas at ${width}px`, async ({page, timeline}, testInfo) => {
    await page.setViewportSize({width, height: 640});
    await timeline.openMainSession();
    await page.goto("/session/research-0");
    const canvas = page.getByRole("group", {name: "Orbital delegation"});
    await expect(canvas).toHaveAttribute("data-orbit-empty", "true");

    for (const expanded of [true, false, true]) {
      await canvas.getByRole("button", {name: expanded ? "Open chat solar system" : "Close chat solar system", exact: true}).click();
      await expect(canvas).toHaveAttribute("data-expanded", String(expanded));
      const sun = canvas.locator(".chat-orbit-sun");
      await sun.hover();
      await expect(sun.locator(".chat-orbit-caption")).toHaveCSS("opacity", "1");
      const geometry = await canvas.evaluate((element) => {
        const bounds = element.getBoundingClientRect();
        const caption = element.querySelector(".chat-orbit-sun .chat-orbit-caption")!.getBoundingClientRect();
        return {left: caption.left - bounds.left, right: bounds.right - caption.right, top: caption.top - bounds.top, bottom: bounds.bottom - caption.bottom};
      });
      expect(geometry.bottom, "the Ready status and return action must not be clipped at the canvas edge").toBeGreaterThanOrEqual(0);
      expect(
        Object.values(geometry).every((edge) => edge >= 0),
        "the complete caption must fit in the canvas"
      ).toBe(true);
    }
    await page.screenshot({path: testInfo.outputPath("empty-system-caption.png")});
  });
}
