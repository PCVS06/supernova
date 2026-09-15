import {createHash} from "node:crypto";
import {Type} from "typebox";
import type {ToolDefinition} from "@earendil-works/pi-coding-agent";
import type {HarnessSnapshot} from "@supernova/contracts/harnesses/schemas";
import type {HarnessStore} from "@supernova/agent-runtime/layers/harnesses/internal/harness-store";
import type {HarnessRunStore} from "@supernova/agent-runtime/layers/harnesses/internal/harness-run-store";

const parameters = Type.Object({
  action: Type.Union([Type.Literal("list"), Type.Literal("status"), Type.Literal("create"), Type.Literal("assign"), Type.Literal("update")]),
  projectId: Type.Optional(Type.String()),
  expectedRevision: Type.Optional(Type.Integer({minimum: 0})),
  name: Type.Optional(Type.String({minLength: 1, maxLength: 120})),
  path: Type.Optional(Type.String()),
  createDirectory: Type.Optional(Type.Boolean()),
  systemPrompt: Type.Optional(Type.String({maxLength: 200000})),
  contextInstructions: Type.Optional(Type.String({maxLength: 200000})),
});

/** Gives a harness lead a revision-checked project directory and recorded execution status. */
export function createHarnessProjectTool(snapshot: HarnessSnapshot, store: HarnessStore, trace?: {chatId: string; store: HarnessRunStore}): ToolDefinition<typeof parameters> {
  return {
    name: "manage_projects",
    label: "Manage projects",
    parameters,
    executionMode: "sequential",
    description:
      "Manage this harness's projects. List first for current IDs and revision. Create or assign a named absolute folder (createDirectory:true explicitly creates a new folder); update a project's instructions for future runs. Existing chats keep their pinned instructions. Mutations need expectedRevision. Status reads recorded project runs, including independent chats; it never claims an unobserved chat is idle. Use lab_agent to give its project lead a task. With background:true the runId can receive a correction through subagent action:message, or be joined with wait/cancel. Report changes and delivery receipts to the user.",
    async execute(callId, params) {
      let library = await store.projectsForLead(snapshot);
      if (params.action !== "list" && params.action !== "status") {
        if (params.expectedRevision === undefined) throw new Error("List projects first and provide expectedRevision.");
        const projectId =
          params.projectId ??
          (params.action === "update"
            ? undefined
            : `project-${createHash("sha256")
                .update(`${trace?.chatId ?? snapshot.project.id}:${callId}`)
                .digest("hex")
                .slice(0, 24)}`);
        if (!projectId) throw new Error("Provide the projectId to update.");
        await store.manageProject(snapshot, {...params, action: params.action, projectId}, params.expectedRevision);
        library = await store.projectsForLead(snapshot);
      }
      const projects = library.projects.filter((project) => project.parentProjectId === snapshot.project.id && (!params.projectId || project.id === params.projectId));
      if (params.projectId && !projects.length) throw new Error("Choose a child project in this harness.");
      const runs = params.action === "status" && trace ? await trace.store.listRecentRuns({projectId: params.projectId, limit: 200}) : [];
      const details = {
        revision: library.revision,
        projects: projects.map(({id, name, path, parentProjectId}) => ({id, name, path, parentProjectId})),
        ...(params.action === "status" && {
          runs: runs
            .filter((run) => projects.some((project) => project.id === run.projectId))
            .map(({id, chatId, projectId, parentRunId, agentName, status, activity, updatedAt}) => ({id, chatId, projectId, parentRunId, agentName, status, activity, updatedAt})),
          note: "Recorded runs, up to 200 recent receipts. No receipt does not mean an independent chat is idle. Only runs assigned by this lead can be steered here.",
        }),
      };
      return {content: [{type: "text", text: JSON.stringify(details)}], details};
    },
  };
}
