import * as Rpc from "effect/unstable/rpc/Rpc";
import {
  AbortSessionPayload,
  CheckpointNavigationError,
  CompactSessionPayload,
  GetSessionControlsPayload,
  GetSessionControlsResult,
  GetSessionControlsError,
  UpdateSessionControlsPayload,
  UpdateSessionControlsResult,
  UpdateSessionControlsError,
  RedoCheckpointPayload,
  RevertToMessagePayload,
  SendMessagePayload,
  SteerSessionPayload,
  SteerSessionError,
  SessionStreamEvent,
  UndoCheckpointPayload,
  WatchEventsPayload,
} from "@supernova/contracts/session-runtime/procedures";

export const SendMessageRpc = Rpc.make("sendMessage", {
  payload: SendMessagePayload,
});

export const SteerSessionRpc = Rpc.make("steerSession", {
  payload: SteerSessionPayload,
  error: SteerSessionError,
});

export const GetSessionControlsRpc = Rpc.make("getSessionControls", {
  payload: GetSessionControlsPayload,
  success: GetSessionControlsResult,
  error: GetSessionControlsError,
});

export const UpdateSessionControlsRpc = Rpc.make("updateSessionControls", {
  payload: UpdateSessionControlsPayload,
  success: UpdateSessionControlsResult,
  error: UpdateSessionControlsError,
});

export const AbortSessionRpc = Rpc.make("abortSession", {
  payload: AbortSessionPayload,
});

export const CompactSessionRpc = Rpc.make("compactSession", {
  payload: CompactSessionPayload,
});

export const RevertToMessageRpc = Rpc.make("revertToMessage", {
  error: CheckpointNavigationError,
  payload: RevertToMessagePayload,
});

export const UndoCheckpointRpc = Rpc.make("undoCheckpoint", {
  error: CheckpointNavigationError,
  payload: UndoCheckpointPayload,
});

export const RedoCheckpointRpc = Rpc.make("redoCheckpoint", {
  error: CheckpointNavigationError,
  payload: RedoCheckpointPayload,
});

export const WatchEventsRpc = Rpc.make("watchEvents", {
  payload: WatchEventsPayload,
  stream: true,
  success: SessionStreamEvent,
});

export const SessionRuntimeRpcs = [
  GetSessionControlsRpc,
  UpdateSessionControlsRpc,
  SendMessageRpc,
  SteerSessionRpc,
  AbortSessionRpc,
  CompactSessionRpc,
  RevertToMessageRpc,
  UndoCheckpointRpc,
  RedoCheckpointRpc,
  WatchEventsRpc,
] as const;
