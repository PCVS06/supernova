import type {ReactNode} from "react";

interface ComposerToolbarGroupProps {
  readonly children: ReactNode;
  readonly label: string;
}

/** Keeps control groups accessible without repeating their names in the toolbar. */
export default function ComposerToolbarGroup(props: ComposerToolbarGroupProps) {
  const {children, label} = props;

  return (
    <span role="group" aria-label={label} className="flex min-w-0 items-center">
      {children}
    </span>
  );
}
