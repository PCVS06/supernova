import {test, expect} from "@e2e/support/timeline-fixture";

test("dissolves a closing branch into its own digits before reclaiming its space", async ({page, timeline}, testInfo) => {
  await page.emulateMedia({reducedMotion: "no-preference"});
  await timeline.openMainSession();
  const sidebar = page.getByRole("complementary", {name: "Workspace ledger"});
  await sidebar.getByRole("button", {name: "Expand chats in Research", exact: true}).click();
  const chat = sidebar.getByRole("button", {name: "Open chat: Research conversation 2", exact: true});
  await expect(chat).toBeVisible();
  await sidebar.getByRole("button", {name: "Collapse chats in Research", exact: true}).evaluate((button) => {
    button.addEventListener(
      "click",
      () => {
        const row = document.querySelector('[aria-label="Open chat: Research conversation 2"]')!.closest("li")!;
        const samples: {name: number; digits: number; symbol: number; height: number}[] = [];
        Object.assign(window, {__sidebarExit: samples});
        const sample = () => {
          if (!row.isConnected) return;
          samples.push({
            name: Number(getComputedStyle(row.querySelector(".sidebar-label-name")!).opacity),
            digits: Number(getComputedStyle(row.querySelector(".sidebar-label-digits")!).opacity),
            symbol: Number(getComputedStyle(row.querySelector(".sidebar-identity")!).opacity),
            height: row.getBoundingClientRect().height,
          });
          requestAnimationFrame(sample);
        };
        requestAnimationFrame(sample);
      },
      {once: true}
    );
  });
  expect(await chat.locator(".sidebar-label-digits").textContent()).toMatch(/^1\.618033/);
  await sidebar.getByRole("button", {name: "Collapse chats in Research", exact: true}).click();
  await expect(page.locator('[aria-label="Open chat: Research conversation 2"]')).toHaveCount(0);
  const samples = await page.evaluate(() => (window as unknown as {__sidebarExit: {name: number; digits: number; symbol: number; height: number}[]}).__sidebarExit);
  expect(samples.some((sample) => sample.digits > 0.3 && sample.name < 0.5 && sample.symbol < 0.8 && sample.height > 10)).toBe(true);
  expect(samples.filter((sample) => sample.height > 1 && sample.height < 35).length).toBeGreaterThan(1);
  await sidebar.getByRole("button", {name: "Expand chats in Research", exact: true}).click();
  await expect(chat).toBeVisible();
  await expect(chat.locator(".sidebar-label-name")).toHaveCSS("opacity", "1");
  await expect(chat.locator(".sidebar-label-digits")).toHaveCSS("opacity", "0");
  await page.screenshot({path: testInfo.outputPath("sidebar-refined.png")});
});

test("reveals harness action icons and keeps separators inset", async ({page, timeline}) => {
  await timeline.openMainSession();
  const sidebar = page.getByRole("complementary", {name: "Workspace ledger"});
  const settings = sidebar.getByRole("link", {name: "Harness settings for Science"});
  const header = settings.locator("../..");
  await page.getByLabel("Message composer").hover();
  await expect(settings.locator("..")).toHaveCSS("opacity", "0");
  await header.hover();
  await expect(settings.locator("..")).toHaveCSS("opacity", "1");
  await settings.hover();
  expect((await settings.locator("svg").boundingBox())!.width).toBeGreaterThan(8);
  await expect(settings.locator("..")).toHaveCSS("opacity", "1");
  const seam = await page.locator(".workspace-content-seam").evaluate((element) => ({
    top: getComputedStyle(element, "::before").top,
    background: getComputedStyle(element, "::before").backgroundImage,
    border: getComputedStyle(element).borderLeftWidth,
  }));
  expect(seam.top).toBe("12px");
  expect(seam.background).toContain("linear-gradient");
  expect(seam.border).toBe("0px");
});

test("keeps numeric rings animated while pausing orbital travel for inspection", async ({page, timeline}) => {
  await page.emulateMedia({reducedMotion: "no-preference"});
  await timeline.openMainSession();
  await page.getByRole("button", {name: "Open chat solar system", exact: true}).click();
  const canvas = page.getByRole("group", {name: "Orbital delegation"});
  await canvas.scrollIntoViewIfNeeded();
  await page.mouse.move(0, 0);
  const lead = canvas.locator('[data-orbit-body="project:science:research"]');
  const digits = lead.locator(".constant-orb-digits").first();
  await expect(digits).toHaveCSS("animation-name", "constant-phi-grow");
  const before = await digits.evaluate((element) => getComputedStyle(element).transform);
  await expect.poll(() => digits.evaluate((element) => getComputedStyle(element).transform)).not.toBe(before);
  expect(
    await digits
      .locator("path")
      .first()
      .evaluate((element) => Number(getComputedStyle(element).opacity))
  ).toBeGreaterThanOrEqual(0.58);
  await lead.hover();
  await expect(canvas).toHaveAttribute("data-orbit-moving", "false");
  await expect(digits).toHaveCSS("animation-play-state", "running");
  await page.emulateMedia({reducedMotion: "reduce"});
  await expect(digits).toHaveCSS("animation-name", "none");
});
