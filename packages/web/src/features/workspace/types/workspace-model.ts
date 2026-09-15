export type WorkspaceKind = "harness" | "project" | "conversation" | "agent" | "curator" | "goal" | "queued" | "workflow" | "step" | "result";

/** Observed work and ownership, independent of any diagram or sidebar layout. */
export interface WorkspaceItem {
  readonly id: string;
  readonly kind: WorkspaceKind;
  readonly label: string;
  readonly detail: string;
  readonly status: string;
  readonly role?: "harness" | "orchestrator" | "project" | "specialist" | "curator";
  readonly harnessId?: string;
  readonly projectId?: string;
  readonly projectPath?: string;
  readonly sessionId?: string;
  readonly runId?: string;
  readonly stepId?: string;
  readonly updatedAt?: string;
  readonly active?: boolean;
  readonly attention?: boolean;
  readonly unread?: boolean;
  readonly pinned?: boolean;
}

export interface WorkspaceLink {
  readonly from: string;
  readonly to: string;
  readonly kind: "contains" | "delegates" | "depends" | "output" | "works-in";
  readonly label: string;
}

export interface WorkspaceModel {
  readonly items: readonly WorkspaceItem[];
  readonly links: readonly WorkspaceLink[];
}
