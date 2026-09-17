import {mkdirSync, realpathSync, symlinkSync, writeFileSync} from "node:fs";
import {join} from "node:path";
import {randomUUID} from "node:crypto";
import {expect, test as base} from "@playwright/test";
import type {HarnessConfig} from "@supernova/contracts/harnesses/schemas";
import {createRpcClient} from "@/rpc/transport/client";

const test = base.extend<{audit: {client: ReturnType<typeof createRpcClient>; harness: HarnessConfig; path: string}}>({
  audit: async ({baseURL}, provide) => {
    if (!baseURL) throw new Error("Runtime tests require a web server URL.");
    const client = createRpcClient(`http://127.0.0.1:${process.env.PLAYWRIGHT_RUNTIME_PORT ?? 4318}`);
    try {
      const id = randomUUID();
      const path = join(process.env.SUPERNOVA_E2E_ROOT!, "projects", id);
      mkdirSync(join(path, "docs"), {recursive: true});
      const library = await client.run((rpc) => rpc.getHarnessLibrary({}));
      const source = library.harnesses.find((harness) => harness.id === "coding")!;
      const harness = {...source, id: `audit-${id}`, name: `Audit ${id.slice(0, 8)}`, context: {...source.context, files: []}, curator: undefined};
      await client.run((rpc) => rpc.saveHarness({harness, expectedRevision: library.revision}));
      await provide({client, harness, path});
    } finally {
      await client.dispose();
    }
  },
});

test.use({contextOptions: {reducedMotion: "reduce"}});

test("context-file Enter stays editable, then saves two paths and survives reload", async ({page, audit}) => {
  await page.goto(`/settings/harness/${audit.harness.id}/instructions`);
  const files = page.getByRole("textbox", {name: "Context files", exact: true});
  await files.fill("docs/details.md");
  await files.press("End");
  await files.press("Enter");
  await expect(files).toHaveValue("docs/details.md\n");
  await files.pressSequentially("README.md");
  await files.press("Enter");
  await page.getByRole("button", {name: "Save changes", exact: true}).click();
  // The save bar only exists while there is something to save.
  await expect(page.getByRole("group", {name: "Unsaved changes", exact: true})).toHaveCount(0);
  const library = await audit.client.run((rpc) => rpc.getHarnessLibrary({}));
  expect(library.harnesses.find((harness) => harness.id === audit.harness.id)!.context.files).toEqual(["docs/details.md", "README.md"]);
  await page.reload();
  await expect(files).toHaveValue("docs/details.md\nREADME.md");
});

test("Discard resets daily and quiet times immediately and loading current settings replaces their drafts", async ({page, audit}) => {
  await page.goto(`/settings/harness/${audit.harness.id}/curator`);
  const daily = page.getByRole("textbox", {name: "Daily sweep time", exact: true});
  const from = page.getByRole("textbox", {name: "Quiet hours from", exact: true});
  const to = page.getByRole("textbox", {name: "Quiet hours to", exact: true});
  await daily.fill("21:30");
  await from.fill("22:00");
  await to.fill("07:00");
  await page.getByRole("button", {name: "Discard", exact: true}).click();
  for (const input of [daily, from, to]) await expect(input).toHaveValue("");
  await expect(page.getByRole("group", {name: "Unsaved changes", exact: true})).toHaveCount(0);
  await daily.fill("2");
  await expect(page.getByRole("alert").filter({hasText: "Use HH:MM"})).toBeVisible();
  await page.getByRole("button", {name: "Discard", exact: true}).click();
  await expect(daily).toHaveValue("");
  await daily.fill("20:00");
  const library = await audit.client.run((rpc) => rpc.getHarnessLibrary({}));
  await audit.client.run((rpc) =>
    rpc.saveHarness({
      harness: {...audit.harness, curator: {enabled: false, dailyAt: "09:00", maxCostUsdPerRun: 0.5, maxCostUsdPerDay: 2, autoApply: {memory: false, planningLog: false}}},
      expectedRevision: library.revision,
    })
  );
  await page.getByRole("button", {name: "Load current settings", exact: true}).click({timeout: 20_000});
  await page.getByRole("dialog", {name: "Load current settings?", exact: true}).getByRole("button", {name: "Load current settings", exact: true}).click();
  await expect(daily).toHaveValue("09:00");
  await expect(page.getByRole("group", {name: "Unsaved changes", exact: true})).toHaveCount(0);
});

test("a missing harness finishes loading and provides a working way back to the library", async ({page}) => {
  await page.goto(`/settings/harness/missing-${randomUUID()}/overview`);
  await expect(page.getByText("This harness no longer exists.", {exact: false})).toBeVisible();
  await expect(page.getByText("Loading harness…", {exact: true})).toHaveCount(0);
  await page.getByRole("link", {name: "Open Settings › Harnesses", exact: true}).click();
  await expect(page).toHaveURL(/\/settings\/harnesses$/);
});

test("opening a symlink creates one canonical project and gives its composer an accessible name", async ({page, audit}) => {
  const alias = `${audit.path}-alias`;
  symlinkSync(audit.path, alias, "dir");
  await page.goto("/");
  await page.getByRole("button", {name: `New project in ${audit.harness.name}`, exact: true}).click();
  await page.getByPlaceholder("Search folders", {exact: true}).fill(alias);
  await page.getByRole("button", {name: "Open project path", exact: true}).click();
  await expect(page.getByRole("dialog", {name: "Open project", exact: true})).toHaveCount(0);
  const section = page.getByRole("region", {name: `${audit.harness.name} harness`, exact: true});
  const toggle = section.getByRole("button", {name: new RegExp(`^${audit.harness.name}`)});
  if ((await toggle.getAttribute("aria-expanded")) === "false") await toggle.click();
  await expect(section.locator('[data-sidebar-level="project"]')).toHaveCount(1);
  const canonical = realpathSync(audit.path);
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("supernova-projects")!).state.projects as {path: string}[]);
  expect(stored.map((project) => project.path)).toEqual([canonical]);
  await section.getByRole("button", {name: /^New chat in /}).click();
  const editor = page.getByRole("textbox", {name: "Message", exact: true});
  await expect(editor).toHaveAttribute("aria-multiline", "true");
  await expect(editor).toHaveAttribute("aria-disabled", "false");
  await editor.fill("Accessible draft survives");
  await expect(editor).toHaveText("Accessible draft survives");
  await page.getByRole("button", {name: "Send message", exact: true}).click();
  await expect(page.getByText("Runtime response: Accessible draft survives", {exact: true})).toBeVisible();
  await expect(section.locator('[data-sidebar-level="project"]')).toHaveCount(1);
});

test("Markdown images load and local links, Unicode paths and headings open within the same chat", async ({page, audit}) => {
  writeFileSync(
    join(audit.path, "README.md"),
    "# Overview\n\n[Details](docs/details.md#evidence)\n\n![Audit chart](docs/chart.svg)\n\n[Unicode notes](docs/notes%20%C3%BC.md)\n\n[Outside](../outside.md)"
  );
  writeFileSync(join(audit.path, "docs/details.md"), "# Details\n\n## Evidence\n\nVerified evidence.\n\n[Back](../README.md#overview)");
  writeFileSync(join(audit.path, "docs/notes ü.md"), "# Unicode notes\n\nPreserved filename.");
  writeFileSync(join(audit.path, "docs/chart.svg"), '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="80"><rect width="120" height="80" fill="white"/></svg>');
  const session = await audit.client.run((rpc) => rpc.createSession({projectPath: audit.path}));
  await page.addInitScript(() => {
    localStorage.setItem(
      "supernova-workspace-panel-v3",
      JSON.stringify({state: {activeView: "files", tabs: ["files"], visible: true, pickerVisible: false, width: 760}, version: 0})
    );
  });
  await page.goto(`/session/${session.id}`);
  await page.getByRole("button", {name: "README.md", exact: true}).click();
  const chart = page.getByRole("img", {name: "Audit chart", exact: true});
  await expect(chart).toBeVisible();
  await expect.poll(() => chart.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBe(120);
  await expect(chart).toHaveAttribute("src", /^data:image\/svg\+xml;base64,/);
  await expect(page.getByRole("link", {name: "Outside", exact: true})).toHaveCount(0);
  await page.getByRole("link", {name: "Details", exact: true}).click();
  await expect(page.getByRole("heading", {name: "Evidence", exact: true})).toBeVisible();
  await expect(page).toHaveURL(`/session/${session.id}`);
  await page.getByRole("link", {name: "Back", exact: true}).click();
  await page.getByRole("link", {name: "Unicode notes", exact: true}).click();
  await expect(page.getByRole("heading", {name: "Unicode notes", exact: true})).toBeVisible();
  await expect(page).toHaveURL(`/session/${session.id}`);
});
