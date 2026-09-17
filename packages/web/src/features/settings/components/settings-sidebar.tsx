import {Link, useNavigate} from "@tanstack/react-router";
import RadianBrand from "@/components/brand/radian-brand";
import Button from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import Menu, {MenuItem, MenuLabel} from "@/components/ui/menu";
import {cn} from "@/lib/cn";
import {useHarnessLibrary} from "@/features/harnesses/hooks/api/use-harnesses";
import {activeHarness, useHarnessNavigationStore} from "@/features/harnesses/stores/harness-navigation-store";
import {defaultHarnessPage, harnessPages, settingsAppPages} from "@/features/settings/data/settings-tree";
import type {HarnessPageId, SettingsSectionId} from "@/features/settings/data/settings-tree";

const rowClass = "flex w-full items-center gap-2.5 rounded-xl corner-superellipse/1.3 px-2 py-1.5 text-left text-sm text-ink hover:bg-overlay-hover hover:text-ink-strong";
const activeRowClass = "bg-overlay-hover text-ink-strong";
const groupLabelClass = "retro-label px-2 pb-1.5 pt-5 text-ink-faint";

interface SettingsSidebarProps {
  activeSectionId?: SettingsSectionId;
  activeHarnessId?: string;
  activePage?: HarnessPageId;
}

/** Two flat groups: the App pages, and the pages of one harness behind a switcher. Nothing nests, nothing collapses. */
export default function SettingsSidebar(props: SettingsSidebarProps) {
  const {activeSectionId, activeHarnessId, activePage} = props;
  const library = useHarnessLibrary();
  const navigate = useNavigate();
  const storedHarnessId = useHarnessNavigationStore((state) => state.activeHarnessId);
  const selectHarness = useHarnessNavigationStore((state) => state.selectHarness);
  const harnesses = library.data?.harnesses ?? [];
  // The harness in the URL wins; an App page shows the harness the app is on.
  const harness = activeHarness(harnesses, activeHarnessId ?? storedHarnessId);

  const switchTo = (harnessId: string): void => {
    selectHarness(harnessId);
    void navigate({to: "/settings/harness/$harnessId/$page", params: {harnessId, page: activePage ?? defaultHarnessPage}});
  };

  return (
    <aside className="flex h-full w-full shrink-0 flex-col md:w-72">
      <RadianBrand />
      <nav aria-label="Settings" className="scroll-fade-y min-h-0 flex-1 overflow-y-auto px-3 pb-3 pt-1">
        <Link className={rowClass} to="/">
          <Icon name="arrow-left" size="sm" />
          <span>Back to app</span>
        </Link>

        <p className={groupLabelClass}>App</p>
        <ul className="space-y-0.5">
          {settingsAppPages.map((page) => {
            const isActive = page.id === activeSectionId && !activeHarnessId;

            return (
              <li key={page.id}>
                <Link aria-current={isActive ? "page" : undefined} className={cn(rowClass, isActive && activeRowClass)} params={{sectionId: page.id}} to="/settings/$sectionId">
                  <Icon name={page.icon} size="sm" />
                  <span>{page.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>

        <p className={groupLabelClass}>Harness</p>
        {harness ? (
          <>
            <Menu
              align="start"
              className="w-(--anchor-width) min-w-56"
              triggerLabel="Switch harness"
              trigger={(triggerProps) => (
                <Button
                  {...triggerProps}
                  className="flex h-9 w-full min-w-0 items-center gap-2 rounded-xl corner-superellipse/1.3 border border-border bg-surface-control px-2.5 text-left text-sm text-ink-strong hover:border-border-strong focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ink-faint"
                >
                  <span className="min-w-0 flex-1 truncate font-medium">{harness.name}</span>
                  <Icon className="shrink-0 text-ink-muted" name="chevron-down" size="xs" />
                </Button>
              )}
            >
              <MenuLabel>Harness</MenuLabel>
              {harnesses.map((item) => (
                <MenuItem key={item.id} onClick={() => switchTo(item.id)} trailing={item.id === harness.id && <Icon name="check" size="xs" />}>
                  {item.name}
                </MenuItem>
              ))}
              <MenuItem
                className="mt-1 border-t border-border-muted pt-2 text-ink-muted"
                icon={<Icon name="plus" size="xs" />}
                onClick={() => void navigate({to: "/settings/$sectionId", params: {sectionId: "harnesses"}})}
              >
                Manage harnesses…
              </MenuItem>
            </Menu>
            <ul aria-label={`${harness.name} pages`} className="mt-1.5 space-y-0.5">
              {harnessPages.map((page) => {
                const isCurrent = harness.id === activeHarnessId && page.id === activePage;

                return (
                  <li key={page.id}>
                    <Link
                      aria-current={isCurrent ? "page" : undefined}
                      className={cn(rowClass, "pl-3", isCurrent && activeRowClass)}
                      params={{harnessId: harness.id, page: page.id}}
                      to="/settings/harness/$harnessId/$page"
                    >
                      <span className="truncate">{page.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </>
        ) : (
          <Link className={cn(rowClass, "text-ink-muted")} params={{sectionId: "harnesses"}} to="/settings/$sectionId">
            <Icon name="plus" size="sm" />
            <span>{library.data ? "Create a harness" : "Loading harnesses…"}</span>
          </Link>
        )}
      </nav>
    </aside>
  );
}
