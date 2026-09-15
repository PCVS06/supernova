import {test, expect} from "@e2e/support/timeline-fixture";
import {TIMELINE_SESSION_ID} from "@e2e/mocks/timeline-data";

test.use({contextOptions: {reducedMotion: "reduce"}});

test("moves the same compact symbol into the system and returns it without occupying the reading area", async ({page, timeline}, testInfo) => {
  await page.emulateMedia({reducedMotion: "no-preference"});
  await timeline.openMainSession();
  const canvas = page.getByRole("group", {name: "Orbital delegation"});
  await canvas.scrollIntoViewIfNeeded();
  const initial = await canvas.locator(".chat-orbit-sun").evaluate((sun) => sun.getBoundingClientRect().x - sun.parentElement!.getBoundingClientRect().x);
  await canvas.evaluate((element) => {
    const samples: number[] = [];
    Object.assign(element, {__sunPositions: samples});
    element.querySelector(".chat-orbit-sun")!.addEventListener(
      "click",
      () => {
        const start = performance.now();
        const capture = () => {
          samples.push(element.querySelector(".chat-orbit-sun")!.getBoundingClientRect().x - element.getBoundingClientRect().x);
          if (performance.now() - start < 1800) requestAnimationFrame(capture);
        };
        requestAnimationFrame(capture);
      },
      {once: true}
    );
  });
  await page.getByRole("button", {name: "Open chat solar system", exact: true}).click();
  await expect
    .poll(() =>
      canvas
        .locator(".chat-orbit-sun")
        .evaluate((sun) => Math.abs(sun.getBoundingClientRect().x + sun.clientWidth / 2 - sun.parentElement!.getBoundingClientRect().x - sun.parentElement!.clientWidth / 2))
    )
    .toBeLessThan(1);
  const final = await canvas.locator(".chat-orbit-sun").evaluate((sun) => sun.getBoundingClientRect().x - sun.parentElement!.getBoundingClientRect().x);
  const positions = await canvas.evaluate((element) => (element as HTMLElement & {__sunPositions: number[]}).__sunPositions);
  expect(positions.filter((x) => x > initial + 10 && x < final - 10).length).toBeGreaterThan(2);
  await expect(canvas.locator(".chat-orbit-sun")).toHaveCount(1);
  await page.screenshot({path: testInfo.outputPath("expanded-system.png")});
  await page.getByRole("button", {name: "Close chat solar system", exact: true}).click();
  await expect.poll(() => canvas.evaluate((element) => element.clientHeight)).toBeLessThanOrEqual(80);
  await expect(canvas.getByRole("button", {name: "Open chat solar system", exact: true})).toBeFocused();
  await expect(canvas.getByRole("button", {name: /^Research lead/})).toHaveCount(0);
  await page.screenshot({path: testInfo.outputPath("compact-chat.png")});
});

test("preserves the original symbols with dotted planetary and moon orbits and no trails", async ({page, timeline}) => {
  await timeline.openMainSession();
  const canvas = page.getByRole("group", {name: "Orbital delegation"});
  const contours = canvas.locator(".chat-orbit-sun .constant-orb-digits path");
  const original = await contours.evaluateAll((paths) => paths.map((path) => path.getAttribute("d")));
  expect(original.length).toBeGreaterThan(0);
  await page.getByRole("button", {name: "Open chat solar system", exact: true}).click();
  await canvas.scrollIntoViewIfNeeded();
  await expect(contours.first()).toBeVisible();
  expect(await contours.evaluateAll((paths) => paths.map((path) => path.getAttribute("d")))).toEqual(original);
  await expect(canvas.locator(".chat-orbit-corona, .chat-orbit-drift, .chat-orbit-wake")).toHaveCount(0);
  await expect(canvas.locator(".chat-orbit-moon-track").first()).toBeVisible();
  const orbits = await canvas.locator(".chat-orbit-track").evaluateAll((tracks) =>
    tracks.map((track) => ({
      dotted: getComputedStyle(track).strokeDasharray !== "none",
      radius: (track as SVGEllipseElement).rx.baseVal.value,
    }))
  );
  expect(orbits.length).toBeGreaterThan(1);
  expect(orbits.every((orbit) => orbit.dotted && orbit.radius > 0)).toBe(true);
});

test("keeps nested work in the chat and restores the parent system", async ({page, timeline}) => {
  await timeline.openMainSession();
  await page.getByRole("button", {name: "Open chat solar system", exact: true}).click();
  const canvas = page.getByRole("group", {name: "Orbital delegation"});
  await canvas.getByRole("button", {name: /^Research lead/}).click();
  await expect(canvas.locator(".chat-orbit-sun .constant-orb")).toHaveAttribute("data-constant", "phi");
  await expect(canvas.getByRole("button", {name: /^Literature researcher/})).toBeVisible();
  await page.getByRole("region", {name: "Selected work: Research lead", exact: true}).getByRole("button", {name: "Result", exact: true}).click();
  await expect(page.getByRole("region", {name: "Selected work: Research lead", exact: true})).toContainText("comparing hardware");
  await page.getByRole("button", {name: "Back to parent system"}).click();
  await expect(canvas.locator(".chat-orbit-sun .constant-orb")).toHaveAttribute("data-constant", "tau");
  await expect(page).toHaveURL(`/session/${TIMELINE_SESSION_ID}`);
  await page.goto(`/session/${TIMELINE_SESSION_ID}/run/research-lead`);
  await expect(page.getByRole("button", {name: "Delegated work", exact: true})).toBeVisible();
  await expect(canvas).toHaveCount(0);
  await page.getByRole("button", {name: "Delegated work", exact: true}).click();
  await expect(canvas.locator(".chat-orbit-sun .constant-orb")).toHaveAttribute("data-constant", "phi");
  await expect(canvas.locator('[data-orbit-body="session:timeline-session"]')).toHaveCount(0);
  await page.goto("/session/research-0");
  await expect(canvas.locator(".chat-orbit-sun .constant-orb")).toHaveAttribute("data-constant", "phi");
  await expect(canvas.locator("[data-orbit-body]")).toHaveCount(1);
});

test("carries a selected project from its orbital position into the center", async ({page, timeline}) => {
  await page.emulateMedia({reducedMotion: "no-preference"});
  await timeline.openMainSession();
  await page.getByRole("button", {name: "Open chat solar system", exact: true}).click();
  const canvas = page.getByRole("group", {name: "Orbital delegation"});
  await canvas.scrollIntoViewIfNeeded();
  const lead = canvas.locator('[data-orbit-body="project:science:research"]');
  await lead.hover();
  await expect(canvas).toHaveAttribute("data-orbit-moving", "false");
  await lead.evaluate((button) => {
    button.addEventListener(
      "click",
      () => {
        const canvas = button.closest(".chat-orbit-canvas")!;
        const samples: number[] = [];
        Object.assign(window, {__projectApproach: samples});
        const start = performance.now();
        const sample = () => {
          const sun = canvas.querySelector(".chat-orbit-sun")!;
          if (sun.querySelector('[data-constant="phi"]')) {
            const bounds = canvas.getBoundingClientRect(),
              body = sun.getBoundingClientRect();
            samples.push(Math.hypot(body.x + body.width / 2 - bounds.x - bounds.width / 2, body.y + body.height / 2 - bounds.y - bounds.height / 2));
          }
          if (performance.now() - start < 1100) requestAnimationFrame(sample);
        };
        requestAnimationFrame(sample);
      },
      {once: true}
    );
  });
  await lead.click();
  await expect
    .poll(() =>
      page.evaluate(() => {
        const samples = (window as unknown as {__projectApproach: number[]}).__projectApproach;
        return samples?.length > 3 && samples.at(-1)! < 1;
      })
    )
    .toBe(true);
  const samples = await page.evaluate(() => (window as unknown as {__projectApproach: number[]}).__projectApproach);
  expect(Math.max(...samples)).toBeGreaterThan(40);
  expect(samples.filter((distance) => distance > 5 && distance < 40).length).toBeGreaterThan(1);
});

test("opens existing work without replaying old assignments as live signals", async ({page, timeline}) => {
  await page.emulateMedia({reducedMotion: "no-preference"});
  await timeline.openMainSession();
  await page.evaluate(() => window.__supernovaTimelineMock?.setConstellationStatus("running"));
  const canvas = page.getByRole("group", {name: "Orbital delegation"});
  await expect(canvas.locator('[data-orbit-body="project:science:research"]')).toHaveAttribute("data-active", "true", {timeout: 15000});
  await page.getByRole("button", {name: "Open chat solar system", exact: true}).click();
  await expect(canvas).toHaveAttribute("data-expanded", "true");
  expect(await canvas.locator("[data-orbit-packet]").evaluateAll((packets) => packets.every((packet) => getComputedStyle(packet).display === "none"))).toBe(true);
});

test("moves smoothly, pauses for inspection, and preserves completed work", async ({page, timeline}) => {
  await page.emulateMedia({reducedMotion: "no-preference"});
  await timeline.openMainSession();
  await page.getByRole("button", {name: "Open chat solar system", exact: true}).click();
  const canvas = page.getByRole("group", {name: "Orbital delegation"});
  const lead = canvas.locator('[data-orbit-body="project:science:research"]');
  await canvas.scrollIntoViewIfNeeded();
  await page.mouse.move(0, 0);
  await expect(canvas).toHaveAttribute("data-orbit-moving", "true");
  const initial = await lead.getAttribute("style");
  await expect(lead).not.toHaveAttribute("style", initial!);
  const bounds = (await lead.boundingBox())!;
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  await expect(canvas).toHaveAttribute("data-orbit-moving", "false");
  await page.emulateMedia({reducedMotion: "reduce"});
  await page.mouse.move(0, 0);
  await expect(canvas).toHaveAttribute("data-orbit-moving", "false");
  await page.evaluate(() => window.__supernovaTimelineMock?.setConstellationStatus("running"));
  await expect(lead).toHaveAttribute("data-active", "true", {timeout: 15000});
  await page.evaluate(() => window.__supernovaTimelineMock?.setConstellationStatus("completed"));
  await expect(lead).toHaveAttribute("data-active", "false", {timeout: 15000});
  await expect(lead).toBeVisible();
  await expect(lead).toHaveAttribute("aria-label", /completed/);
  await page.emulateMedia({reducedMotion: "no-preference"});
  await expect(canvas).toHaveAttribute("data-orbit-moving", "true");
});

test("groups a thousand participants and opens a searched historical result", async ({page, timeline}) => {
  await timeline.openMainSession();
  await page.getByRole("button", {name: "Open chat solar system", exact: true}).click();
  await page.evaluate(() => window.__supernovaTimelineMock?.setOrbitSize(1000));
  const canvas = page.getByRole("group", {name: "Orbital delegation"});
  await expect(canvas.getByRole("button", {name: /Earlier work/})).toBeVisible({timeout: 15000});
  expect(await canvas.locator("[data-orbit-body]").count()).toBeLessThanOrEqual(25);
  expect(await canvas.locator(".constant-orb").count()).toBeLessThanOrEqual(9);
  await expect(canvas.locator(".chat-orbit-drift")).toHaveCount(0);
  await canvas.getByRole("button", {name: /Earlier work/}).click();
  const members = page.getByRole("region", {name: "Orbit participants"});
  await expect(members.getByRole("listitem")).toHaveCount(12);
  await members.getByRole("button", {name: "Next participants"}).click();
  await expect(members.getByRole("status")).toContainText("13–24");
  await members.getByRole("textbox", {name: "Find a participant"}).fill("Participant 0999");
  await expect(members.getByRole("listitem")).toHaveCount(1);
  await members.getByRole("button", {name: /Participant 0999/}).click();
  await page.getByRole("region", {name: "Selected work: Participant 0999", exact: true}).getByRole("button", {name: "Result", exact: true}).click();
  await expect(page.getByRole("region", {name: "Selected work: Participant 0999", exact: true})).toContainText("Recorded result 999");
  await expect(canvas.locator('[data-orbit-body="run:bulk-999"]')).toHaveAttribute("aria-pressed", "true");
  await expect(page).toHaveURL(`/session/${TIMELINE_SESSION_ID}`);
});

test("fits narrow chat panes and pauses when saved activity becomes stale", async ({page, timeline}) => {
  await page.setViewportSize({width: 880, height: 900});
  await timeline.openMainSession();
  await page.getByRole("button", {name: "Open chat solar system", exact: true}).click();
  const canvas = page.getByRole("group", {name: "Orbital delegation"});
  await canvas.scrollIntoViewIfNeeded();
  await page.emulateMedia({reducedMotion: "reduce"});
  const geometry = await canvas.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    return [...element.querySelectorAll("[data-orbit-body]")].map((body) => {
      const box = body.getBoundingClientRect();
      return {left: box.left - bounds.left, right: bounds.right - box.right, top: box.top - bounds.top, bottom: bounds.bottom - box.bottom};
    });
  });
  expect(geometry.every((box) => Object.values(box).every((edge) => edge >= -1))).toBe(true);
  const targets = await canvas.evaluate((element) =>
    [...element.querySelectorAll<HTMLElement>(".chat-orbit-body")].map((body) => {
      const box = body.getBoundingClientRect();
      const hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
      return {name: body.getAttribute("aria-label"), reachable: hit !== null && body.contains(hit)};
    })
  );
  expect(
    targets.filter((target) => !target.reachable),
    "nearby moons must each receive clicks at their visible center"
  ).toEqual([]);
  await page.evaluate(() => window.__supernovaTimelineMock?.setConstellationStatus("offline"));
  await expect(canvas).toHaveAttribute("data-orbit-stale", "true", {timeout: 20000});
  await expect(canvas).toHaveAttribute("data-orbit-moving", "false");
  await expect(page.getByText("Last saved activity · updates unavailable.", {exact: false})).toBeVisible();
  await expect(canvas.getByRole("button", {name: /^Research lead/})).toBeVisible();
});
