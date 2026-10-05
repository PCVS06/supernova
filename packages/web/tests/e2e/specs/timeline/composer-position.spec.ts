import {EMPTY_SESSION_ID, TIMELINE_PROJECT_PATH} from "@e2e/mocks/timeline-data";
import {test, expect} from "@e2e/support/timeline-fixture";

interface ComposerFrame {
  readonly bottom: number;
  readonly top: number;
  readonly height: number;
  readonly pathname: string;
  readonly status: string;
}

declare global {
  interface Window {
    __composerPositionFrames?: ComposerFrame[];
    __stopComposerPositionProbe?: () => void;
  }
}

for (const {session, width} of [
  {session: "existing", width: 1280},
  {session: "new", width: 1280},
  {session: "existing", width: 820},
  {session: "new", width: 820},
] as const) {
  test(`keeps the composer anchored while sending and answering in ${session} chat at ${width}px`, async ({page, timeline}, testInfo) => {
    await page.setViewportSize({width, height: 800});
    await page.emulateMedia({reducedMotion: "no-preference"});
    if (session === "existing") {
      await timeline.openMainSession();
    } else {
      const projectId = Buffer.from(encodeURIComponent(TIMELINE_PROJECT_PATH)).toString("base64").replaceAll("=", "");
      await page.goto(`/session/new?projectId=${projectId}`);
    }

    const composer = page.getByRole("group", {name: "Message composer", exact: true});
    const editor = page.locator('[contenteditable="true"]').first();
    await expect(editor).toBeEditable();
    await editor.fill("Keep the chat bar steady while answering");
    const before = await composer.boundingBox();
    expect(before).not.toBeNull();

    await page.evaluate(() => {
      const frames: ComposerFrame[] = [];
      window.__composerPositionFrames = frames;
      let frame = 0;
      const capture = () => {
        const element = document.querySelector('[role="group"][aria-label="Message composer"]');
        if (element) {
          const rect = element.getBoundingClientRect();
          frames.push({bottom: rect.bottom, top: rect.top, height: rect.height, pathname: location.pathname, status: window.__supernovaTimelineMock?.getState().status ?? "idle"});
        }
        frame = requestAnimationFrame(capture);
      };
      capture();
      window.__stopComposerPositionProbe = () => cancelAnimationFrame(frame);
    });

    await editor.press("Enter");
    if (session === "new") await expect(page).toHaveURL(`/session/${EMPTY_SESSION_ID}`);
    await expect(page.getByRole("button", {name: "Stop streaming"})).toBeVisible();
    await timeline.waitForLineGrowth(60);
    await expect(editor).toBeFocused();
    await page.keyboard.type("Next correction");
    await expect(page.getByRole("button", {name: "Queue next", exact: true})).toBeVisible();
    await timeline.breakForReasoning();
    await timeline.waitForLineGrowth(30);
    await timeline.completeMessage();
    await expect.poll(() => page.evaluate(() => window.__composerPositionFrames?.at(-1)?.status)).toBe("completed");
    const samples = await page.evaluate(() => {
      window.__stopComposerPositionProbe?.();
      return window.__composerPositionFrames ?? [];
    });

    expect(samples.some((frame) => frame.status === "streaming")).toBe(true);
    const bottomPositions = samples.map((frame) => frame.bottom);
    const topPositions = samples.map((frame) => frame.top);
    const largestJump = Math.max(...samples.slice(1).map((frame, index) => Math.abs(frame.bottom - samples[index]!.bottom)));
    await testInfo.attach("composer-geometry", {
      body: JSON.stringify({
        initialBottom: before!.y + before!.height,
        frames: samples.length,
        maximumFrameJump: largestJump,
        bottomTravel: Math.max(...bottomPositions) - Math.min(...bottomPositions),
        topTravel: Math.max(...topPositions) - Math.min(...topPositions),
      }),
      contentType: "application/json",
    });
    expect(
      largestJump,
      JSON.stringify({before, changes: samples.filter((frame, index) => index === 0 || Math.abs(frame.bottom - samples[index - 1]!.bottom) > 0.5)})
    ).toBeLessThanOrEqual(2);
    expect(Math.max(...bottomPositions) - Math.min(...bottomPositions), "the composer must stay at its original bottom edge throughout the answer").toBeLessThanOrEqual(2);
    expect(Math.max(...topPositions) - Math.min(...topPositions), "a single-line send must not resize or shift the composer toolbar").toBeLessThanOrEqual(2);
    await expect(editor).toBeFocused();
    await expect(editor).toHaveText("Next correction");
  });
}
