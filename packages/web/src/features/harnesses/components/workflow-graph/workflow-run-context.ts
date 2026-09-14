import {createContext} from "react";
import type {WorkflowRunSummary} from "@supernova/contracts/harnesses/schemas";
import type {MathematicalConstant} from "@/components/brand/constant-identity";

/** One shared progress subscription per conversation, independent of mounted virtual rows. */
export interface WorkflowViewState {
  selectedId?: string;
}
export const WorkflowRunContext = createContext<{
  runs: readonly WorkflowRunSummary[];
  source: MathematicalConstant;
  stale: boolean;
  observedAt: number;
  views: Readonly<Record<string, WorkflowViewState>>;
  setView: (runId: string, update: Partial<WorkflowViewState>) => void;
} | null>(null);
