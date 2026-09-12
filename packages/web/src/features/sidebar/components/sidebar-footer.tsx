import {Link} from "@tanstack/react-router";
import Icon from "@/components/ui/icon";
import IconButton from "@/components/ui/icon-button";
import {useAppearanceStore} from "@/features/settings/stores/appearance-store";
import {cn} from "@/lib/cn";

const HELP_URL = "https://github.com/PCVS06/supernova#readme";
const footerActionClassName = "grid size-8 place-items-center rounded-lg text-ink-faint transition-colors hover:bg-overlay-hover hover:text-ink";

interface SidebarFooterProps {
  readonly settingsActive: boolean;
}

/** Keeps utility destinations accessible without turning the footer into navigation copy. */
export default function SidebarFooter(props: SidebarFooterProps) {
  const {settingsActive} = props;
  const resolvedMode = useAppearanceStore((state) => state.resolvedMode);
  const setMode = useAppearanceStore((state) => state.setMode);
  const nextMode = resolvedMode === "dark" ? "light" : "dark";
  const themeLabel = nextMode === "light" ? "Use light theme" : "Use dark theme";

  return (
    <nav aria-label="Workspace utilities" className="flex items-center gap-1 border-t border-border-muted px-2 py-2">
      <Link
        aria-current={settingsActive ? "page" : undefined}
        aria-label="Open settings"
        className={cn(footerActionClassName, settingsActive && "bg-overlay-pressed text-ink")}
        title="Settings"
        to="/settings"
      >
        <Icon name="settings" size="sm" />
      </Link>
      <div className="flex-1" />
      <IconButton className={footerActionClassName} label={themeLabel} onClick={() => setMode(nextMode)} size="none" title={themeLabel}>
        <Icon name={nextMode === "light" ? "sun" : "moon"} size="sm" />
      </IconButton>
      <a aria-label="Open help" className={footerActionClassName} href={HELP_URL} rel="noreferrer" target="_blank" title="Help">
        <Icon name="help" size="sm" />
      </a>
    </nav>
  );
}
