import {Type} from "typebox";
import type {ToolDefinition} from "@earendil-works/pi-coding-agent";
import type {HarnessSnapshot} from "@supernova/contracts/harnesses/schemas";
import {HarnessStore} from "@supernova/agent-runtime/layers/harnesses/internal/harness-store";

const parameters = Type.Object({
  action: Type.Union([Type.Literal("list"), Type.Literal("update")]),
  projectId: Type.Optional(Type.String()),
  expectedRevision: Type.Optional(Type.Number()),
  name: Type.Optional(Type.String()),
  color: Type.Optional(Type.String()),
  beforeProjectId: Type.Optional(Type.String()),
});

/** Bounded presentation management. No path, prompt, permission or deletion capability. */
export function createHarnessViewTool(snapshot: HarnessSnapshot, store: HarnessStore): ToolDefinition<typeof parameters> {
  return {
    name: "manage_lab_view",
    label: "Organize lab view",
    parameters,
    executionMode: "sequential",
    description:
      "Manage Radian sidebar presentation when the user asks. First list to get IDs and revision, then update a lab's name, hex color, or position (beforeProjectId; empty string moves to end). Science Space may manage its known labs; a lab lead may only update its own lab. Never deletes work, changes prompts or folders, or grants research approval. Report every change to the user.",
    async execute(_id, params) {
      let library = await store.list();
      if (params.action === "update") {
        if (!params.projectId || params.expectedRevision === undefined) throw new Error("List the labs first, then provide projectId and expectedRevision.");
        library = await store.updateView(
          snapshot,
          {projectId: params.projectId, name: params.name, color: params.color, beforeProjectId: params.beforeProjectId},
          params.expectedRevision
        );
      }
      const allowed = new Set([snapshot.project.id, ...(snapshot.delegation?.projects.map((project) => project.id) ?? [])]);
      const labs = library.projects
        .filter((project) => project.harnessId === snapshot.harness.id && allowed.has(project.id))
        .toSorted((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map(({id, name, color, order}) => ({id, name, color, order}));
      const details = {revision: library.revision, action: params.action, labs, note: "Presentation only. Project files and instructions unchanged."};
      return {content: [{type: "text", text: JSON.stringify(details)}], details};
    },
  };
}
