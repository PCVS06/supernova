import {cn} from "@/lib/cn";

interface ChatRoleBadgeProps {
  readonly className?: string;
  readonly role?: "harness-lead" | "project-lead" | "chat";
  readonly title?: string;
}

/** Names who the chat is talking to, so the header answers that question without a detour. */
export default function ChatRoleBadge(props: ChatRoleBadgeProps) {
  const {className, role = "chat", title} = props;

  return (
    <span className={cn("shrink-0 text-xs leading-4 text-ink-faint", className)} data-chat-role={role} title={title}>
      {{"harness-lead": "Harness lead", "project-lead": "Project lead", chat: "Chat"}[role]}
    </span>
  );
}
