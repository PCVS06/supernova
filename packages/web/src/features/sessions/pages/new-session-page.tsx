import type {Session, UserMessageContentPart} from "@supernova/contracts/sessions/schemas";
import {useConnectionStore} from "@/rpc/connection-store";
import {useRef, useState} from "react";
import type {CollaborationMode} from "@supernova/contracts/harnesses/schemas";
import {useQueryClient} from "@tanstack/react-query";
import {useNavigate, useRouter} from "@tanstack/react-router";
import ConstantOrb from "@/components/brand/constant-orb";
import ChatRoleBadge from "@/features/sessions/components/chat-role-badge";
import AttachmentDropOverlay from "@/features/sessions/components/attachments/attachment-drop-overlay";
import ComposerSettingsPicker from "@/features/sessions/components/composer/pickers/composer-settings-picker";
import SessionComposer from "@/features/sessions/components/composer/session-composer";
import SessionComposerSkeleton from "@/features/sessions/components/composer/session-composer-skeleton";
import {useCreateSession} from "@/features/sessions/hooks/api/use-create-session";
import {useRenameSession} from "@/features/sessions/hooks/api/use-rename-session";
import {useUpdateSessionControls} from "@/features/sessions/hooks/api/use-session-controls";
import {sessionQueryKey} from "@/features/sessions/hooks/api/use-session";
import {useComposerAttachments} from "@/features/sessions/hooks/use-composer-attachments";
import {useComposerDraft} from "@/features/sessions/hooks/use-composer-draft";
import {useComposerModelSelection} from "@/features/sessions/hooks/use-composer-model-selection";
import {newSessionComposerDraftKey, sessionComposerDraftKey, useComposerDraftsStore} from "@/features/sessions/stores/composer-drafts-store";
import {useGeneralSettingsStore} from "@/features/settings/stores/general-settings-store";
import {useSessionLiveStore} from "@/features/sessions/stores/session-live-store";
import {useRpcClient} from "@/rpc/use-rpc-client";
import {showToast} from "@/components/ui/toast-manager";
import {useHarnessLibrary} from "@/features/harnesses/hooks/api/use-harnesses";

const GOAL_CHAT_TITLE_LENGTH = 120;

interface NewSessionPageProps {
  readonly harnessProjectId?: string;
  readonly projectName: string;
  readonly projectPath: string;
}

function NewProjectSession(props: NewSessionPageProps) {
  const {harnessProjectId, projectName, projectPath} = props;

  const offline = useConnectionStore((state) => state.status !== "connected" || state.server?.status === "stopped" || state.server?.status === "restarting");
  const navigate = useNavigate();
  const router = useRouter();
  const queryClient = useQueryClient();
  const rpcClient = useRpcClient();
  const createSessionMutation = useCreateSession();
  const renameSessionMutation = useRenameSession();
  const controlsMutation = useUpdateSessionControls();
  const createdSession = useRef<Session | null>(null);
  const acceptedSession = useRef<string | null>(null);
  const acceptedLocation = useRef<string | null>(null);
  const sendMessage = useSessionLiveStore((state) => state.sendMessage);
  const library = useHarnessLibrary();
  const [setup, setSetup] = useState<{harnessId: string; mode: CollaborationMode}>();
  const project = library.data?.projects.find((item) => item.id === harnessProjectId);
  const harness = library.data?.harnesses.find((item) => item.id === (setup?.harnessId ?? project?.harnessId ?? "coding"));
  const execution = {...harness?.execution, ...(harness?.id === project?.harnessId ? project?.execution : {})};
  const modelSelection = useComposerModelSelection({
    initialSelection: execution.model ? {...execution.model, thinkingLevel: execution.effort ?? execution.model.thinkingLevel} : undefined,
    initialThinkingLevel: execution.effort,
  });

  const composerDisabled = createSessionMutation.isPending || controlsMutation.isPending || modelSelection.isPending || library.isPending || !modelSelection.modelReference;

  const thinkingLevels = modelSelection.selectedModelDetails?.thinkingLevels ?? [];

  const composerDraftKey = newSessionComposerDraftKey(projectPath);
  const composerDraft = useComposerDraft({key: composerDraftKey});
  const composerAttachments = useComposerAttachments({
    attachments: composerDraft.attachments,
    disabled: composerDisabled,
    imageSupported: modelSelection.selectedModelDetails?.capabilities.images === true,
    onAttachmentsChange: composerDraft.setAttachments,
  });

  const handleModelChange = (value: string): void => {
    const nextModel = modelSelection.findModel(value);
    if (!nextModel) return;

    if (!nextModel.capabilities.images) composerAttachments.removeUnsupportedImages();
    modelSelection.selectModel(value);
  };

  const handleSubmit = async (contentParts: readonly UserMessageContentPart[], objective?: string): Promise<boolean> => {
    const modelReference = modelSelection.modelReference;
    if (!modelReference || offline) return false;
    const submittedFrom = router.state.location.href;
    // A failed send can retry in the chat already created; never create another empty chat.
    if (acceptedSession.current) throw new Error("This chat has already started. Open it from the sidebar; your new draft has been kept.");
    const session = createdSession.current ?? (await createSessionMutation.mutateAsync({projectPath, harnessProjectId}));
    if (!createdSession.current) {
      createdSession.current = session;
      queryClient.setQueryData(sessionQueryKey(session.id), session);
    }
    if (setup) {
      const state = await rpcClient.run((rpc) => rpc.getSessionControls({sessionId: session.id}));
      const selected = state.pendingHarness ?? state.harness;
      if (selected?.harnessId !== setup.harnessId || selected.mode !== setup.mode) {
        await controlsMutation.mutateAsync({sessionId: session.id, action: {type: "set_harness", ...setup, expectedSelectionId: selected?.id ?? null}});
      }
    }
    modelSelection.assignToSession(session.id, modelReference);
    if (objective !== undefined) {
      await renameSessionMutation.mutateAsync({sessionId: session.id, title: objective.replace(/\s+/g, " ").trim().slice(0, GOAL_CHAT_TITLE_LENGTH)});
      await controlsMutation.mutateAsync({
        sessionId: session.id,
        action: {
          type: "start_goal",
          objective,
          modelReference,
          captureCheckpoints: useGeneralSettingsStore.getState().captureCheckpoints,
        },
      });
    } else if (!(await sendMessage({contentParts, modelReference, queryClient, rpcClient, sessionId: session.id}))) return false;
    acceptedSession.current = session.id;
    acceptedLocation.current = submittedFrom;
    return true;
  };

  const handleAccepted = (): void => {
    const sessionId = acceptedSession.current;
    if (!sessionId) return;
    // Goal creation sends only the objective. Carry retained attachments into its chat.
    const drafts = useComposerDraftsStore.getState();
    const remaining = drafts.drafts[composerDraftKey];
    const parts = [...(remaining?.editableContentParts ?? []), ...(remaining?.attachments ?? [])];
    if (parts.length > 0) drafts.setDraftContentParts(sessionComposerDraftKey(sessionId), parts);
    drafts.clearDraft(composerDraftKey);
    if (router.state.location.href !== acceptedLocation.current) return;
    void navigate({params: {sessionId}, to: "/session/$sessionId"}).catch(() => {
      showToast("Chat started", "The message was accepted, but this chat could not be opened. Open it from the sidebar; do not resend it.");
    });
  };

  return (
    <div {...composerAttachments.dropZoneProps} className="relative flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden px-4 py-8">
        <div className="flex max-w-full flex-col items-center gap-3 px-4">
          <ConstantOrb constant={project && project.id === harness?.coordinatorProjectId ? "tau" : "phi"} className="mb-1 size-36" />
          <h1 className="text-center text-2xl font-medium tracking-tight text-ink-strong">What would you like to work on?</h1>
          <p className="max-w-full truncate text-sm text-ink-muted" title={projectName}>
            <ChatRoleBadge role={project ? (project.id === harness?.coordinatorProjectId ? "harness-lead" : "project-lead") : "chat"} /> ·{" "}
            <span className="text-ink">{projectName}</span>
          </p>
        </div>
      </div>
      <div className="relative shrink-0">
        {modelSelection.isPending ? (
          <SessionComposerSkeleton />
        ) : (
          <SessionComposer
            key={`${composerDraftKey}:${composerDraft.revision}`}
            attachments={composerAttachments}
            disabled={composerDisabled}
            controlsPending={offline}
            draft={composerDraft}
            onSubmit={handleSubmit}
            onStartGoal={(objective) => handleSubmit([], objective)}
            onAccepted={handleAccepted}
            projectPath={projectPath}
            toolbarControls={
              <ComposerSettingsPicker
                harness={{
                  harnesses: library.data?.harnesses ?? [],
                  selected: harness ? {harnessId: harness.id, name: harness.name, mode: setup?.mode ?? "solo"} : undefined,
                  disabled: composerDisabled || offline,
                  onChange: (harnessId, mode) => setSetup({harnessId, mode}),
                }}
                model={{
                  selectedModel: modelSelection.selectedModelDetails,
                  disabled: composerDisabled,
                  models: modelSelection.availableModels,
                  onModelChange: handleModelChange,
                }}
                thinking={{
                  disabled: composerDisabled,
                  onThinkingLevelChange: modelSelection.selectThinkingLevel,
                  selectedThinkingLabel: modelSelection.selectedThinkingLabel,
                  selectedThinkingLevel: modelSelection.modelReference?.thinkingLevel,
                  thinkingLevels,
                }}
              />
            }
          />
        )}
      </div>
      {composerAttachments.isDraggingFiles && <AttachmentDropOverlay />}
    </div>
  );
}

/** Keeps creation acknowledgements and model selection scoped to the selected project. */
export default function NewSessionPage(props: NewSessionPageProps) {
  return <NewProjectSession key={`${props.projectPath}:${props.harnessProjectId ?? ""}`} {...props} />;
}
