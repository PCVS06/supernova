import {Link} from "@tanstack/react-router";
import {useWorkspaceOverview} from "@/features/workspace/hooks/use-workspace-overview";
import {workspaceActivity} from "@/features/workspace/lib/build-workspace-model";
import {useWorkspaceMapStore} from "@/features/workspace/stores/workspace-map-store";

interface WorkspaceActivityLinkProps {
  sessionId: string;
}

/** Compact sidebar entry into the same work that the map explains in its owning chat. */
export default function WorkspaceActivityLink(props: WorkspaceActivityLinkProps) {
  const {sessionId} = props;
  const query = useWorkspaceOverview();
  const detail = useWorkspaceMapStore((state) => state.sidebarDetail);
  const activity = workspaceActivity(query.model.items, sessionId);
  const work = query.model.items.filter((item) => item.sessionId === sessionId && ["goal", "queued", "workflow"].includes(item.kind));
  const decisions = work.filter((item) => item.attention && (detail || item.kind === "goal" || item.kind === "queued"));
  const target = decisions[0] ?? work.find((item) => item.active) ?? (detail ? work[0] : undefined);
  if (!target) return null;
  return (
    <Link
      className="ml-8 mb-1 block rounded-md px-2 py-1 text-xs text-white hover:bg-white/5"
      to="/session/$sessionId"
      params={{sessionId}}
      onClick={() => useWorkspaceMapStore.getState().requestFocus(sessionId, target.id)}
    >
      {query.error || query.data?.errors.length ? "Last saved · " : ""}
      {activity.working > 0 ? `${activity.working} working` : "Activity"}
      {decisions.length > 0 ? ` · ${decisions.length} need attention` : !activity.working ? ` · ${work.length} recorded` : ""} ↗
    </Link>
  );
}
