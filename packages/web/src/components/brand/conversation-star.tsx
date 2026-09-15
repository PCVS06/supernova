import {cn} from "@/lib/cn";

/** Conversations use a star, distinct from the mathematical identities of their owners. */
export default function ConversationStar(props: {className?: string; active?: boolean}) {
  const {className, active} = props;
  return (
    <svg aria-hidden="true" viewBox="0 0 32 32" className={cn("shrink-0 text-white", active && "animate-pulse motion-reduce:animate-none", className)}>
      <path d="M16 2 18 13 30 16 18 18 16 30 14 18 2 16 14 13Z" fill="currentColor" />
      <circle cx="16" cy="16" r="3" fill="currentColor" />
    </svg>
  );
}
