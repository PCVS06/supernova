import {createMemoryHistory, createRouter} from "@tanstack/react-router";
import {describe, expect, it} from "vitest";
import {routeTree} from "@/app/router";
import {defaultHarnessSection, harnessTabs, resolveHarnessSection} from "@/features/harnesses/lib/harness-sections";
import {getSettingsSection, settingsSections} from "@/features/settings/data/settings-sections";

interface ResolvedRedirect {
  href?: string;
  search?: Record<string, unknown>;
}

/** Loads one entry URL the way the app does, so a redirect is observed instead of assumed. */
async function resolve(pathname: string): Promise<{href: string; redirect?: ResolvedRedirect}> {
  const router = createRouter({context: {appEnvironment: "web"}, history: createMemoryHistory({initialEntries: [pathname]}), routeTree});
  await router.load();
  const redirect = router.state.redirect?.options as ResolvedRedirect | undefined;
  return {href: redirect?.href ?? router.state.location.href, redirect};
}

describe("settings harness surfaces", () => {
  it("lists harnesses as a settings section", () => {
    const section = settingsSections.find((candidate) => candidate.id === "harnesses");
    expect(section?.label).toBe("Harnesses");
    expect(settingsSections.map((candidate) => candidate.id)).toEqual(["general", "appearance", "providers", "harnesses"]);
    expect(getSettingsSection("harnesses")).toBe(section);
  });

  it("keeps the former harness URLs working by redirecting them into settings", async () => {
    const cases = [
      {name: "harness_library", from: "/harnesses", href: "/settings/harnesses"},
      {name: "harness_configuration", from: "/harness/science", href: "/settings/harness/science"},
      {name: "settings_root", from: "/settings", href: "/settings/general"},
      {name: "unknown_section", from: "/settings/not-a-section", href: "/settings/general"},
    ];
    for (const each of cases) {
      expect((await resolve(each.from)).href, each.name).toBe(each.href);
    }
  });

  it("carries the configured scope through the harness redirect", async () => {
    const {href, redirect} = await resolve("/harness/science?projectId=lab&section=memory&agentName=reviewer");
    expect(href.startsWith("/settings/harness/science")).toBe(true);
    expect(redirect?.search).toEqual({projectId: "lab", section: "memory", agentName: "reviewer"});
  });

  it("reaches harness configuration without a redirect", async () => {
    const {href, redirect} = await resolve("/settings/harness/science?section=workflows");
    expect(redirect).toBeUndefined();
    expect(href).toBe("/settings/harness/science?section=workflows");
  });

  it("maps a legacy section onto its new panel and falls back for unknown ones", () => {
    expect(harnessTabs.map((tab) => tab.label)).toEqual(["Agents", "Resources", "Workflows", "Projects"]);
    const cases = [
      {name: "missing", from: undefined, section: defaultHarnessSection, tab: "agents"},
      {name: "unknown", from: "nowhere", section: defaultHarnessSection, tab: "agents"},
      {name: "legacy_chats", from: "Chats", section: "orchestrator", tab: "agents"},
      {name: "legacy_team", from: "Team", section: "specialists", tab: "agents"},
      {name: "legacy_memory_tab", from: "Memory", section: "memory", tab: "agents"},
      {name: "legacy_context", from: "Context", section: "context", tab: "resources"},
      {name: "legacy_workflow", from: "Workflow", section: "workflows", tab: "workflows"},
      {name: "legacy_run_limits", from: "Run limits", section: "limits", tab: "workflows"},
      {name: "current_projects", from: "projects", section: "projects", tab: "projects"},
    ];
    for (const each of cases) {
      const resolved = resolveHarnessSection(each.from);
      expect(resolved.section.id, each.name).toBe(each.section);
      expect(resolved.tab.id, each.name).toBe(each.tab);
    }
  });
});
