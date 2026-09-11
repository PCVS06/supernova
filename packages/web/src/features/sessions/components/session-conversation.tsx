import type {Session} from "@supernova/contracts/sessions/schemas";
import {useCallback, useEffect, useState} from "react";
import Icon from "@/components/ui/icon";
import IconButton from "@/components/ui/icon-button";
import type {AppEnvironment} from "@/lib/app-environment";
import AgentMark from "@/features/harnesses/components/agent-mark";
import {useHarnessLibrary} from "@/features/harnesses/hooks/api/use-harnesses";
import {agentColor} from "@/features/harnesses/lib/agent-identity";
import {useHarnessNavigationStore} from "@/features/harnesses/stores/harness-navigation-store";
import ChatRoleBadge from "@/features/sessions/components/chat-role-badge";
import CheckpointConflictDialog from "@/features/sessions/components/checkpoint-conflict-dialog";
import ComposerToolbarGroup from "@/features/sessions/components/composer/composer-toolbar-group";
import ModelPicker from "@/features/sessions/components/composer/pickers/model-picker";
import ThinkingLevelPicker from "@/features/sessions/components/composer/pickers/thinking-level-picker";
import SessionComposer from "@/features/sessions/components/composer/session-composer";
import SessionComposerSkeleton from "@/features/sessions/components/composer/session-composer-skeleton";
import SessionContextIndicator from "@/features/sessions/components/composer/session-context-indicator";
import UndoneTurnsDrawer from "@/features/sessions/components/composer/undone-turns-drawer";
import SessionActionsMenu from "@/features/sessions/components/session-actions-menu";
import SessionContextStrip from "@/features/sessions/components/session-context-strip";
import SessionLayout from "@/features/sessions/components/session-layout";
import SessionTitleText from "@/features/sessions/components/session-title-text";
import SplitSessionPicker from "@/features/sessions/components/split-session-picker";
import SessionTimeline from "@/features/sessions/components/timeline/session-timeline";
import {useRenameSession as useRenameSessionMutation} from "@/features/sessions/hooks/api/use-rename-session";
import {useComposerAttachments} from "@/features/sessions/hooks/use-composer-attachments";
import {useComposerDraft} from "@/features/sessions/hooks/use-composer-draft";
import {useComposerModelSelection} from "@/features/sessions/hooks/use-composer-model-selection";
import {useSessionTimeline} from "@/features/sessions/hooks/use-session-timeline";
import {sessionComposerDraftKey} from "@/features/sessions/stores/composer-drafts-store";
import {useSessionVisitsStore} from "@/features/sessions/stores/session-visits-store";
import {MAX_SPLIT_PANES, useSplitViewStore} from "@/features/sessions/stores/split-view-store";
import {useWorkspacePanelStore} from "@/features/workspace/stores/workspace-panel-store";
import {useInlineRename} from "@/hooks/use-inline-rename";
import {useMountEffect} from "@/lib/use-mount-effect";

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
  const library = useHarnessLibrary();
  const project = library.data?.projects.find((item) => item.path === session.projectPath);
  const lead = library.data?.harnesses.some((item) => item.coordinatorProjectId === project?.id) === true;
  const selectProject = useHarnessNavigationStore((state) => state.selectProject);
  useEffect(() => {
    if (project && primary) selectProject(project.harnessId, project.id);
  }, [primary, project, selectProject]);

  const markSessionVisited = useSessionVisitsStore((state) => state.markSessionVisited);
  const setWorkspaceTarget = useWorkspacePanelStore((state) => state.setTarget);
  const panes = useSplitViewStore((state) => state.panes);
  const openPane = useSplitViewStore((state) => state.openPane);
  const [splitPickerOpen, setSplitPickerOpen] = useState(false);
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
  const [undoneDrawerHeight, setUndoneDrawerHeight] = useState(0);

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

  const handleSplitSelect = (sessionId: string): void => {
    openPane(sessionId);
    setSplitPickerOpen(false);
  };

  return (
    <>
      <SessionLayout
        actions={
          primary ? (
            <IconButton
              className="size-7"
              disabled={panes.length >= MAX_SPLIT_PANES}
              label="Open a chat beside this one"
              onClick={() => setSplitPickerOpen(true)}
              title={panes.length >= MAX_SPLIT_PANES ? "Three chats are already open side by side" : "Split: open another chat beside this one"}
            >
              <Icon name="columns" size="sm" />
            </IconButton>
          ) : (
            <IconButton className="size-7" label="Close this pane" onClick={onClose} title="Close this pane">
              <Icon name="x" size="sm" />
            </IconButton>
          )
        }
        appEnvironment={appEnvironment}
        badge={<ChatRoleBadge lead={lead} title={project ? `${project.name} · ${session.projectPath}` : session.projectPath} />}
        color={project ? (project.color ?? (lead ? "#ffffff" : agentColor(project.id))) : undefined}
        contextStrip={primary ? <SessionContextStrip projectPath={session.projectPath} sessionId={session.id} /> : undefined}
        mark={
          <AgentMark className="size-6" color={project?.color ?? (lead ? "#ffffff" : undefined)} kind={lead ? "lead" : "specialist"} name={project?.id ?? session.projectPath} />
        }
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
              disabled={composerDisabled}
              draft={composerDraft}
              onInterrupt={stream.stopStreaming}
              onSteer={stream.steerTurn}
              onSubmit={stream.submitMessage}
              projectPath={session.projectPath}
              slashCommandActions={{...stream.slashCommandActions, redo: handleRedo, undo: handleUndo}}
              streamStatus={stream.streamStatus}
              toolbarControls={
                <div className="flex min-w-0 items-center gap-3">
                  <SessionContextIndicator context={stream.liveContext ?? session.context} />
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
              topExtension={
                <UndoneTurnsDrawer
                  disabled={composerActionDisabled}
                  onHeightChange={handleUndoneDrawerHeightChange}
                  onRevertToMessage={handleRestoreUndoneTurn}
                  turns={session.undoneTurns}
                />
              }
            />
          )
        }
        timeline={
          <SessionTimeline
            key={session.id}
            bottomOverlayHeight={undoneDrawerHeight}
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
        open={stream.checkpointConflict.open}
        reason={stream.checkpointConflict.reason}
      />
      {primary && (
        <SplitSessionPicker
          excludedSessionIds={[session.id, ...panes.map((pane) => pane.sessionId)]}
          onClose={() => setSplitPickerOpen(false)}
          onSelect={handleSplitSelect}
          open={splitPickerOpen}
        />
      )}
    </>
  );
}
