import ChatRunList from "@/features/harnesses/components/chat-run-list";

interface ChatDelegatedWorkProps {
  sessionId: string;
  live?: boolean;
}

/** Conversation-sized view of the same server-backed worker and workflow records as the ledger. */
export default function ChatDelegatedWork(props: ChatDelegatedWorkProps) {
  const {sessionId, live = false} = props;
  return <ChatRunList sessionId={sessionId} live={live} variant="conversation" />;
}
