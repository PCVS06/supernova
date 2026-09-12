import ChatContextBar from "@/features/harnesses/components/chat-context-bar";

interface SessionContextStripProps {
  readonly projectPath: string;
  readonly sessionId: string;
}

/** Keeps context inspection chat-scoped without repeating project plans above the transcript. */
export default function SessionContextStrip(props: SessionContextStripProps) {
  const {projectPath, sessionId} = props;
  return <ChatContextBar projectPath={projectPath} sessionId={sessionId} />;
}
