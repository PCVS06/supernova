import {basename, isAbsolute} from "node:path";
import {readFile} from "node:fs/promises";
import type {WorkspaceOverviewResult} from "@supernova/contracts/harnesses/procedures";
import {readControlsOverview} from "@supernova/agent-runtime/layers/session-runtime/internal/session-controls-store";
import type {PiSdkServiceShape} from "@supernova/agent-runtime/layers/pi-sdk";
import {harnessStore} from "@supernova/agent-runtime/layers/harnesses/internal/harness-store";
import {harnessRunStore} from "@supernova/agent-runtime/layers/harnesses/internal/harness-run-store";
import {curatorStore} from "@supernova/agent-runtime/layers/curator/curator-store";
import {mapPiSessionsToSummaries} from "@supernova/agent-runtime/layers/projects/pi-session-mapper";

const recentPerProject = 150;
let cached: {key: string; pending: boolean; until: number; promise: Promise<WorkspaceOverviewResult>} | undefined;
let revision = Date.now();
const lastProjects = new Map<string, WorkspaceOverviewResult["projects"][number]>();

/** Batches project reads with a small concurrency ceiling, retaining partial failures explicitly. */
async function collectOverview(piSdk: PiSdkServiceShape, projectPaths: readonly string[], pinnedSessionIds: readonly string[]): Promise<WorkspaceOverviewResult> {
  const library = await harnessStore.describe();
  const observedProjects = [
    ...library.projects,
    ...projectPaths.filter((path) => !library.projects.some((project) => project.path === path)).map((path) => ({id: `workspace:${path}`, path, name: basename(path)})),
  ];
  const errors: string[] = [];
  const result: WorkspaceOverviewResult = {
    revision: ++revision,
    capturedAt: new Date().toISOString(),
    projects: [],
    runs: [],
    workflows: [],
    controls: [],
    curators: [],
    activityTotals: [],
    errors,
  };
  const projects: Array<WorkspaceOverviewResult["projects"][number]> = [];
  const runs: Array<WorkspaceOverviewResult["runs"][number]> = [];
  const workflows: Array<WorkspaceOverviewResult["workflows"][number]> = [];
  const controls: Array<WorkspaceOverviewResult["controls"][number]> = [];
  const curators: Array<WorkspaceOverviewResult["curators"][number]> = [];
  // Summary indexes only: this scan never opens worker transcripts or workflow outputs.
  const activity = await harnessRunStore.workspaceActivity();
  runs.push(...activity.runs);
  workflows.push(...activity.workflows);
  errors.push(...activity.errors);
  const importantChats = new Set([...pinnedSessionIds, ...[...runs, ...workflows].filter((run) => !["completed", "cancelled"].includes(run.status)).map((run) => run.chatId)]);
  for (let offset = 0; offset < observedProjects.length; offset += 3) {
    await Promise.all(
      observedProjects.slice(offset, offset + 3).map(async (project) => {
        try {
          const sessions = await piSdk.SessionManager.list(project.path);
          // Read only sidecars, never create sessions/runtimes or resume paused work to observe it.
          for (const session of sessions) {
            try {
              const stored = JSON.parse(await readFile(`${session.path}.controls.json`, "utf8"));
              const state = readControlsOverview(stored);
              if (state.sessionId !== session.id) throw new Error("Control ownership mismatch");
              if (state.goal || state.queue.length || state.error) {
                controls.push(state);
                importantChats.add(state.sessionId);
              }
            } catch (error) {
              if ((error as NodeJS.ErrnoException).code !== "ENOENT") errors.push(`Goal/queue state unavailable for ${session.id}.`);
            }
          }
          const summaries = mapPiSessionsToSummaries(sessions);
          const summary = {
            projectId: project.id,
            projectPath: project.path,
            total: summaries.length,
            sessions: summaries.filter((session, index) => index < recentPerProject || importantChats.has(session.id)),
          };
          projects.push(summary);
          lastProjects.set(project.id, summary);
        } catch {
          errors.push(`Conversations unavailable for ${project.name}.`);
          const last = lastProjects.get(project.id);
          if (last) projects.push(last);
        }
      })
    );
  }
  for (const harness of library.harnesses) {
    try {
      const pending = (await curatorStore.listProposals(harness.id)).filter((proposal) => proposal.status === "pending");
      curators.push({harnessId: harness.id, pending: pending.length});
    } catch {
      errors.push(`Curator decisions unavailable for ${harness.name}.`);
    }
  }
  const visibleChats = new Set(projects.flatMap((project) => project.sessions.map((session) => session.id)));
  return {
    ...result,
    activityTotals: activity.totals,
    projects,
    runs: runs.filter((run) => visibleChats.has(run.chatId)),
    workflows: workflows.filter((run) => visibleChats.has(run.chatId)),
    controls,
    curators,
  };
}

/** Shares one bounded overview refresh across sidebar, maps and clients; reconnects fetch a new snapshot. */
export function getWorkspaceOverview(piSdk: PiSdkServiceShape, projectPaths: readonly string[] = [], pinnedSessionIds: readonly string[] = []): Promise<WorkspaceOverviewResult> {
  if (projectPaths.length > 200 || projectPaths.some((path) => !isAbsolute(path))) return Promise.reject(new Error("Choose up to 200 absolute workspace paths."));
  const paths = [...new Set(projectPaths)].toSorted();
  const key = JSON.stringify([paths, pinnedSessionIds.toSorted()]);
  if (cached?.key === key && (cached.pending || cached.until > Date.now())) return cached.promise;
  const promise = collectOverview(piSdk, paths, pinnedSessionIds);
  cached = {key, pending: true, until: Date.now() + 1500, promise};
  void promise.then(
    () => {
      if (cached?.promise === promise) {
        cached.pending = false;
        cached.until = Date.now() + 1500;
      }
    },
    () => {}
  );
  void promise.catch(() => {
    if (cached?.promise === promise) cached = undefined;
  });
  return promise;
}
