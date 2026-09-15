import type {ModelReference, SessionContextUsage, Turn, UserMessageContentPart} from "@supernova/contracts/sessions/schemas";
import {useQueryClient} from "@tanstack/react-query";
import {useMemo, useRef, useState} from "react";
import {buildCommittedTimelineItems, buildLiveTimelineItems} from "@/features/sessions/lib/timeline/build-session-timeline";
import type {ClientSlashCommandActions} from "@/features/sessions/lib/composer/client-slash-commands";
import {useGeneralSettingsStore} from "@/features/settings/stores/general-settings-store";
import {useSessionLiveStore} from "@/features/sessions/stores/session-live-store";
import type {CheckpointNavigationConfirmation, CheckpointNavigationOutcome, SessionLiveStatus} from "@/features/sessions/stores/session-live-store";
import type {SessionTimelineItem} from "@/features/sessions/types/session-timeline-item";
import {useConnectionStore} from "@/rpc/connection-store";
import {useRpcClient} from "@/rpc/use-rpc-client";
import {useMountEffect} from "@/lib/use-mount-effect";

interface UseSessionTimelineResult {
  /** Pending confirmation for a restore that would discard manual workspace changes. */
  readonly checkpointConflict: Omit<CheckpointNavigationConfirmation, "confirm"> & {readonly confirm: () => void; readonly open: boolean; readonly inline: boolean};
  /** Steps through saved turns directly, with any workspace conflict shown inside the composer. */
  readonly stepCheckpoint: (direction: "back" | "forward") => void;
  committedTimelineItems: readonly SessionTimelineItem[];
  liveContext: SessionContextUsage | null;
  liveTimelineItems: readonly SessionTimelineItem[];
  slashCommandActions: ClientSlashCommandActions;
  /** Delivers text to the turn that is already running. */
  readonly steerTurn: (text: string) => Promise<boolean>;
  stopStreaming: () => void;
  streamError: string | null;
  readonly streamStatus: SessionLiveStatus;
  readonly revertToMessage: (turnId: string) => void;
  submitMessage: (contentParts: readonly UserMessageContentPart[]) => Promise<boolean>;
}

interface UseSessionTimelineInput {
  sessionId: string;
  sessionTurns: readonly Turn[];
  modelReference: ModelReference | undefined;
}

export function useSessionTimeline(input: UseSessionTimelineInput): UseSessionTimelineResult {
  const {modelReference, sessionId, sessionTurns} = input;
  const offline = useConnectionStore((state) => state.status !== "connected" || state.server?.status === "stopped" || state.server?.status === "restarting");
  const queryClient = useQueryClient();
  const rpcClient = useRpcClient();
  const [confirmation, setConfirmation] = useState<Omit<CheckpointNavigationConfirmation, "cancel" | "confirm"> & {readonly open: boolean; readonly inline: boolean}>({
    open: false,
    inline: false,
    reason: "conflict",
  });
  const pendingConfirmation = useRef<CheckpointNavigationConfirmation | null>(null);
  const mounted = useRef(true);

  useMountEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      pendingConfirmation.current?.cancel();
      pendingConfirmation.current = null;
    };
  });

  /** Keeps the optimistic timeline until the user decides, or retries immediately when confirmation is off. */
  const navigate = async (run: () => Promise<CheckpointNavigationOutcome>, inline = false): Promise<void> => {
    const outcome = await run();
    if (typeof outcome === "string") return;
    if (!mounted.current) {
      outcome.cancel();
      return;
    }
    if (inline || outcome.reason === "review" || useGeneralSettingsStore.getState().confirmCheckpointConflicts) {
      pendingConfirmation.current = outcome;
      setConfirmation({...outcome, open: true, inline});
    } else await navigate(() => outcome.confirm());
  };

  const sessionState = useSessionLiveStore((state) => state.sessions[sessionId]);
  const abortSession = useSessionLiveStore((state) => state.abortSession);
  const compactSession = useSessionLiveStore((state) => state.compactSession);
  const redoCheckpoint = useSessionLiveStore((state) => state.redoCheckpoint);
  const revertSessionToMessage = useSessionLiveStore((state) => state.revertToMessage);
  const sendMessage = useSessionLiveStore((state) => state.sendMessage);
  const steerSession = useSessionLiveStore((state) => state.steerSession);
  const undoCheckpoint = useSessionLiveStore((state) => state.undoCheckpoint);

  const streamStatus = sessionState?.status ?? "idle";
  const streamTurn = sessionState?.liveTurn ?? null;
  const committedTimelineItems = useMemo(() => buildCommittedTimelineItems(sessionTurns), [sessionTurns]);

  const liveTimelineItems = useMemo(
    () => buildLiveTimelineItems({live: streamStatus === "streaming" || streamStatus === "compacting", liveTurn: streamTurn}),
    [streamStatus, streamTurn]
  );

  const submitMessage = async (contentParts: readonly UserMessageContentPart[]): Promise<boolean> => {
    if (streamStatus !== "idle") return false;

    if (!modelReference) {
      // The composer should already be disabled, but keeping this guard prevents
      // callers from starting an invalid stream from routes that load models later.
      return false;
    }

    return sendMessage({contentParts, modelReference, queryClient, rpcClient, sessionId});
  };

  const steerTurn = async (text: string): Promise<boolean> => {
    if (streamStatus !== "streaming") return false;

    return steerSession({
      rpcClient,
      sessionId,
      text,
      fallback: modelReference ? {modelReference, captureCheckpoints: useGeneralSettingsStore.getState().captureCheckpoints} : undefined,
    });
  };

  const stopStreaming = (): void => {
    abortSession({rpcClient, sessionId});
  };

  const triggerCompaction = (): void => {
    if (streamStatus !== "idle" || !modelReference || offline) return;

    compactSession({modelReference, rpcClient, sessionId});
  };

  const undo = (): void => {
    if (streamStatus !== "idle" || offline) return;

    void navigate(() => undoCheckpoint({queryClient, rpcClient, sessionId}));
  };

  const redo = (): void => {
    if (streamStatus !== "idle" || offline) return;

    void navigate(() => redoCheckpoint({queryClient, rpcClient, sessionId}));
  };

  const stepCheckpoint = (direction: "back" | "forward"): void => {
    if (streamStatus !== "idle" || offline) return;
    const step = direction === "back" ? undoCheckpoint : redoCheckpoint;
    void navigate(() => step({queryClient, rpcClient, sessionId, review: false}), true);
  };

  const revertToMessage = (turnId: string): void => {
    if (streamStatus !== "idle" || offline) return;

    void navigate(() => revertSessionToMessage({queryClient, rpcClient, sessionId, turnId}));
  };

  return {
    checkpointConflict: {
      cancel: () => {
        pendingConfirmation.current?.cancel();
        pendingConfirmation.current = null;
        setConfirmation((current) => ({...current, open: false}));
      },
      confirm: () => {
        const pending = pendingConfirmation.current;
        pendingConfirmation.current = null;
        setConfirmation((current) => ({...current, open: false}));
        if (pending) void navigate(() => pending.confirm(), confirmation.inline);
      },
      open: confirmation.open,
      inline: confirmation.inline,
      reason: confirmation.reason,
      preview: confirmation.preview,
      message: confirmation.message,
      turnsBefore: confirmation.turnsBefore,
      turnsAfter: confirmation.turnsAfter,
    },
    streamStatus,
    streamError: sessionState?.error ?? null,
    liveContext: sessionState?.liveContext ?? null,
    committedTimelineItems,
    liveTimelineItems,
    slashCommandActions: {compact: triggerCompaction, redo, undo},
    stepCheckpoint,
    revertToMessage,
    steerTurn,
    submitMessage,
    stopStreaming,
  };
}
