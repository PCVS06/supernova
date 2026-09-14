import {readFile, readdir} from "node:fs/promises";
import {join} from "node:path";
import {afterEach, describe, expect, it} from "vitest";
import type {CurationRequest} from "@supernova/contracts/harnesses/schemas";
import {createCurationRequestTool} from "@supernova/agent-runtime/layers/curator/curator-request-tool";
import {callTool, createCuratorFixture, reviewTools, writeReceipt} from "@tests/support/layers/curator-test-utils";
import type {CuratorFixture} from "@tests/support/layers/curator-test-utils";

describe("curation requests from chats", () => {
  const fixtures: CuratorFixture[] = [];
  afterEach(async () => {
    while (fixtures.length) await fixtures.pop()!.cleanup();
  });

  async function fixture() {
    const created = await createCuratorFixture();
    fixtures.push(created);
    const snapshot = await created.store.resolveProject(created.projectId);
    await created.store.bindSession("chat-1", snapshot);
    return {created, snapshot, tool: createCurationRequestTool(snapshot, "chat-1", created.curation)};
  }

  it("files one request under the harness and returns a line", async () => {
    const {created, tool} = await fixture();

    const answer = await callTool(tool, {kind: "decision", text: "We ferment at 12 degrees from now on."});

    expect(answer).toMatch(/^Sent to the Curator as decision request /);
    const directory = join(created.root, "config", "curation", created.harnessId, "requests");
    const [name] = await readdir(directory);
    const written = JSON.parse(await readFile(join(directory, name!), "utf8")) as CurationRequest;
    expect(written).toMatchObject({harnessId: "coding", projectId: created.projectId, chatId: "chat-1", kind: "decision", text: "We ferment at 12 degrees from now on."});
    expect(name).toBe(`${written.id}.json`);
    expect(Date.parse(written.at)).not.toBeNaN();
  });

  it("keeps the agent a problem is about, and lists requests newest first", async () => {
    const {created, tool} = await fixture();

    await callTool(tool, {kind: "problem", text: "reviewer answers with prose instead of JSON", agentName: "reviewer"});
    await callTool(tool, {kind: "decision", text: "We ferment at 12 degrees from now on."});

    const requests = await created.curation.listRequests(created.harnessId);
    expect(requests.map((request) => request.kind)).toEqual(["decision", "problem"]);
    expect(requests[1]?.agentName).toBe("reviewer");
    expect(await created.curation.listRequests(created.harnessId, {projectId: "project-b"})).toEqual([]);
  });

  it("is read back by read_requests and citable as evidence", async () => {
    const {created, tool} = await fixture();
    await callTool(tool, {kind: "decision", text: "We ferment at 12 degrees from now on."});
    const [request] = await created.curation.listRequests(created.harnessId);
    await writeReceipt(created.runs, {chatId: "chat-1", projectId: created.projectId, projectPath: created.projectPath});
    const {tool: curatorTool} = reviewTools(created);

    const listed = JSON.parse(await callTool(curatorTool("read_requests"), {})) as {ref: string; kind: string; text: string}[];
    expect(listed).toEqual([{ref: request!.id, kind: "decision", projectId: created.projectId, chatId: "chat-1", at: request!.at, text: request!.text}]);

    const filed = await callTool(curatorTool("propose_change"), {
      target: {kind: "harness"},
      find: "\nNever cite the source.",
      replace: "",
      rationale: "The chat reported this decision.",
      evidence: [{kind: "request", ref: request!.id, quote: request!.text}],
    });
    expect(filed).toMatch(/^Filed proposal /);
  });

  it("refuses a request citation that belongs to another harness", async () => {
    const {created} = await fixture();
    await created.curation.addRequest({
      id: "request-elsewhere",
      harnessId: "science",
      projectId: "project-z",
      chatId: "chat-9",
      kind: "problem",
      text: "another harness entirely",
      at: new Date().toISOString(),
    });

    const refused = await callTool(reviewTools(created).tool("propose_change"), {
      target: {kind: "harness"},
      find: "\nNever cite the source.",
      replace: "",
      rationale: "Cited the wrong harness.",
      evidence: [{kind: "request", ref: "request-elsewhere", quote: "another harness entirely"}],
    });

    expect(refused).toContain("request request-elsewhere (unknown id)");
  });
});
