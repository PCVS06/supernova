import {mkdirSync, renameSync, writeFileSync} from "node:fs";
import {join} from "node:path";
import {randomUUID} from "node:crypto";
import {expect, test} from "@playwright/test";
import type {HarnessRun} from "@supernova/contracts/harnesses/schemas";

test("inspects a saved worker conversation, polls public updates, and returns to its owning chat", async ({page}) => {
  const root = process.env.SUPERNOVA_E2E_ROOT;
  if (!root) throw new Error("An isolated SUPERNOVA_E2E_ROOT is required.");
  const path = join(root, "projects", randomUUID());
  mkdirSync(path, {recursive: true});
  const projectId = Buffer.from(encodeURIComponent(path)).toString("base64").replaceAll("=", "");
  await page.addInitScript(
    ({id, projectPath}) => {
      localStorage.setItem(
        "supernova-projects",
        JSON.stringify({state: {projects: [{id, path: projectPath, name: "worker-e2e", addedAt: new Date().toISOString(), pinned: false, pinnedSessionIds: []}]}, version: 0})
      );
    },
    {id: projectId, projectPath: path}
  );
  await page.goto(`/session/new?projectId=${encodeURIComponent(projectId)}`);
  await page.locator('[contenteditable="true"]').first().fill("Owning worker chat");
  await page.getByRole("button", {name: "Send message"}).click();
  await expect(page.getByText("Runtime response: Owning worker chat", {exact: true})).toBeVisible();
  const sessionId = new URL(page.url()).pathname.split("/").at(-1)!;
  const runId = randomUUID();
  const at = new Date().toISOString();
  const run: HarnessRun = {
    id: runId,
    chatId: sessionId,
    harnessId: "science",
    projectId,
    projectName: "Worker lab",
    projectPath: path,
    agentName: "source-verifier",
    role: "specialist",
    task: "Verify the cited claim.",
    status: "running",
    startedAt: at,
    updatedAt: at,
    revision: 4,
    instructions: [{kind: "role", label: "Verifier role", owner: "Source verifier", content: "Prefer primary sources."}],
    runtime: {capturedAt: at, systemPrompt: "Recorded worker instructions", tools: ["read"], skills: ["source-verification"], contextFiles: ["evidence.md"]},
    output: "",
    activity: "Using read",
    events: [{at, message: "Using read"}],
    transcript: {
      omittedEntries: 0,
      entries: [
        {id: "response", kind: "assistant", at, text: "Checking the primary source.", streaming: false, truncated: false},
        {id: "read", kind: "tool", at, toolName: "read", status: "running", input: '{"path":"evidence.md"}', inputTruncated: false, outputTruncated: false, mediaOmitted: false},
      ],
    },
  };
  // The API reads a real, chat-owned receipt from its isolated server home; no RPC or UI response is mocked.
  const mode = process.env.SUPERNOVA_SERVER_DEV === "1" ? "dev" : "userdata";
  const directory = join(root, mode, "agent", "harnesses", "runs", sessionId);
  mkdirSync(directory, {recursive: true});
  const save = (value: HarnessRun): void => {
    const temporary = join(directory, `${runId}.tmp`);
    writeFileSync(temporary, JSON.stringify({run: value, pid: process.pid}), {mode: 0o600});
    renameSync(temporary, join(directory, `${runId}.json`));
  };
  save(run);
  await page.goto(`/session/${sessionId}/run/${runId}`);
  await expect(page.getByRole("heading", {name: "Source verifier", exact: true})).toBeVisible();
  const conversation = page.getByRole("region", {name: "Worker conversation"});
  await expect(conversation.getByText("Verify the cited claim.", {exact: true})).not.toBeVisible();
  await conversation
    .locator("summary")
    .filter({hasText: /^Assignment$/})
    .click();
  await expect(conversation.getByText("Verify the cited claim.", {exact: true})).toBeVisible();
  await conversation
    .locator("summary")
    .filter({hasText: /^Conversation$/})
    .click();
  await expect(conversation.getByText("Checking the primary source.", {exact: true})).toBeVisible();
  await conversation.getByRole("button", {name: "read Running", exact: true}).click();
  await expect(conversation.getByRole("region", {name: "Tool input"})).toContainText("evidence.md");
  const tool = run.transcript!.entries[1]!;
  if (tool.kind !== "tool") throw new Error("Expected tool fixture");
  save({
    ...run,
    updatedAt: new Date().toISOString(),
    transcript: {omittedEntries: 0, entries: [run.transcript!.entries[0]!, {...tool, status: "completed", output: "Source verified", outputTruncated: true}]},
  });
  await expect(conversation.getByRole("region", {name: "Tool output"})).toContainText("Source verified");
  await expect(conversation.getByText("Output shortened in this recording.", {exact: true})).toBeVisible();

  await page
    .locator("summary")
    .filter({hasText: /^Activity$/})
    .click();
  await expect(page.getByRole("region", {name: "Worker activity"})).toContainText("Using read");
  await page
    .locator("summary")
    .filter({hasText: /^Context$/})
    .click();
  await expect(page.getByRole("region", {name: "Worker context"})).toContainText("Prefer primary sources.");
  await page
    .locator("summary")
    .filter({hasText: /^Resources/})
    .click();
  await expect(page.getByText("source-verification", {exact: true})).toBeVisible();
  await page
    .locator("summary")
    .filter({hasText: /^Runtime/})
    .click();
  await expect(page.getByText("Recorded worker instructions", {exact: true})).toBeVisible();
  await page.getByRole("link", {name: "Back to chat"}).click();
  await expect(page).toHaveURL(`/session/${sessionId}`);

  save({...run, status: "completed", transcript: undefined, output: "Historical final result"});
  await page.goto(`/session/${sessionId}/run/${runId}`);
  await page.reload();
  await expect(page.getByText("No transcript recorded for this run.", {exact: false})).not.toBeVisible();
  await expect(page.getByText("Verify the cited claim.", {exact: true})).not.toBeVisible();
  await page.screenshot({path: "/tmp/radian-context-20260913/agent-result.png"});
  await expect(page.getByText("Historical final result", {exact: true})).toBeVisible();
});
