import type {Page} from "@playwright/test";
import {test, expect} from "@e2e/support/timeline-fixture";

/** Clicks the visible sun without Playwright scrolling its clipped footer into view. */
async function clickVisibleSolarButton(page: Page, name: string): Promise<void> {
  const button = await page.getByRole("button", {name, exact: true}).boundingBox();
  const viewport = await page.getByLabel("Session timeline").boundingBox();
  expect(button).not.toBeNull();
  expect(viewport).not.toBeNull();
  const top = Math.max(button!.y, viewport!.y);
  const bottom = Math.min(button!.y + button!.height, viewport!.y + viewport!.height);
  expect(bottom - top, "the solar control must remain reachable without scrolling").toBeGreaterThan(20);
  await page.mouse.click(button!.x + button!.width / 2, (top + bottom) / 2);
}

for (const position of ["latest", "reading", "anchored"] as const) {
  for (const draft of ["goal", "steering"] as const) {
    test(`preserves the ${position} timeline position when the ${draft} draft expands and collapses`, async ({page, timeline}, testInfo) => {
      await page.emulateMedia({reducedMotion: "no-preference"});
      await timeline.openMainSession();
      if (draft === "steering") {
        await timeline.sendMessage();
        if (position !== "anchored") await timeline.waitForLineGrowth(90);
        await timeline.expectAtBottom();
      }
      if (position === "anchored" && draft === "goal") await timeline.sendMessage();
      if (position === "anchored") {
        await expect.poll(() => timeline.messageViewportTop("Exercise the timeline")).toBeCloseTo(24, 0);
        expect(await timeline.fakeSpaceHeight()).toBeGreaterThan(120);
      }
      if (position === "reading") await timeline.detachFar();
      const anchor = position === "reading" ? await timeline.captureVisibleTextAnchor() : null;
      const editor = page.getByRole("textbox", {name: "Message", exact: true});
      const composer = page.getByRole("group", {name: "Message composer", exact: true});
      const initialHeight = (await composer.boundingBox())!.height;
      const initialViewportHeight = await page.getByLabel("Session timeline").evaluate((element) => element.clientHeight);
      const initialScrollTop = await timeline.scrollTop();
      await timeline.resetVisualProbe();
      await editor.fill(
        draft === "goal" ? "/goal Keep the visible conversation steady" : "Please adjust this answer\nKeep the existing interface\nCheck the outcome\nExplain what changed"
      );
      if (draft === "goal") await expect(page.getByLabel("Goal draft")).toBeVisible();
      else await expect(page.getByRole("button", {name: "Steer now", exact: true})).toBeVisible();
      await expect.poll(async () => (await composer.boundingBox())!.height).toBeGreaterThan(initialHeight + 20);
      if (draft === "goal") await page.getByRole("button", {name: "Cancel goal mode"}).click();
      else await editor.fill("");
      await expect.poll(async () => (await composer.boundingBox())!.height).toBeCloseTo(initialHeight, 0);
      await expect
        .poll(async () =>
          timeline
            .visibleFrameSamples(await timeline.visualSamples())
            .slice(-3)
            .every((sample) => sample.clientHeight === initialViewportHeight)
        )
        .toBe(true);
      const samples = timeline.visibleFrameSamples(await timeline.visualSamples());
      await testInfo.attach("timeline-resize-geometry", {body: JSON.stringify(samples), contentType: "application/json"});
      expect(samples.length).toBeGreaterThan(3);
      if (anchor) {
        const after = await timeline.measureVisibleTextAnchor(anchor);
        const geometry = {
          before: {top: anchor.elementTop, scrollTop: anchor.scrollTop},
          after: {top: after.elementTop, scrollTop: after.scrollTop},
          frames: samples
            .filter((sample, index) => index === 0 || sample.scrollTop !== samples[index - 1]!.scrollTop || sample.clientHeight !== samples[index - 1]!.clientHeight)
            .map(({scrollTop, scrollHeight, clientHeight, lineCount}) => ({scrollTop, scrollHeight, clientHeight, lineCount})),
        };
        expect(Math.abs(after.elementTop - anchor.elementTop), `resizing the composer must keep the text being read in place: ${JSON.stringify(geometry)}`).toBeLessThanOrEqual(2);
        expect(
          Math.max(...samples.map((sample) => Math.abs(sample.scrollTop - anchor.scrollTop))),
          "no intermediate frame may jump away from the reading position"
        ).toBeLessThanOrEqual(2);
      } else if (position === "anchored") {
        expect(
          Math.max(...samples.map((sample) => Math.abs(sample.scrollTop - initialScrollTop))),
          "resizing the composer must not move the newly anchored user message"
        ).toBeLessThanOrEqual(2);
      } else {
        expect(Math.max(...samples.map((sample) => sample.bottomDistance)), "the latest response must stay visible in every painted resize frame").toBeLessThanOrEqual(5);
      }
    });
  }
}

for (const position of ["latest", "reading"] as const) {
  test(`keeps the ${position} transcript steady while opening and closing the solar system`, async ({page, timeline}, testInfo) => {
    await page.emulateMedia({reducedMotion: "no-preference"});
    await timeline.openMainSession();
    if (position === "reading") await timeline.detachSlightly();
    const before = await timeline.captureVisibleTextAnchor();
    await timeline.resetVisualProbe();
    await clickVisibleSolarButton(page, "Open chat solar system");
    await expect(page.getByRole("group", {name: "Orbital delegation"})).toHaveAttribute("data-expanded", "true");
    await clickVisibleSolarButton(page, "Close chat solar system");
    await expect(page.getByRole("button", {name: "Open chat solar system", exact: true})).toBeVisible();
    const after = await timeline.measureVisibleTextAnchor(before);
    const samples = timeline.visibleFrameSamples(await timeline.visualSamples());
    await testInfo.attach("solar-toggle-geometry", {body: JSON.stringify({before, after, samples}), contentType: "application/json"});
    expect(Math.abs(after.elementTop - before.elementTop), "returning from the solar system must restore the same visible transcript").toBeLessThanOrEqual(2);
    expect(
      Math.max(...samples.map((sample) => Math.abs(sample.scrollTop - before.scrollTop))),
      "solar disclosure must not jump the transcript in an intermediate frame"
    ).toBeLessThanOrEqual(2);
  });
}
