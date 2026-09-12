import {useRouterState} from "@tanstack/react-router";
import {useState} from "react";
import Icon from "@/components/ui/icon";
import IconButton from "@/components/ui/icon-button";
import SplitSessionPicker from "@/features/sessions/components/split-session-picker";
import {MAX_SPLIT_PANES, useSplitViewStore} from "@/features/sessions/stores/split-view-store";

/** Returns the routed chat id while excluding new-chat and non-chat pages. */
function routedSessionId(pathname: string): string | null {
  const [section, sessionId] = pathname.split("/").filter(Boolean);
  if (section !== "session" || !sessionId || sessionId === "new") return null;
  return decodeURIComponent(sessionId);
}

/** Places split-chat selection beside the right-sidebar control in the titlebar. */
export default function SplitViewControl() {
  const pathname = useRouterState({select: (state) => state.location.pathname});
  const sessionId = routedSessionId(pathname);
  const panes = useSplitViewStore((state) => state.panes);
  const openPane = useSplitViewStore((state) => state.openPane);
  const [pickerOpen, setPickerOpen] = useState(false);

  if (!sessionId) return null;

  const handleSelect = (selectedSessionId: string): void => {
    openPane(selectedSessionId);
    setPickerOpen(false);
  };

  return (
    <>
      <IconButton
        className="size-7"
        disabled={panes.length >= MAX_SPLIT_PANES}
        label="Open a chat beside this one"
        onClick={() => setPickerOpen(true)}
        title={panes.length >= MAX_SPLIT_PANES ? "Three chats are already open side by side" : "Open another chat beside this one"}
      >
        <Icon name="columns" size="sm" />
      </IconButton>
      <SplitSessionPicker excludedSessionIds={[sessionId, ...panes.map((pane) => pane.sessionId)]} onClose={() => setPickerOpen(false)} onSelect={handleSelect} open={pickerOpen} />
    </>
  );
}
