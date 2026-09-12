import type {Session, UserMessageContentPart} from "@supernova/contracts/sessions/schemas";
import {useRef} from "react";
import {useQueryClient} from "@tanstack/react-query";
import {useNavigate} from "@tanstack/react-router";
import PiOrb from "@/components/brand/pi-orb";
import ChatRoleBadge from "@/features/sessions/components/chat-role-badge";
import AttachmentDropOverlay from "@/features/sessions/components/attachments/attachment-drop-overlay";
import ComposerToolbarGroup from "@/features/sessions/components/composer/composer-toolbar-group";
import ModelPicker from "@/features/sessions/components/composer/pickers/model-picker";
import ThinkingLevelPicker from "@/features/sessions/components/composer/pickers/thinking-level-picker";
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
import {agentColor} from "@/features/harnesses/lib/agent-identity";

const GOAL_CHAT_TITLE_LENGTH = 120;

interface NewSessionPageProps {
  readonly harnessProjectId?: string;
  readonly projectName: string;
  readonly projectPath: string;
}

function NewProjectSession(props: NewSessionPageProps) {
  const {harnessProjectId, projectName, projectPath} = props;

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const rpcClient = useRpcClient();
  const createSessionMutation = useCreateSession();
  const renameSessionMutation = useRenameSession();
  const controlsMutation = useUpdateSessionControls();
  const createdSession = useRef<Session | null>(null);
  const acceptedSession = useRef<string | null>(null);
  const sendMessage = useSessionLiveStore((state) => state.sendMessage);
  const library = useHarnessLibrary();
  const project = library.data?.projects.find((item) => item.id === harnessProjectId);
  const harness = library.data?.harnesses.find((item) => item.id === (project?.harnessId ?? "coding"));
  const execution = {...harness?.execution, ...project?.execution};
  const modelSelection = useComposerModelSelection({
    initialSelection: execution.model ? {...execution.model, thinkingLevel: execution.effort ?? execution.model.thinkingLevel} : undefined,
    initialThinkingLevel: execution.effort,
  });

  const composerDisabled = createSessionMutation.isPending || modelSelection.isPending || (!!harnessProjectId && library.isPending) || !modelSelection.modelReference;

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
    if (!modelReference) return false;
    // A failed send can retry in the chat already created; never create another empty chat.
    if (acceptedSession.current) throw new Error("This chat has already started. Open it from the sidebar; your new draft has been kept.");
    const session = createdSession.current ?? (await createSessionMutation.mutateAsync({projectPath, harnessProjectId}));
    if (!createdSession.current) {
      createdSession.current = session;
      queryClient.setQueryData(sessionQueryKey(session.id), session);
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
    void navigate({params: {sessionId}, to: "/session/$sessionId"}).catch(() => {
      showToast("Chat started", "The message was accepted, but this chat could not be opened. Open it from the sidebar; do not resend it.");
    });
  };

  return (
    <div {...composerAttachments.dropZoneProps} className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden px-4 pb-16 pt-4">
      <div className="flex h-[min(calc(100svh-1rem),32rem)] w-[min(calc(100vw-2rem),48rem)] flex-col items-center justify-center overflow-visible">
        <div className="mb-8 flex max-w-full flex-col items-center gap-3 px-4">
          <PiOrb className="mb-1 size-36" color={project ? (project.color ?? (project.id === harness?.coordinatorProjectId ? "#ffffff" : agentColor(project.id))) : undefined} />
          <h1 className="text-center text-2xl font-medium tracking-tight text-ink-strong">What would you like to work on?</h1>
          <p className="max-w-full truncate text-sm text-ink-muted" title={projectName}>
            <ChatRoleBadge role={project ? (project.id === harness?.coordinatorProjectId ? "harness-lead" : "project-lead") : "chat"} /> ·{" "}
            <span className="text-ink">{projectName}</span>
          </p>
        </div>
        <div className="relative w-full">
          {modelSelection.isPending ? (
            <SessionComposerSkeleton />
          ) : (
            <SessionComposer
              key={`${composerDraftKey}:${composerDraft.revision}`}
              attachments={composerAttachments}
              disabled={composerDisabled}
              draft={composerDraft}
              onSubmit={handleSubmit}
              onStartGoal={(objective) => handleSubmit([], objective)}
              onAccepted={handleAccepted}
              projectPath={projectPath}
              toolbarControls={
                <div className="flex min-w-0 items-center gap-3">
                  <ComposerToolbarGroup label="Model">
                    <ModelPicker
                      selectedModel={modelSelection.selectedModelDetails}
                      disabled={composerDisabled}
                      models={modelSelection.availableModels}
                      onModelChange={handleModelChange}
                    />
                  </ComposerToolbarGroup>
                  {thinkingLevels.length > 0 && (
                    <ComposerToolbarGroup label="Effort">
                      <ThinkingLevelPicker
                        disabled={composerDisabled}
                        onThinkingLevelChange={modelSelection.selectThinkingLevel}
                        selectedThinkingLabel={modelSelection.selectedThinkingLabel}
                        selectedThinkingLevel={modelSelection.modelReference?.thinkingLevel}
                        thinkingLevels={thinkingLevels}
                      />
                    </ComposerToolbarGroup>
                  )}
                </div>
              }
            />
          )}
        </div>
      </div>
      {composerAttachments.isDraggingFiles && <AttachmentDropOverlay />}
    </div>
  );
}

/** Keeps creation acknowledgements and model selection scoped to the selected project. */
export default function NewSessionPage(props: NewSessionPageProps) {
  return <NewProjectSession key={`${props.projectPath}:${props.harnessProjectId ?? ""}`} {...props} />;
}
