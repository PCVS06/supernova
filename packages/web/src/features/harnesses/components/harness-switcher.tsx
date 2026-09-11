import {Link, useNavigate} from "@tanstack/react-router";
import Button from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import Menu, {MenuItem, MenuLabel} from "@/components/ui/menu";
import {useHarnessLibrary} from "@/features/harnesses/hooks/api/use-harnesses";
import {useHarnessNavigationStore} from "@/features/harnesses/stores/harness-navigation-store";

export default function HarnessSwitcher() {
  const library = useHarnessLibrary();
  const selected = useHarnessNavigationStore((state) => state.activeHarnessId);
  const select = useHarnessNavigationStore((state) => state.selectHarness);
  const navigate = useNavigate();
  const harness = library.data?.harnesses.find((item) => item.id === selected) ?? library.data?.harnesses[0];
  return (
    <div className="mx-3 mb-4 space-y-1">
      <Menu
        align="start"
        className="w-60"
        triggerLabel="Choose harness"
        trigger={(props) => (
          <Button {...props} className="flex w-full items-center gap-2 rounded-lg border border-border bg-surface-raised px-3 py-2.5 text-sm">
            <Icon name="workflow" size="sm" />
            <span className="min-w-0 flex-1 truncate text-left">{harness?.name ?? "Loading harnesses…"}</span>
            <Icon name="chevron-down" size="xs" />
          </Button>
        )}
      >
        <MenuLabel>Harnesses</MenuLabel>
        {library.data?.harnesses.map((item) => (
          <MenuItem
            key={item.id}
            icon={<Icon name="workflow" size="xs" />}
            trailing={harness?.id === item.id && <Icon name="check" size="xs" />}
            onClick={() => {
              select(item.id);
              void navigate({to: "/"});
            }}
          >
            {item.name}
          </MenuItem>
        ))}
        <MenuItem
          icon={<Icon name="settings" size="xs" />}
          onClick={() => {
            void navigate({to: "/harnesses"});
          }}
        >
          Manage harnesses
        </MenuItem>
      </Menu>
      {harness && (
        <Link
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-ink-muted hover:bg-overlay-hover hover:text-ink"
          params={{harnessId: harness.id}}
          to="/harness/$harnessId"
        >
          <Icon name="settings" size="xs" />
          Configure harness
        </Link>
      )}
      {library.isError && (
        <p className="px-2 text-xs text-danger-ink">
          Harnesses unavailable.{" "}
          <Button
            onClick={() => {
              void library.refetch();
            }}
          >
            Retry
          </Button>
        </p>
      )}
    </div>
  );
}
