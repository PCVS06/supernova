import {createMemoryHistory, createRouter} from "@tanstack/react-router";
import {describe, expect, it} from "vitest";
import {routeTree} from "@/app/router";
import {defaultHarnessPage, harnessPages, legacyHarnessRoute, mainOrchestratorAgent, resolveHarnessPage} from "@/features/harnesses/lib/harness-sections";
import {getSettingsAppPage, settingsAppPages} from "@/features/settings/data/settings-tree";

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

describe("settings tree", () => {
  it("lists the App pages and keeps the harness library among them", () => {
    const harnesses = settingsAppPages.find((candidate) => candidate.id === "harnesses");
    expect(harnesses?.label).toBe("Harnesses");
    expect(settingsAppPages.map((candidate) => candidate.id)).toEqual(["general", "appearance", "providers", "about", "harnesses"]);
    expect(settingsAppPages.find((candidate) => candidate.id === "providers")?.label).toBe("Providers & keys");
    expect(getSettingsAppPage("harnesses")).toBe(harnesses);
  });

  it("gives every harness one page per surface and opens on the overview", () => {
    expect(harnessPages.map((page) => page.id)).toEqual(["overview", "instructions", "agents", "skills", "workflows", "projects", "curator"]);
    expect(harnessPages.find((page) => page.id === "skills")?.label).toBe("Skills & tools");
    expect(defaultHarnessPage).toBe("overview");
    expect(resolveHarnessPage("nowhere").id).toBe("overview");
    expect(resolveHarnessPage("curator").label).toBe("Curator");
  });
});

describe("settings harness surfaces", () => {
  it("keeps the former harness URLs working by redirecting them onto a page", async () => {
    const cases = [
      {name: "harness_library", from: "/harnesses", href: "/settings/harnesses"},
      {name: "harness_configuration", from: "/harness/science", href: "/settings/harness/science/overview"},
      {name: "settings_harness_root", from: "/settings/harness/science", href: "/settings/harness/science/overview"},
      {name: "unknown_harness_page", from: "/settings/harness/science/not-a-page", href: "/settings/harness/science/overview"},
      {name: "former_inbox_page", from: "/settings/harness/science/inbox", href: "/inbox/science"},
      {name: "former_inbox_section", from: "/settings/harness/science?section=inbox", href: "/inbox/science"},
      {name: "legacy_inbox_section", from: "/harness/science?section=inbox", href: "/inbox/science"},
      {name: "settings_root", from: "/settings", href: "/settings/general"},
      {name: "unknown_section", from: "/settings/not-a-section", href: "/settings/general"},
      // The section route validates against the App pages, so About needs no route of its own.
      {name: "about_page", from: "/settings/about", href: "/settings/about"},
    ];
    for (const each of cases) {
      expect((await resolve(each.from)).href, each.name).toBe(each.href);
    }
  });

  it("carries the configured scope through the harness redirect", async () => {
    const memory = await resolve("/harness/science?projectId=lab&section=memory&agentName=reviewer");
    expect(memory.href.startsWith("/settings/harness/science/projects")).toBe(true);
    expect(memory.redirect?.search).toEqual({project: "lab"});

    const specialist = await resolve("/settings/harness/science?section=specialists&agentName=reviewer");
    expect(specialist.href.startsWith("/settings/harness/science/agents")).toBe(true);
    expect(specialist.redirect?.search).toEqual({agent: "reviewer"});
  });

  it("reaches a harness page without a redirect", async () => {
    const {href, redirect} = await resolve("/settings/harness/science/agents?agent=reviewer");
    expect(redirect).toBeUndefined();
    expect(href).toBe("/settings/harness/science/agents?agent=reviewer");

    const workflows = await resolve("/settings/harness/science/workflows?workflow=review");
    expect(workflows.redirect).toBeUndefined();
    expect(workflows.href).toBe("/settings/harness/science/workflows?workflow=review");
  });

  it("maps every former section and tab onto the page that owns it now", () => {
    const cases = [
      {name: "missing", from: undefined, page: defaultHarnessPage, search: {}},
      {name: "unknown", from: "nowhere", page: defaultHarnessPage, search: {}},
      {name: "legacy_chats", from: "Chats", page: "agents", search: {agent: mainOrchestratorAgent}},
      {name: "legacy_overview", from: "Overview", page: "overview", search: {}},
      {name: "legacy_prompts", from: "Prompts", page: "instructions", search: {}},
      {name: "legacy_context", from: "Context", page: "instructions", search: {}},
      {name: "legacy_graph", from: "Graph", page: "workflows", search: {}},
      {name: "legacy_workflow", from: "Workflow", page: "workflows", search: {}},
      {name: "legacy_run_limits", from: "Run limits", page: "overview", search: {}},
      {name: "legacy_skills", from: "Skills", page: "skills", search: {}},
      {name: "legacy_team", from: "Team", page: "agents", search: {}},
      {name: "legacy_memory_tab", from: "Memory", page: "projects", search: {}},
      {name: "legacy_memory_section", from: "memory", page: "projects", search: {}},
      {name: "section_orchestrator", from: "orchestrator", page: "agents", search: {agent: mainOrchestratorAgent}},
      {name: "section_leads", from: "leads", page: "projects", search: {}},
      {name: "section_specialists", from: "specialists", page: "agents", search: {}},
      {name: "section_curator", from: "curator", page: "curator", search: {}},
      {name: "section_skills", from: "skills", page: "skills", search: {}},
      {name: "section_tools", from: "tools", page: "skills", search: {}},
      {name: "section_connectors", from: "connectors", page: "skills", search: {}},
      {name: "section_context", from: "context", page: "instructions", search: {}},
      {name: "section_workflows", from: "workflows", page: "workflows", search: {}},
      {name: "section_limits", from: "limits", page: "overview", search: {}},
      {name: "section_projects", from: "projects", page: "projects", search: {}},

      {name: "tab_agents", from: "agents", page: "agents", search: {}},
      {name: "tab_resources", from: "resources", page: "skills", search: {}},
    ];
    for (const each of cases) {
      const resolved = legacyHarnessRoute({section: each.from});
      expect(resolved.page, each.name).toBe(each.page);
      expect(resolved.search, each.name).toEqual(each.search);
    }
  });

  it("sends every former inbox link out of settings", () => {
    expect(legacyHarnessRoute({section: "inbox"})).toEqual({page: defaultHarnessPage, search: {}, inbox: true});
    expect(legacyHarnessRoute({section: "inbox", projectId: "lab", agentName: "reviewer"}).inbox).toBe(true);
    expect(legacyHarnessRoute({section: "curator"}).inbox).toBeUndefined();
    expect(harnessPages.map((page) => String(page.id))).not.toContain("inbox");
    expect(resolveHarnessPage("inbox").id).toBe("overview");
  });

  it("keeps the old project and agent scope only where the new page uses it", () => {
    expect(legacyHarnessRoute({section: "projects", projectId: "lab", agentName: "reviewer"})).toEqual({page: "projects", search: {project: "lab"}});
    expect(legacyHarnessRoute({section: "specialists", projectId: "lab", agentName: "reviewer"})).toEqual({page: "agents", search: {agent: "reviewer"}});
    expect(legacyHarnessRoute({section: "context", projectId: "lab"})).toEqual({page: "instructions", search: {}});
  });
});
