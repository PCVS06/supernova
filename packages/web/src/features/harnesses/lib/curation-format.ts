import type {CurationTarget} from "@supernova/contracts/harnesses/schemas";
import {agentLabel} from "@/features/harnesses/lib/agent-identity";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** Short age of a timestamp, falling back to a date once a week has passed. */
export function relativeTime(at: string, now: number = Date.now()): string {
  const elapsed = now - new Date(at).getTime();
  if (Number.isNaN(elapsed)) return at;
  if (elapsed < MINUTE) return "just now";
  if (elapsed < HOUR) return `${Math.floor(elapsed / MINUTE)} min ago`;
  if (elapsed < DAY) return `${Math.floor(elapsed / HOUR)} h ago`;
  if (elapsed < 7 * DAY) return `${Math.floor(elapsed / DAY)} d ago`;
  return new Date(at).toLocaleDateString();
}

/** Names the artefact a proposal changes, in the same words the settings panels use. */
export function curationTargetLabel(target: CurationTarget, projectName?: string): string {
  const project = projectName ? agentLabel(projectName) : target.projectId;
  const suffix = project ? ` · ${project}` : "";
  switch (target.kind) {
    case "harness":
      return "Harness instructions";
    case "context":
      return "Context rules";
    case "project":
      return `Project instructions${suffix}`;
    case "role":
      return `Role · ${agentLabel(target.agentName ?? "")}${suffix}`;
    case "document":
      return `${target.path ?? "Document"}${suffix}`;
    case "memory":
      return `Memory · ${target.recordId ?? ""}${suffix}`;
  }
}

/** Spend of one review, blank when the server reported none. */
export function spendLabel(spentUsd?: number): string {
  return spentUsd === undefined ? "" : `$${spentUsd.toFixed(2)}`;
}
