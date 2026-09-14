import {test, expect} from "@e2e/support/timeline-fixture";
import {TIMELINE_SESSION_ID} from "@e2e/mocks/timeline-data";

test.use({contextOptions: {reducedMotion: "reduce"}});

test("keeps the current chat open through sending, streaming and completion", async ({page, timeline}) => {
  await timeline.openMainSession();
  await timeline.sendMessage("Keep this chat open", {awaitBottom: false});
  await expect(page).toHaveURL(`/session/${TIMELINE_SESSION_ID}`);
  await expect(page.getByLabel("Message composer")).toBeVisible();
  await timeline.waitForLineGrowth(5);
  await timeline.completeMessage();
  await expect(page).toHaveURL(`/session/${TIMELINE_SESSION_ID}`);
  await expect(page.locator('[contenteditable="true"]').first()).toBeEditable();
});

test("keeps the chat compact and unfolds its identity into nested work on demand", async ({page, timeline}) => {
  await timeline.openMainSession();
  const system = page.getByRole("region", {name: "Chat solar system", exact: true});
  await expect(system).toBeVisible();
  await expect(system).toHaveAttribute("data-expanded", "false");
  expect((await system.boundingBox())!.height).toBeLessThanOrEqual(80);
  await expect(system.getByRole("button", {name: /^Research lead/})).toHaveCount(0);
  await system.getByRole("button", {name: "Open chat solar system", exact: true}).click();
  await expect(system).toHaveAttribute("data-expanded", "true");
  await expect(system.locator(".chat-orbit-sun .constant-orb")).toHaveAttribute("data-constant", "tau");
  await expect(system.locator(".chat-orbit-sun")).toHaveCount(1);
  await expect(system.locator('[data-orbit-track="run:research-lead"]')).toHaveCount(1);
  await expect(system.locator("[data-orbit-satellite]")).toHaveCount(2);
  await expect(page.locator(".workspace-map, .delegation-network")).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(system).toHaveAttribute("data-expanded", "false");
  await expect(system.getByRole("button", {name: "Open chat solar system", exact: true})).toBeFocused();
  expect((await system.boundingBox())!.height).toBeLessThanOrEqual(80);
});

test("goal suggestions remain visible and clickable above the composer", async ({page, timeline}) => {
  await timeline.openMainSession();
  const editor = page.locator('[contenteditable="true"]').first();
  await editor.fill("/goal");
  const suggestion = page.getByRole("button", {name: /^Goal Keep working toward an outcome/});
  await expect(suggestion).toBeVisible();
  const exposed = await suggestion.evaluate((element) => {
    const box = element.getBoundingClientRect();
    const center = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
    return center !== null && element.contains(center);
  });
  expect(exposed, "goal suggestion must not be clipped by the composer").toBe(true);
  await suggestion.click();
  await expect(page.getByLabel("Goal draft")).toBeVisible();
  await expect(suggestion).toHaveCount(0);
});

test("saves orbital and sidebar choices in General and keeps them after reload", async ({page, timeline}) => {
  await timeline.openMainSession();
  await page.goto("/settings/general");
  await page.getByRole("combobox", {name: "Orbit detail"}).selectOption("compact");
  await page.getByRole("switch", {name: "Orbital motion", exact: true}).uncheck();
  await page.getByRole("switch", {name: "Detailed sidebar activity"}).check();
  await page.reload();
  await expect(page.getByRole("combobox", {name: "Orbit detail"})).toHaveValue("compact");
  await expect(page.getByRole("switch", {name: "Detailed sidebar activity"})).toBeChecked();
  await expect(page.getByRole("switch", {name: "Orbital motion", exact: true})).not.toBeChecked();
  await page.goto(`/session/${TIMELINE_SESSION_ID}`);
  await page.getByRole("button", {name: "Open chat solar system", exact: true}).click();
  const canvas = page.getByRole("group", {name: "Orbital delegation"});
  await expect(canvas).toHaveAttribute("data-orbit-moving", "false");
  await page.getByRole("button", {name: "Orbit options", exact: true}).click();
  await expect(page.getByRole("combobox", {name: "Orbit detail"})).toHaveValue("compact");
  await expect(page.getByRole("button", {name: "Resume orbital motion"})).toBeVisible();
});

test("reveals sidebar controls on hover, expands agents under their chat and opens their result", async ({page, timeline}) => {
  await timeline.openMainSession();
  const sidebar = page.getByRole("complementary", {name: "Workspace ledger"});
  const chat = sidebar.getByRole("button", {name: "Open chat: Timeline stress session", exact: true});
  const row = chat.locator("..");
  const actions = row.locator(".sidebar-row-actions");
  await page.getByLabel("Message composer").hover();
  await expect(actions).toHaveCSS("opacity", "0");
  const before = await chat.boundingBox();
  await chat.hover();
  await expect(actions).toHaveCSS("opacity", "1");
  expect(await chat.boundingBox()).toEqual(before);
  const expand = row.getByRole("button", {name: "Expand agents in Timeline stress session"});
  await expect(expand).toHaveCSS("opacity", "1");
  await expect(sidebar.getByRole("list", {name: "Agents in this chat"})).toHaveCount(0);
  await expand.click();
  const agents = sidebar.getByRole("list", {name: "Agents in this chat"});
  await expect(agents.getByRole("link")).toHaveCount(4);
  const marks = [
    sidebar.locator('[data-sidebar-level="harness"] > div .constant-orb').first(),
    sidebar.locator('[data-sidebar-level="lead"] .constant-orb').first(),
    chat.getByRole("img").locator("svg"),
    agents.getByRole("link").first().locator(".constant-orb"),
  ];
  const markBounds = await Promise.all(marks.map((mark) => mark.boundingBox()));
  expect(markBounds.map((box) => box!.width)).toEqual([40, 32, 20, 16]);
  const centers = markBounds.map((box) => box!.x + box!.width / 2);
  for (let index = 1; index < centers.length; index++) {
    expect(centers[index]! - centers[index - 1]!).toBeGreaterThanOrEqual(12);
    expect(centers[index]! - centers[index - 1]!).toBeLessThanOrEqual(14);
  }
  await expect(row.getByRole("button", {name: "Collapse agents in Timeline stress session"}).locator("svg")).toHaveCSS("width", "12px");
  await agents.getByRole("link", {name: "Open Literature researcher conversation", exact: true}).click();
  await expect(page).toHaveURL(`/session/${TIMELINE_SESSION_ID}/run/literature`);
  await expect(page.getByRole("heading", {name: "Literature researcher", exact: true})).toBeVisible();
  await expect(sidebar.getByRole("list", {name: "Agents in this chat"})).toBeVisible();
  await sidebar.getByRole("button", {name: "Collapse agents in Timeline stress session"}).click();
  await expect(sidebar.getByRole("list", {name: "Agents in this chat"})).toHaveCount(0);
  await page.getByRole("link", {name: "Back to chat"}).click();
  await page.getByRole("button", {name: "Open chat solar system", exact: true}).click();
  const canvas = page.getByRole("group", {name: "Orbital delegation"});
  await expect(canvas.locator(".chat-orbit-sun .constant-orb")).toHaveAttribute("data-constant", "tau");
  await canvas.getByRole("button", {name: /^Literature researcher/}).click();
  await expect(page.getByRole("region", {name: "Selected work: Literature researcher · collect", exact: true})).toBeVisible();
  await expect(page).toHaveURL(`/session/${TIMELINE_SESSION_ID}`);
  await page.getByRole("link", {name: "Open agent conversation", exact: true}).click();
  await expect(page).toHaveURL(`/session/${TIMELINE_SESSION_ID}/run/literature`);
});

test("pins a configured chat from its menu and preserves ordering and the visible toggle", async ({page, timeline}) => {
  await timeline.openMainSession();
  const sidebar = page.getByRole("complementary", {name: "Workspace ledger"});
  await sidebar.getByRole("button", {name: "Expand chats in Research", exact: true}).click();
  const list = sidebar.getByRole("list", {name: "Chats in Research", exact: true});
  const chat = list.getByRole("button", {name: "Open chat: Research conversation 2", exact: true});
  await chat.hover();
  const row = chat.locator("..");
  const unpinnedPath = await row.getByRole("button", {name: "Pin chat", exact: true}).locator("svg").innerHTML();
  await row.getByRole("button", {name: "Chat actions for Research conversation 2", exact: true}).click();
  await page.getByRole("menuitem", {name: "Pin chat", exact: true}).click();
  await expect(row.getByRole("button", {name: "Unpin chat", exact: true})).toHaveAttribute("aria-pressed", "true");
  await expect(list.locator('button[aria-label^="Open chat:"]').first()).toHaveAttribute("aria-label", "Open chat: Research conversation 2");
  expect(await row.getByRole("button", {name: "Unpin chat", exact: true}).locator("svg").innerHTML()).not.toEqual(unpinnedPath);
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem("supernova-projects")!).state.projects.find((p: {path: string}) => p.path.endsWith("/research")).pinnedSessionIds)
  ).toContain("research-2");
  await row.getByRole("button", {name: "Unpin chat", exact: true}).click();
  await expect(row.getByRole("button", {name: "Pin chat", exact: true})).toHaveAttribute("aria-pressed", "false");
});

test("opens curator proposals directly from the footer inbox beside theme and help", async ({page, timeline}) => {
  await timeline.openMainSession();
  const sidebar = page.getByRole("complementary", {name: "Workspace ledger"});
  const utilities = sidebar.getByRole("navigation", {name: "Workspace utilities"});
  const inbox = utilities.getByRole("link", {name: "Inbox", exact: true});
  const theme = utilities.getByRole("button", {name: /Use .* theme/});
  const help = utilities.getByRole("link", {name: "Open help", exact: true});
  const bounds = await Promise.all([inbox.boundingBox(), theme.boundingBox(), help.boundingBox()]);
  expect(bounds.every((box) => box && Math.abs(box.y - bounds[0]!.y) < 1)).toBe(true);
  await expect(sidebar.getByLabel("Curator inbox", {exact: true})).toHaveCount(0);
  await inbox.click();
  await expect(page).toHaveURL(/\/inbox\/science/);
  await expect(page.getByTestId("curation-inbox").getByRole("button", {name: "Approve", exact: true})).toBeVisible();
  // The inbox sits in the home layout, so the chats stay beside it and settings never open.
  await expect(sidebar).toBeVisible();
  await expect(page.getByRole("heading", {name: "Inbox", exact: true})).toBeVisible();
});
