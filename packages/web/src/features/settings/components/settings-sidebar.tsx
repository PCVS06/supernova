import {useState} from "react";
import {Link} from "@tanstack/react-router";
import RadianBrand from "@/components/brand/radian-brand";
import Icon from "@/components/ui/icon";
import {cn} from "@/lib/cn";
import {useHarnessLibrary} from "@/features/harnesses/hooks/api/use-harnesses";
import {defaultHarnessPage, harnessPages, settingsAppPages} from "@/features/settings/data/settings-tree";
import type {HarnessPageId, SettingsSectionId} from "@/features/settings/data/settings-tree";

const rowClass = "flex w-full items-center gap-2.5 rounded-xl corner-superellipse/1.3 px-2 py-1.5 text-left text-sm text-ink hover:bg-overlay-hover hover:text-ink-strong";

interface SettingsSidebarProps {
  activeSectionId: SettingsSectionId;
  activeHarnessId?: string;
  activePage?: HarnessPageId;
}

/** The whole settings tree: the App pages, the harness library, and one expandable node per harness. */
export default function SettingsSidebar(props: SettingsSidebarProps) {
  const {activeSectionId, activeHarnessId, activePage} = props;
  const library = useHarnessLibrary();
  const [opened, setOpened] = useState<string>();
  const harnesses = library.data?.harnesses ?? [];
  // The harness in the URL is always the open one; the local state only expands a node from an App page.
  const openHarnessId = activeHarnessId ?? opened;

  return (
    <aside className="flex h-full w-full shrink-0 flex-col md:w-72">
      <RadianBrand />
      <nav className="scroll-fade-y min-h-0 flex-1 overflow-y-auto px-3 pb-3 pt-1">
        <div className="space-y-0.5">
          <Link className={rowClass} to="/">
            <Icon name="arrow-left" size="sm" />
            <span>Back to app</span>
          </Link>
        </div>

        <ul className="mt-4 space-y-0.5">
          {settingsAppPages.map((page) => {
            const isActive = page.id === activeSectionId && !activeHarnessId;

            return (
              <li key={page.id}>
                <Link className={cn(rowClass, isActive && "bg-overlay-hover text-ink-strong")} params={{sectionId: page.id}} to="/settings/$sectionId">
                  <Icon name={page.icon} size="sm" />
                  <span>{page.label}</span>
                </Link>
                {page.id === "harnesses" && harnesses.length > 0 && (
                  <ul className="mt-0.5 space-y-0.5 pl-3">
                    {harnesses.map((harness) => {
                      const open = harness.id === openHarnessId;

                      return (
                        <li key={harness.id}>
                          <Link
                            aria-expanded={open}
                            className={cn(rowClass, harness.id === activeHarnessId && "text-ink-strong")}
                            params={{harnessId: harness.id, page: defaultHarnessPage}}
                            to="/settings/harness/$harnessId/$page"
                            onClick={() => setOpened(harness.id)}
                          >
                            <Icon className={cn("shrink-0 text-ink-faint transition-transform", !open && "-rotate-90")} name="chevron-down" size="xs" />
                            <span className="truncate">{harness.name}</span>
                          </Link>
                          {open && (
                            <ul className="mt-0.5 space-y-0.5 pl-5">
                              {harnessPages.map((harnessPage) => {
                                const isCurrent = harness.id === activeHarnessId && harnessPage.id === activePage;

                                return (
                                  <li key={harnessPage.id}>
                                    <Link
                                      aria-current={isCurrent ? "page" : undefined}
                                      className={cn(rowClass, "text-ink-muted", isCurrent && "bg-overlay-hover text-ink-strong")}
                                      params={{harnessId: harness.id, page: harnessPage.id}}
                                      to="/settings/harness/$harnessId/$page"
                                    >
                                      <span className="truncate">{harnessPage.label}</span>
                                    </Link>
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
