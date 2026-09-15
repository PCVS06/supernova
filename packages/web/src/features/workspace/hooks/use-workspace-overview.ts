import {use} from "react";
import {WorkspaceOverviewContext} from "@/features/workspace/contexts/workspace-overview-context";
import {useQuery} from "@tanstack/react-query";
import {Effect} from "effect";
import {eq} from "@/rpc/effect-query";
import {RpcProtocolClientService} from "@/rpc/transport/client";
import {useHarnessLibrary} from "@/features/harnesses/hooks/api/use-harnesses";
import {buildWorkspaceModel} from "@/features/workspace/lib/build-workspace-model";
import {useProjectsStore} from "@/features/projects/stores/projects-store";
import {useWorkspaceMapStore} from "@/features/workspace/stores/workspace-map-store";

/** One query key supplies the same compact snapshot to navigation and every map. */
export function useWorkspaceOverviewQuery() {
  const library = useHarnessLibrary();
  const projects = useProjectsStore((state) => state.projects);
  const readAt = useWorkspaceMapStore((state) => state.readAt);
  const query = useQuery(
    eq.queryOptions({
      queryKey: ["agent", "workspace-overview", projects.map((project) => project.path).toSorted()],
      staleTime: 1500,
      structuralSharing: (previous, incoming) => {
        const old = previous as {revision?: number} | undefined;
        const next = incoming as {revision?: number};
        return old?.revision !== undefined && next.revision !== undefined && old.revision > next.revision ? previous : incoming;
      },
      refetchInterval: (state) =>
        state.state.data?.runs.some((run) => run.status === "running" || run.status === "starting") || state.state.data?.workflows.some((run) => run.status === "running")
          ? 2000
          : 8000,
      refetchOnWindowFocus: true,
      queryFn: () =>
        Effect.flatMap(Effect.service(RpcProtocolClientService), (rpc) =>
          rpc.getWorkspaceOverview({projectPaths: projects.map((project) => project.path), pinnedSessionIds: projects.flatMap((project) => project.pinnedSessionIds ?? [])})
        ),
    })
  );
  const model = buildWorkspaceModel({
    library: library.data,
    overview: query.data,
    readAt,
    pinnedSessions: new Set(projects.flatMap((project) => project.pinnedSessionIds ?? [])),
    pinnedProjects: new Set(projects.filter((project) => project.pinned).map((project) => project.path)),
  });
  return {...query, model, library: library.data};
}

/** Reads the shell's already-normalized model without creating a per-star polling loop. */
export function useWorkspaceOverview() {
  const overview = use(WorkspaceOverviewContext);
  if (!overview) throw new Error("WorkspaceOverviewProvider is required.");
  return overview;
}
