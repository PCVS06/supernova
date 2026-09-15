import {test, expect} from "@e2e/support/timeline-fixture";

test("keeps one planet per current project and exposes previous assignments inside it", async ({page, timeline}, testInfo) => {
  await page.emulateMedia({reducedMotion: "no-preference"});
  await timeline.openMainSession();
  await page.evaluate(() => window.__supernovaTimelineMock?.setOrbitProjects());
  await page.getByRole("button", {name: "Open chat solar system", exact: true}).click();
  const canvas = page.getByRole("group", {name: "Orbital delegation"});
  await expect(canvas.locator('[data-kind="orchestrator"]')).toHaveCount(2, {timeout: 15000});
  await expect(canvas.getByRole("button", {name: /^Removed project/})).toHaveCount(0);
  await canvas.getByRole("button", {name: /^Research lead/}).click();
  await page.getByRole("button", {name: "Assignment history", exact: true}).click();
  const history = page.getByRole("combobox", {name: "Project assignment"});
  await expect(history.locator("option")).toHaveCount(2);
  await history.selectOption("earlier-research");
  await expect(page.getByRole("region", {name: "Selected work: Research lead"})).toContainText("Earlier research assignment");
  await expect(page.getByRole("link", {name: "Open full agent conversation ↗", exact: true})).toHaveAttribute("href", /\/run\/earlier-research$/);
  await page.getByRole("button", {name: "Back to parent system"}).click();
  await page.mouse.move(0, 0);
  await expect(canvas).toHaveAttribute("data-orbit-moving", "true");
  await canvas.evaluate(async (element) => {
    await Promise.all(
      element
        .getAnimations({subtree: true})
        .filter((animation) => animation.effect?.getTiming().iterations !== Infinity)
        .map((animation) => animation.finished.catch(() => undefined))
    );
  });
  await canvas.scrollIntoViewIfNeeded();
  await page.screenshot({path: testInfo.outputPath("project-systems.png")});
  await page.evaluate(() => window.__supernovaTimelineMock?.removeOrbitProject("research"));
  await expect(canvas.locator('[data-kind="orchestrator"]')).toHaveCount(1, {timeout: 15000});
  await expect(canvas.getByRole("button", {name: /^Research lead/})).toHaveCount(0);
});

for (const width of [1280, 880]) {
  test(`keeps project systems and their moons separate through a full revolution at ${width}px`, async ({page, timeline}) => {
    // Accelerate the browser frame clock; the production loop still caps each step at 100 ms.
    await page.addInitScript(() => {
      const frame = window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame = (callback) => frame((time) => callback(time * 8));
    });
    await page.setViewportSize({width, height: 900});
    await page.emulateMedia({reducedMotion: "no-preference"});
    await timeline.openMainSession();
    await page.evaluate(() => window.__supernovaTimelineMock?.setOrbitProjects());
    await page.getByRole("button", {name: "Open chat solar system", exact: true}).click();
    const canvas = page.getByRole("group", {name: "Orbital delegation"});
    await expect(canvas.locator('[data-kind="orchestrator"]')).toHaveCount(2, {timeout: 15000});
    await expect(canvas).toHaveCSS("height", width === 1280 ? "480px" : "432px");
    await expect(canvas.locator(".chat-orbit-bodies")).toHaveCSS("transform", "none");
    await canvas.scrollIntoViewIfNeeded();
    await page.mouse.move(0, 0);
    await expect(canvas).toHaveAttribute("data-orbit-moving", "true");
    await canvas.evaluate((element) => {
      const stats = {samples: 0, clearance: Infinity};
      Object.assign(window, {__orbitalClearance: stats});
      const sample = () => {
        const bodies = [...element.querySelectorAll("[data-orbit-body]")].map((body) => {
          const box = body.querySelector(".constant-orb")!.getBoundingClientRect();
          return {x: box.x + box.width / 2, y: box.y + box.height / 2, radius: box.width / 2};
        });
        for (let a = 0; a < bodies.length; a++)
          for (let b = a + 1; b < bodies.length; b++) {
            const first = bodies[a]!,
              second = bodies[b]!;
            stats.clearance = Math.min(stats.clearance, Math.hypot(first.x - second.x, first.y - second.y) - first.radius - second.radius);
          }
        stats.samples++;
        if (stats.samples < 760) requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
    });
    await expect.poll(() => page.evaluate(() => (window as unknown as {__orbitalClearance: {samples: number}}).__orbitalClearance.samples), {timeout: 30_000}).toBe(760);
    const stats = await page.evaluate(() => (window as unknown as {__orbitalClearance: {samples: number; clearance: number}}).__orbitalClearance);
    expect(stats.samples).toBe(760);
    expect(stats.clearance).toBeGreaterThan(2);
  });
}

test("keeps numeric project motion in subtle mode and resumes when leaving a hovered target", async ({page, timeline}) => {
  await page.addInitScript(() => localStorage.setItem("supernova-appearance", JSON.stringify({state: {mathematicalMotion: "subtle"}, version: 0})));
  await page.emulateMedia({reducedMotion: "no-preference"});
  await timeline.openMainSession();
  await page.getByRole("button", {name: "Open chat solar system", exact: true}).click();
  const canvas = page.getByRole("group", {name: "Orbital delegation"});
  const project = canvas.getByRole("button", {name: /^Research lead/});
  const digits = project.locator(".constant-orb-digits").first();
  await page.mouse.move(0, 0);
  await expect(digits).toHaveCSS("animation-name", "constant-phi-grow");
  await expect(digits).not.toHaveCSS("animation-duration", "0s");
  await expect(canvas).toHaveCSS("height", "480px");
  await canvas.scrollIntoViewIfNeeded();
  await project.hover();
  await expect(canvas).toHaveAttribute("data-orbit-moving", "false");
  await expect(digits).toHaveCSS("animation-play-state", "running");
  const hovered = await digits.evaluate((element) => getComputedStyle(element).transform);
  await expect.poll(() => digits.evaluate((element) => getComputedStyle(element).transform)).not.toBe(hovered);
  await canvas.locator(".chat-orbit-sun").hover();
  await expect(canvas).toHaveAttribute("data-orbit-moving", "true");
  const before = await digits.evaluate((element) => getComputedStyle(element).transform);
  await expect.poll(() => digits.evaluate((element) => getComputedStyle(element).transform)).not.toBe(before);
});
