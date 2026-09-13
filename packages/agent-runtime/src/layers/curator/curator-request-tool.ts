import {randomUUID} from "node:crypto";
import {Type} from "typebox";
import type {ToolDefinition} from "@earendil-works/pi-coding-agent";
import type {HarnessSnapshot} from "@supernova/contracts/harnesses/schemas";
import {curatorStore} from "@supernova/agent-runtime/layers/curator/curator-store";
import type {CuratorStore} from "@supernova/agent-runtime/layers/curator/curator-store";

/** A request is a pointer at evidence, not the evidence itself; the Curator reads the runs and the ledger for that. */
const maxRequestChars = 500;

const parameters = Type.Object({
  kind: Type.Union([Type.Literal("decision"), Type.Literal("problem")]),
  text: Type.String({minLength: 1, maxLength: maxRequestChars}),
  agentName: Type.Optional(Type.String({maxLength: 80})),
});

/**
 * The one way a chat reaches the Curator: it files a request and goes on working.
 *
 * The review runs later and on its own evidence, so this tool writes a record and returns; it never starts a
 * review, never blocks the turn, and cannot change an instruction, a plan or the ledger by itself.
 */
export function createCurationRequestTool(snapshot: HarnessSnapshot, chatId: string, curation: CuratorStore = curatorStore): ToolDefinition<typeof parameters> {
  return {
    name: "request_curation",
    label: "Send the Curator evidence",
    description: "Send the Curator evidence: a decision the plan should record, or a repeated problem with an agent. Returns at once.",
    parameters,
    executionMode: "sequential",
    async execute(_id, params) {
      const request = await curation.addRequest({
        id: randomUUID(),
        harnessId: snapshot.harness.id,
        projectId: snapshot.project.id,
        chatId,
        kind: params.kind,
        ...(params.agentName ? {agentName: params.agentName} : {}),
        text: params.text.trim().slice(0, maxRequestChars),
        at: new Date().toISOString(),
      });
      return {content: [{type: "text", text: `Sent to the Curator as ${request.kind} request ${request.id}.`}], details: {requestId: request.id, kind: request.kind}};
    },
  };
}
