import {Link} from "@tanstack/react-router";
import {useWorkspaceOverview} from "@/features/workspace/hooks/use-workspace-overview";
import {useWorkspaceMapStore} from "@/features/workspace/stores/workspace-map-store";

const rowClass = "block truncate rounded-md px-1 py-1 hover:bg-white/5";

/** Unresolved work across harnesses stays reachable without duplicating the full agent hierarchy. */
export default function WorkspaceAttentionList() {
  const query = useWorkspaceOverview();
  const detail = useWorkspaceMapStore((state) => state.sidebarDetail);
  const items = query.model.items
    .filter((item) => item.attention)
    // A waiting proposal is decided in the inbox; every other entry is answered in its own chat.
    .filter((item) => (item.kind === "curator" ? item.harnessId : item.sessionId))
    .filter((item) => detail || ["goal", "queued", "curator"].includes(item.kind))
    .filter((item) => item.kind !== "workflow" || !query.model.items.some((step) => step.runId === item.runId && step.kind === "step" && step.attention))
    .toSorted((a, b) => a.id.localeCompare(b.id));
  if (!items.length) return null;
  return (
    <details className="mx-2 mb-2 px-2 py-1">
      <summary className="cursor-pointer text-xs font-medium">
        Needs you · {items.length}
        {query.error || query.data?.errors.length ? " · last saved" : ""}
      </summary>
      <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto">
        {items.map((item) => (
          <li key={item.id} className="text-xs">
            {item.kind === "curator" ? (
              <Link className={rowClass} to="/inbox/$harnessId" params={{harnessId: item.harnessId!}} title={`${item.label} · ${item.detail}`}>
                {item.label} · {item.status}
              </Link>
            ) : (
              <Link
                className={rowClass}
                to="/session/$sessionId"
                params={{sessionId: item.sessionId!}}
                onClick={() => useWorkspaceMapStore.getState().requestFocus(item.sessionId!, item.id)}
                title={`${item.label} · ${item.detail}`}
              >
                {item.label} · {item.status}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </details>
  );
}
