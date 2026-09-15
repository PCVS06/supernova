import {existsSync, mkdirSync, readFileSync, writeFileSync} from "node:fs";
import {join} from "node:path";
import {randomUUID} from "node:crypto";
import {expect, test} from "@playwright/test";

test.use({contextOptions: {reducedMotion: "reduce"}});

test("runs a shared-source diamond and keeps its live entry at the initiating chat event", async ({page}) => {
  const root = process.env.SUPERNOVA_E2E_ROOT!;
  const path = join(root, "projects", randomUUID());
  mkdirSync(path, {recursive: true});
  const projectId = Buffer.from(encodeURIComponent(path)).toString("base64").replaceAll("=", "");
  await page.addInitScript(
    ({projectId, path}) =>
      localStorage.setItem("supernova-projects", JSON.stringify({state: {projects: [{id: projectId, path, name: "Parallel lab", addedAt: new Date().toISOString()}]}, version: 0})),
    {projectId, path}
  );
  await page.goto(`/session/new?projectId=${encodeURIComponent(projectId)}`);
  await page.locator('[contenteditable="true"]').first().fill("Run parallel acceptance workflow");
  await page.getByRole("button", {name: "Send message"}).click();
  const control = join(root, "control");
  try {
    await expect.poll(() => existsSync(join(control, "started-workflow-technical")) && existsSync(join(control, "started-workflow-economic"))).toBe(true);
    const calls = () =>
      readFileSync(join(control, "workflow-steps.jsonl"), "utf8")
        .trim()
        .split("\n")
        .map((line) => JSON.parse(line).step);
    expect(calls()[0]).toBe("source");
    expect(calls().slice(1).toSorted()).toEqual(["economic", "technical"]);
    const entry = page.locator("[data-workflow-run]");
    await expect(entry).toHaveCount(1);
    const system = page.getByRole("region", {name: "Chat solar system", exact: true});
    await expect(system.locator(".chat-orbit-sun .constant-orb")).toHaveAttribute("data-constant", "pi");
    await expect(system.locator('.chat-orbit-body[data-active="true"]')).toHaveCount(2);
    await expect(system).toHaveAttribute("data-expanded", "false");
    await entry.getByRole("button", {name: /^View workflow participants:/}).click();
    await expect(system).toHaveAttribute("data-expanded", "true");
    const members = page.getByRole("region", {name: "Orbit participants"});
    await expect(members.getByRole("listitem")).toHaveCount(4);
    await members.getByRole("button", {name: /workflow-reviewer · technical/}).click();
    const inspector = page.getByRole("region", {name: "Selected work: workflow-reviewer · technical", exact: true});
    await expect(inspector).toBeVisible();
    writeFileSync(join(control, "release-workflow-technical"), "");
    await expect(inspector).toContainText("technical validated result");
    expect(calls()).not.toContain("join");
    writeFileSync(join(control, "release-workflow-economic"), "");
    await expect(entry).toContainText("4/4 complete");
    expect(calls()).toHaveLength(4);
    expect(calls().at(-1)).toBe("join");
    const route = page.url();
    await expect(page.getByText("Parallel workflow completed.", {exact: true})).toBeVisible();
    await expect(inspector).toBeVisible();
    await page.reload();
    await expect(page).toHaveURL(route);
    await expect(page.locator("[data-workflow-run]")).toHaveCount(1);
    await expect(page.locator("[data-workflow-run]")).toContainText("4/4 complete");
    await page.locator('[contenteditable="true"]').first().fill("Run parallel acceptance workflow");
    await page.getByRole("button", {name: "Send message"}).click();
    await expect(page.locator("[data-workflow-run]")).toHaveCount(2);
    await expect(page.locator("[data-workflow-run]").last()).toContainText("4/4 complete");
    const runIds = await page.locator("[data-workflow-run]").evaluateAll((entries) => entries.map((entry) => entry.getAttribute("data-workflow-run")));
    expect(new Set(runIds).size).toBe(2);
    expect(calls().filter((step) => step === "source")).toHaveLength(2);
    await page.reload();
    await expect(page.locator("[data-workflow-run]")).toHaveCount(2);
  } finally {
    writeFileSync(join(control, "release-workflow-technical"), "");
    writeFileSync(join(control, "release-workflow-economic"), "");
  }
});
