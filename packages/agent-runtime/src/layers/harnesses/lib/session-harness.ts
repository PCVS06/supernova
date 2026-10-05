import {randomUUID, createHash} from "node:crypto";
import {realpath} from "node:fs/promises";
import {basename} from "node:path";
import type {CollaborationMode, HarnessSnapshot} from "@supernova/contracts/harnesses/schemas";
import {harnessStore} from "@supernova/agent-runtime/layers/harnesses/internal/harness-store";
import type {HarnessStore} from "@supernova/agent-runtime/layers/harnesses/internal/harness-store";
import {resolveHarnessProject} from "@supernova/agent-runtime/layers/harnesses/lib/harness-config";

/** Resolves a chat-local setup without moving the workspace or editing saved projects. */
export async function resolveSessionHarness(
  sessionId: string,
  cwd: string,
  harnessId: string,
  mode: CollaborationMode,
  current?: HarnessSnapshot,
  store: HarnessStore = harnessStore
): Promise<HarnessSnapshot> {
  const path = await realpath(cwd);
  const pinned = current ?? (await store.forSession(sessionId, path));
  const selection = {id: randomUUID(), harnessId, mode, selectedAt: new Date().toISOString()};
  // A mode change preserves this chat's pinned instructions and model overrides.
  if (pinned?.harness.id === harnessId) return {...pinned, selection: {...selection, name: pinned.harness.name}};
  const library = await store.list();
  const harness = library.harnesses.find((item) => item.id === harnessId);
  if (!harness) throw new Error("Harness not found. Refresh the setups and choose an available harness.");
  const linked = library.projects.find((item) => item.harnessId === harnessId && item.path === path);
  const snapshot = linked
    ? await store.resolveProject(linked.id)
    : resolveHarnessProject(
        harness,
        {
          id: `chat-${createHash("sha256").update(`${harnessId}:${path}`).digest("hex").slice(0, 24)}`,
          harnessId,
          path,
          name: pinned?.project.name ?? basename(path),
          systemPrompt: pinned?.project.systemPrompt ?? "",
          contextInstructions: pinned?.project.contextInstructions ?? "",
          planningDocuments: pinned?.project.planningDocuments,
          agents: [],
        },
        library.revision
      );
  return {...snapshot, selection: {...selection, name: harness.name}};
}
