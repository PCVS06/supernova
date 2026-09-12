import type {ToolDefinition} from "@earendil-works/pi-coding-agent";
import {Type} from "typebox";

const parameters = Type.Object({
  goalId: Type.String({description: "The ID of the active goal attached to this turn."}),
  status: Type.Union([Type.Literal("completed"), Type.Literal("blocked")]),
  summary: Type.String({minLength: 1, maxLength: 4000, description: "What was achieved and checked, or the specific input, permission or configuration needed."}),
});

/** Creates a report tool whose runtime gate prevents stale, idle or unrelated goal updates. */
export function createReportGoalResultTool(report: (goalId: string, status: "completed" | "blocked", summary: string) => Promise<void>): ToolDefinition<typeof parameters> {
  return {
    name: "report_goal_result",
    label: "Report goal result",
    description:
      "Report the active chat goal completed or blocked. Only use for the goal ID supplied in this turn. This records an agent-reported result, not independent verification or permission to take new actions.",
    parameters,
    async execute(_callId, args) {
      await report(args.goalId, args.status, args.summary);
      return {content: [{type: "text", text: `Recorded agent-reported ${args.status}. Automatic goal continuation stopped.`}], details: {status: args.status, verified: false}};
    },
  };
}
