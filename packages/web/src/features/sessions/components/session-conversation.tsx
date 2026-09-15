import type {Session} from "@supernova/contracts/sessions/schemas";
import {useCallback, useState} from "react";
import Icon from "@/components/ui/icon";
import IconButton from "@/components/ui/icon-button";
import type {AppEnvironment} from "@/lib/app-environment";
import AgentMark from "@/features/harnesses/components/agent-mark";
import {useHarnessLibrary} from "@/features/harnesses/hooks/api/use-harnesses";
import {agentColor} from "@/features/harnesses/lib/agent-identity";
import {useHarnessNavigationStore} from "@/features/harnesses/stores/harness-navigation-store";
import ChatRoleBadge from "@/features/sessions/components/chat-role-badge";
import CheckpointConflictDialog from "@/features/sessions/components/checkpoint-conflict-dialog";
import ChatHistoryControls from "@/features/sessions/components/composer/chat-history-controls";
import CheckpointNavigationNotice from "@/features/sessions/components/composer/checkpoint-navigation-notice";
import ComposerToolbarGroup from "@/features/sessions/components/composer/composer-toolbar-group";
import ModelPicker from "@/features/sessions/components/composer/pickers/model-picker";
import ThinkingLevelPicker from "@/features/sessions/components/composer/pickers/thinking-level-picker";
import SessionComposer from "@/features/sessions/components/composer/session-composer";
import SessionComposerSkeleton from "@/features/sessions/components/composer/session-composer-skeleton";
import SessionContextIndicator from "@/features/sessions/components/composer/session-context-indicator";
import SessionControlsTray from "@/features/sessions/components/composer/session-controls-tray";
import UndoneTurnsDrawer from "@/features/sessions/components/composer/undone-turns-drawer";
import SessionActionsMenu from "@/features/sessions/components/session-actions-menu";
import SessionLayout from "@/features/sessions/components/session-layout";
import SessionTitleText from "@/features/sessions/components/session-title-text";
import SessionTimeline from "@/features/sessions/components/timeline/session-timeline";
import {useRenameSession as useRenameSessionMutation} from "@/features/sessions/hooks/api/use-rename-session";
import {useSessionControls} from "@/features/sessions/hooks/api/use-session-controls";
import {useGeneralSettingsStore} from "@/features/settings/stores/general-settings-store";
import {useComposerAttachments} from "@/features/sessions/hooks/use-composer-attachments";
import {useComposerDraft} from "@/features/sessions/hooks/use-composer-draft";
import {useComposerModelSelection} from "@/features/sessions/hooks/use-composer-model-selection";
import {useSessionTimeline} from "@/features/sessions/hooks/use-session-timeline";
import {sessionComposerDraftKey} from "@/features/sessions/stores/composer-drafts-store";
import {useSessionVisitsStore} from "@/features/sessions/stores/session-visits-store";
import {useWorkspacePanelStore} from "@/features/workspace/stores/workspace-panel-store";
import {useInlineRename} from "@/hooks/use-inline-rename";
import {useMountEffect} from "@/lib/use-mount-effect";
import {useConnectionStore} from "@/rpc/connection-store";

/** Applies loaded project identity once; key changes select the new project. */
function SelectChatProject(props: {harnessId: string; projectId: string}) {
  const {harnessId, projectId} = props;
  useMountEffect(() => useHarnessNavigationStore.getState().selectProject(harnessId, projectId));
  return null;
}

interface SessionConversationProps {
  readonly appEnvironment: AppEnvironment;
  /** Closes this pane; absent for the routed chat. */
  readonly onClose?: () => void;
  readonly session: Session;
  /** A pane is a secondary chat beside the routed one and keeps its chrome minimal. */
  readonly variant?: "pane" | "primary";
}

/** One chat, from its header to its composer, with no dependency on the route it is shown by. */
export default function SessionConversation(props: SessionConversationProps) {
  const {appEnvironment, onClose, session, variant = "primary"} = props;
  const primary = variant === "primary";
  const offline = useConnectionStore((state) => state.status !== "connected" || state.server?.status === "stopped" || state.server?.status === "restarting");
  const library = useHarnessLibrary();
  const project = library.data?.projects.find((item) => item.path === session.projectPath);
  const lead = project !== undefined && library.data?.harnesses.some((item) => item.coordinatorProjectId === project.id) === true;
  const latestTurn = session.turns.at(-1);
  const completedTurnId = latestTurn?.status === "completed" && !latestTurn.events.some((event) => "error" in event && event.error) ? latestTurn.id : undefined;

  const markSessionVisited = useSessionVisitsStore((state) => state.markSessionVisited);
  const setWorkspaceTarget = useWorkspacePanelStore((state) => state.setTarget);
  const renameSessionMutation = useRenameSessionMutation();

  // Opening a chat clears its unseen activity, and the routed chat is the one
  // the workspace panel browses. Both callers remount per chat.
  useMountEffect(() => {
    markSessionVisited(session.id, session.updatedAt);
    if (primary) setWorkspaceTarget({projectPath: session.projectPath, sessionId: session.id});
  });
  const {
    draftName,
    handleBlur: handleRenameBlur,
    handleChange: handleRenameChange,
    handleClick: handleRenameClick,
    handleFocus: handleRenameFocus,
    handleInputRef: renameInputRef,
    handleKeyDown: handleRenameKeyDown,
    renaming,
    startRenaming,
  } = useInlineRename({initialValue: session.title, onSave: (title) => renameSessionMutation.mutate({sessionId: session.id, title})});

  const modelSelection = useComposerModelSelection({initialSelection: session.modelReference, sessionId: session.id});
  const composerDraftKey = sessionComposerDraftKey(session.id);
  const composerDraft = useComposerDraft({key: composerDraftKey});
  const stream = useSessionTimeline({modelReference: modelSelection.modelReference, sessionId: session.id, sessionTurns: session.turns});
  const controls = useSessionControls(session.id, stream.streamStatus !== "idle");
  const [goalEdit, setGoalEdit] = useState<{id: string; objective: string} | null>(null);
  const goalEditor = controls.state?.goal ? goalEdit : null;
  const [undoneDrawerHeight, setUndoneDrawerHeight] = useState(0);
  const [historyDetailsOpen, setHistoryDetailsOpen] = useState(false);

  const composerDisabled = modelSelection.isPending || !modelSelection.modelReference;
  const composerActionDisabled = composerDisabled || stream.streamStatus !== "idle";
  const thinkingLevels = modelSelection.selectedModelDetails?.thinkingLevels ?? [];
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

  const handleUndo = (): void => {
    if (stream.streamStatus !== "idle") return;

    const turn = session.turns.at(-1);
    if (turn) composerDraft.replaceContentParts(turn.userMessage.contentParts);
    stream.slashCommandActions.undo?.();
  };

  const handleRedo = (): void => {
    if (stream.streamStatus !== "idle") return;

    composerDraft.replaceContentParts(session.undoneTurns[1]?.userMessage.contentParts ?? []);
    stream.slashCommandActions.redo?.();
  };

  const handleRevertToMessage = (turnId: string): void => {
    if (stream.streamStatus !== "idle") return;

    const turn = [...session.turns, ...session.undoneTurns].find((item) => item.id === turnId);
    if (turn) composerDraft.replaceContentParts(turn.userMessage.contentParts);
    stream.revertToMessage(turnId);
  };

  const handleRestoreUndoneTurn = (turnId: string): void => {
    if (stream.streamStatus !== "idle") return;

    const restoredTurnIndex = session.undoneTurns.findIndex((turn) => turn.id === turnId);
    composerDraft.replaceContentParts(session.undoneTurns[restoredTurnIndex + 1]?.userMessage.contentParts ?? []);
    stream.revertToMessage(turnId);
  };

  const handleUndoneDrawerHeightChange = useCallback((height: number): void => {
    setUndoneDrawerHeight((current) => (Math.abs(current - height) < 0.5 ? current : height));
  }, []);

  return (
    <>
      {primary && project && <SelectChatProject key={`${project.harnessId}:${project.id}`} harnessId={project.harnessId} projectId={project.id} />}
      <SessionLayout
        actions={
          !primary ? (
            <IconButton className="size-7" label="Close this pane" onClick={onClose} title="Close this pane">
              <Icon name="x" size="sm" />
            </IconButton>
          ) : undefined
        }
        appEnvironment={appEnvironment}
        badge={
          <ChatRoleBadge role={project ? (lead ? "harness-lead" : "project-lead") : "chat"} title={project ? `${project.name} · ${session.projectPath}` : session.projectPath} />
        }
        subtitle={project ? `${project.name} · ${session.projectPath}` : session.projectPath}
        color={project ? (project.color ?? (lead ? "#ffffff" : agentColor(project.id))) : undefined}
        mark={<AgentMark className="size-6" color={project?.color} kind={lead ? "orchestrator" : "lead"} name={project?.id ?? session.projectPath} />}
        variant={variant}
        attachmentDropOverlayVisible={composerAttachments.isDraggingFiles}
        attachmentDropZoneProps={composerAttachments.dropZoneProps}
        composer={
          modelSelection.isPending ? (
            <SessionComposerSkeleton />
          ) : (
            <SessionComposer
              key={`${composerDraftKey}:${composerDraft.revision}`}
              attachments={composerAttachments}
              disabled={composerDisabled || !!controls.state?.error}
              draft={composerDraft}
              onInterrupt={stream.stopStreaming}
              onSteer={stream.steerTurn}
              onSubmit={stream.submitMessage}
              onQueue={(contentParts) =>
                modelSelection.modelReference
                  ? controls.update({
                      type: "enqueue",
                      contentParts,
                      modelReference: modelSelection.modelReference,
                      captureCheckpoints: useGeneralSettingsStore.getState().captureCheckpoints,
                    })
                  : false
              }
              onStartGoal={(objective) =>
                modelSelection.modelReference
                  ? controls.update({
                      ...(controls.state?.goal ? {type: "update_goal", id: controls.state.goal.id} : {type: "start_goal"}),
                      objective,
                      modelReference: modelSelection.modelReference,
                      captureCheckpoints: useGeneralSettingsStore.getState().captureCheckpoints,
                    })
                  : false
              }
              goalEditor={
                goalEditor
                  ? {
                      objective: goalEditor.objective,
                      onSubmit: async () => {
                        if (!modelSelection.modelReference) return false;
                        const accepted = await controls.update({
                          type: "update_goal",
                          id: goalEditor.id,
                          objective: goalEditor.objective,
                          modelReference: modelSelection.modelReference,
                          captureCheckpoints: useGeneralSettingsStore.getState().captureCheckpoints,
                        });
                        if (accepted) setGoalEdit(null);
                        return accepted;
                      },
                    }
                  : undefined
              }
              hasGoal={!!controls.state?.goal}
              controlsPending={controls.pending || offline}
              queuePending={(controls.state?.queue.length ?? 0) > 0}
              controlTray={
                <>
                  {stream.checkpointConflict.open && stream.checkpointConflict.inline && (
                    <CheckpointNavigationNotice
                      reason={stream.checkpointConflict.reason}
                      disabled={offline}
                      onCancel={stream.checkpointConflict.cancel}
                      onConfirm={stream.checkpointConflict.confirm}
                    />
                  )}
                  <SessionControlsTray
                    state={controls.state}
                    error={controls.error}
                    pending={controls.pending || offline}
                    working={stream.streamStatus === "streaming"}
                    onAction={async (action) => {
                      const accepted = await controls.update(action);
                      if (accepted && action.type === "clear_goal") setGoalEdit(null);
                      return accepted;
                    }}
                    onRefresh={() => void controls.refresh()}
                    goalDraft={goalEditor?.objective}
                    onGoalEdit={(objective) =>
                      setGoalEdit((current) => (objective !== null && controls.state?.goal ? {id: current?.id ?? controls.state.goal.id, objective} : null))
                    }
                  />
                </>
              }
              projectPath={session.projectPath}
              slashCommandActions={{...stream.slashCommandActions, redo: handleRedo, undo: handleUndo}}
              streamStatus={stream.streamStatus}
              toolbarControls={
                <div className="flex min-w-0 items-center gap-1">
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
              toolbarActions={
                <>
                  <ChatHistoryControls
                    current={session.turns.length}
                    remaining={session.undoneTurns.length}
                    disabled={stream.streamStatus !== "idle" || offline}
                    pending={stream.streamStatus === "checkpoint-navigating"}
                    detailsOpen={historyDetailsOpen}
                    onToggleDetails={() => setHistoryDetailsOpen((open) => !open)}
                    onStep={stream.stepCheckpoint}
                  />
                  <SessionContextIndicator context={stream.liveContext ?? session.context} />
                </>
              }
              topExtension={
                <>
                  {historyDetailsOpen && (
                    <UndoneTurnsDrawer
                      disabled={composerActionDisabled || offline}
                      onHeightChange={handleUndoneDrawerHeightChange}
                      onRevertToMessage={handleRestoreUndoneTurn}
                      turns={session.undoneTurns}
                    />
                  )}
                </>
              }
            />
          )
        }
        timeline={
          <SessionTimeline
            key={session.id}
            constellation={{sessionId: session.id, projectPath: session.projectPath, title: session.title}}
            identityConstant={project ? (lead ? "tau" : "phi") : "pi"}
            completedTurnId={completedTurnId}
            stopping={stream.streamStatus === "stopping"}
            bottomOverlayHeight={historyDetailsOpen ? undoneDrawerHeight : 0}
            compacting={stream.streamStatus === "compacting"}
            isStreaming={stream.streamStatus === "streaming" || stream.streamStatus === "compacting"}
            items={stream.committedTimelineItems}
            liveItems={stream.liveTimelineItems}
            onRevertToMessage={handleRevertToMessage}
            sessionId={session.id}
            streamError={stream.streamError}
          />
        }
        title={
          renaming ? (
            <input
              className="block h-5 min-w-0 w-64 truncate border-0 bg-transparent p-0 text-sm font-medium leading-5 text-ink outline-none"
              onBlur={handleRenameBlur}
              onChange={handleRenameChange}
              onClick={handleRenameClick}
              onFocus={handleRenameFocus}
              onKeyDown={handleRenameKeyDown}
              ref={renameInputRef}
              value={draftName}
            />
          ) : (
            <SessionTitleText className="block truncate" title={session.title} />
          )
        }
        titleActions={<SessionActionsMenu onRename={startRenaming} projectPath={session.projectPath} sessionId={session.id} sessionTitle={session.title} />}
      />
      <CheckpointConflictDialog
        onCancel={stream.checkpointConflict.cancel}
        onConfirm={stream.checkpointConflict.confirm}
        open={stream.checkpointConflict.open && !stream.checkpointConflict.inline}
        reason={stream.checkpointConflict.reason}
        preview={stream.checkpointConflict.preview}
        message={stream.checkpointConflict.message}
        turnsBefore={stream.checkpointConflict.turnsBefore}
        turnsAfter={stream.checkpointConflict.turnsAfter}
      />
    </>
  );
}
