import {cn} from "@/lib/cn";

/** A geometric fan maps one origin into three independent directions. */
export default function DelegationMark(props: {className?: string}) {
  const {className} = props;
  return (
    <svg aria-hidden="true" viewBox="0 0 32 32" fill="none" className={cn("shrink-0 text-white", className)}>
      <path d="M5 16H27M5 16C17 16 17 6 27 6M5 16C17 16 17 26 27 26" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      <circle cx="5" cy="16" r="2" fill="currentColor" />
      <circle cx="27" cy="6" r="1.6" fill="currentColor" />
      <circle cx="27" cy="16" r="1.6" fill="currentColor" />
      <circle cx="27" cy="26" r="1.6" fill="currentColor" />
    </svg>
  );
}
