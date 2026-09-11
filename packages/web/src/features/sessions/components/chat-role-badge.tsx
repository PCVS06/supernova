import {cn} from "@/lib/cn";

interface ChatRoleBadgeProps {
  readonly className?: string;
  /** True when the chat talks to the project lead rather than a plain harness chat. */
  readonly lead?: boolean;
  readonly title?: string;
}

/** Names who the chat is talking to, so the header answers that question without a detour. */
export default function ChatRoleBadge(props: ChatRoleBadgeProps) {
  const {className, lead = false, title} = props;

  return (
    <span
      className={cn("shrink-0 rounded-full border border-border px-2 py-0.5 text-xs leading-4 text-ink-muted", lead && "border-border-strong text-ink", className)}
      data-chat-role={lead ? "lead" : "harness"}
      title={title}
    >
      {lead ? "Project lead" : "Harness chat"}
    </span>
  );
}
