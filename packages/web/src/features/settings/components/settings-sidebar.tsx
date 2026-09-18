import {useState} from "react";
import {Link, useNavigate} from "@tanstack/react-router";
import RadianBrand from "@/components/brand/radian-brand";
import Button from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import Menu, {MenuItem, MenuLabel} from "@/components/ui/menu";
import {cn} from "@/lib/cn";
import {useHarnessLibrary} from "@/features/harnesses/hooks/api/use-harnesses";
import {activeHarness, useHarnessNavigationStore} from "@/features/harnesses/stores/harness-navigation-store";
import {harnessEntrySearchIndex, searchSettings, settingsSearchIndex} from "@/features/settings/data/settings-search";
import type {SettingsSearchEntry} from "@/features/settings/data/settings-search";
import {defaultHarnessPage, harnessPages, settingsAppPages} from "@/features/settings/data/settings-tree";
import type {HarnessPageId, SettingsSectionId} from "@/features/settings/data/settings-tree";

const rowClass =
  "flex w-full items-center gap-2.5 rounded-xl corner-superellipse/1.3 px-2 py-1.5 text-left text-sm text-ink outline-none hover:bg-overlay-hover hover:text-ink-strong focus-visible:bg-overlay-hover";
const activeRowClass = "bg-overlay-hover text-ink-strong";
const groupLabelClass = "retro-label px-2 pb-1.5 pt-4 text-ink-faint";

interface SettingsSidebarProps {
  activeSectionId?: SettingsSectionId;
  activeHarnessId?: string;
  activePage?: HarnessPageId;
}

/** Search, then two flat groups: the app, and one harness behind a switcher. Nothing nests, nothing collapses. */
export default function SettingsSidebar(props: SettingsSidebarProps) {
  const {activeSectionId, activeHarnessId, activePage} = props;
  const library = useHarnessLibrary();
  const navigate = useNavigate();
  const storedHarnessId = useHarnessNavigationStore((state) => state.activeHarnessId);
  const selectHarness = useHarnessNavigationStore((state) => state.selectHarness);
  const [query, setQuery] = useState("");
  const harnesses = library.data?.harnesses ?? [];
  // The harness in the URL wins; an App page shows the harness the app is on.
  const harness = activeHarness(harnesses, activeHarnessId ?? storedHarnessId);
  const projects = library.data?.projects.filter((project) => project.harnessId === harness?.id) ?? [];
  const counts: Partial<Record<HarnessPageId, number>> = harness ? {agents: harness.agents.length, workflows: harness.workflows?.length ?? 0, projects: projects.length} : {};
  // Without a harness its pages cannot be opened, so they are not offered either.
  const results = searchSettings([...settingsSearchIndex.filter((entry) => entry.target.kind === "app" || harness), ...harnessEntrySearchIndex(harness, projects)], query);

  const switchTo = (harnessId: string): void => {
    selectHarness(harnessId);
    void navigate({to: "/settings/harness/$harnessId/$page", params: {harnessId, page: activePage ?? defaultHarnessPage}});
  };

  const open = (entry: SettingsSearchEntry): void => {
    setQuery("");
    if (entry.target.kind === "app") {
      void navigate({to: "/settings/$sectionId", params: {sectionId: entry.target.sectionId}});
      return;
    }
    if (!harness) return;
    void navigate({to: "/settings/harness/$harnessId/$page", params: {harnessId: harness.id, page: entry.target.page}, search: entry.target.search ?? {}});
  };

  return (
    <aside className="flex h-full w-full shrink-0 flex-col md:w-72">
      <RadianBrand />
      <nav aria-label="Settings" className="scroll-fade-y min-h-0 flex-1 overflow-y-auto px-3 pb-3 pt-1">
        <Link className={rowClass} to="/">
          <Icon name="arrow-left" size="sm" />
          <span>Back to app</span>
        </Link>

        <label className="mt-3 flex h-9 items-center gap-2 rounded-xl corner-superellipse/1.3 border border-border bg-surface-control px-2.5 text-ink-faint focus-within:border-border-strong">
          <Icon name="search" size="sm" />
          <input
            aria-label="Search settings"
            className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint"
            placeholder="Search settings"
            spellCheck={false}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") setQuery("");
              if (event.key === "Enter" && results[0]) open(results[0]);
            }}
          />
        </label>

        {query.trim() ? (
          <ul aria-label="Search results" className="mt-3 space-y-0.5">
            {results.map((entry, index) => (
              <li key={`${entry.where}:${entry.label}:${index}`}>
                <button className={cn(rowClass, "cursor-pointer justify-between gap-3")} type="button" onClick={() => open(entry)}>
                  <span className="min-w-0 truncate">{entry.label}</span>
                  <span className="max-w-[55%] shrink-0 truncate text-xs text-ink-faint">
                    {entry.target.kind === "harness" && harness ? `${harness.name} · ${entry.where}` : entry.where}
                  </span>
                </button>
              </li>
            ))}
            {!results.length && <li className="px-2 py-2 text-xs text-ink-muted">No setting matches “{query.trim()}”.</li>}
          </ul>
        ) : (
          <>
            <p className={groupLabelClass}>App</p>
            <ul className="space-y-0.5">
              {settingsAppPages
                .filter((page) => page.group === "app")
                .map((page) => {
                  const isActive = page.id === activeSectionId && !activeHarnessId;

                  return (
                    <li key={page.id}>
                      <Link
                        aria-current={isActive ? "page" : undefined}
                        className={cn(rowClass, isActive && activeRowClass)}
                        params={{sectionId: page.id}}
                        to="/settings/$sectionId"
                      >
                        <Icon className="text-ink-muted" name={page.icon} size="sm" />
                        <span>{page.label}</span>
                      </Link>
                    </li>
                  );
                })}
            </ul>

            <p className={groupLabelClass}>Harness</p>
            {harness && (
              <Menu
                align="start"
                className="w-(--anchor-width) min-w-56"
                triggerLabel="Switch harness"
                trigger={(triggerProps) => (
                  <Button
                    {...triggerProps}
                    className="mb-1.5 flex h-9 w-full min-w-0 items-center gap-2 rounded-xl corner-superellipse/1.3 border border-border bg-surface-control px-2.5 text-left text-sm text-ink-strong hover:border-border-strong focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ink-faint"
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
              </Menu>
            )}
            <ul aria-label={harness ? `${harness.name} pages` : undefined} className="space-y-0.5">
              {harness &&
                harnessPages.map((page) => {
                  const isCurrent = harness.id === activeHarnessId && page.id === activePage;
                  const count = counts[page.id];

                  return (
                    <li key={page.id}>
                      <Link
                        aria-current={isCurrent ? "page" : undefined}
                        className={cn(rowClass, isCurrent && activeRowClass)}
                        params={{harnessId: harness.id, page: page.id}}
                        to="/settings/harness/$harnessId/$page"
                      >
                        <Icon className="text-ink-muted" name={page.icon} size="sm" />
                        <span className="min-w-0 flex-1 truncate">{page.label}</span>
                        {count !== undefined && <span className="text-xs tabular-nums text-ink-faint">{count}</span>}
                      </Link>
                    </li>
                  );
                })}
              {settingsAppPages
                .filter((page) => page.group === "harness")
                .map((page) => {
                  const isActive = page.id === activeSectionId && !activeHarnessId;

                  return (
                    <li className={cn(harness && "mt-2 border-t border-border-muted pt-2")} key={page.id}>
                      <Link
                        aria-current={isActive ? "page" : undefined}
                        className={cn(rowClass, "text-ink-muted", isActive && activeRowClass)}
                        params={{sectionId: page.id}}
                        to="/settings/$sectionId"
                      >
                        <Icon name={harness ? page.icon : "plus"} size="sm" />
                        <span>{harness ? page.label : library.data ? "Create a harness" : "Loading harnesses…"}</span>
                      </Link>
                    </li>
                  );
                })}
            </ul>
          </>
        )}
      </nav>
    </aside>
  );
}
