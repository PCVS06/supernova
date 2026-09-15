import {execFile} from "node:child_process";
import {promisify} from "node:util";
import type {CheckpointPreview} from "@supernova/contracts/session-runtime/procedures";
import type {RepositoryRestorePlan} from "@supernova/agent-runtime/layers/session-runtime/internal/shadow-repository";
import {digest} from "@supernova/agent-runtime/layers/session-runtime/lib/checkpoints/checkpoint-keys";

const exec = promisify(execFile);

/** Reads bounded diffs from app-private trees; the fingerprint binds approval to affected live content. */
export async function previewRestorePlans(plans: readonly RepositoryRestorePlan[], manualChanges: boolean, reviewContext: string): Promise<CheckpointPreview> {
  const files = plans.flatMap((plan) =>
    plan.affectedPaths.map((path) => ({
      path: plan.repository.relativeRoot === "." ? path : `${plan.repository.relativeRoot}/${path}`,
      action: plan.deletePaths.includes(path) ? ("delete" as const) : ("restore" as const),
    }))
  );
  const patches = [];
  for (const plan of plans) {
    if (!plan.affectedPaths.length) continue;
    try {
      const {stdout} = await exec(
        "git",
        [
          "--git-dir",
          plan.repository.shadowGitDir,
          "diff",
          "--no-color",
          "--no-ext-diff",
          "--no-textconv",
          "--no-renames",
          plan.safetyTreeId,
          plan.targetTreeId,
          "--",
          ...plan.affectedPaths,
        ],
        {encoding: "utf8", maxBuffer: 512 * 1024, timeout: 10_000}
      );
      patches.push({repository: plan.repository.relativeRoot, patch: stdout, unavailable: false});
    } catch {
      patches.push({repository: plan.repository.relativeRoot, patch: "Preview unavailable or exceeds 512 KiB. Inspect these files before restoring.", unavailable: true});
    }
  }
  return {
    files,
    patches,
    filesCaptured: true,
    manualChanges,
    fingerprint: digest(JSON.stringify([reviewContext, plans.map((plan) => [plan.repository.repositoryId, plan.safetyTreeId, plan.targetTreeId, plan.affectedPaths])])),
  };
}
