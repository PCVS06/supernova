import type {ReactNode} from "react";

interface ComposerToolbarGroupProps {
  readonly children: ReactNode;
  readonly label: string;
}

/** Labels one composer control so the toolbar reads as turn settings instead of loose buttons. */
export default function ComposerToolbarGroup(props: ComposerToolbarGroupProps) {
  const {children, label} = props;

  return (
    <span className="flex min-w-0 items-center gap-1">
      <span className="retro-label shrink-0 text-ink-faint">{label}</span>
      {children}
    </span>
  );
}
