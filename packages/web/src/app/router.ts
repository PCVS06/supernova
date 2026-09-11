import {createRootRouteWithContext, createRoute, createRouter, redirect} from "@tanstack/react-router";
import type {AppEnvironment} from "@/lib/app-environment";
import {
  HarnessRunRoute,
  HomeLayoutRoute,
  HomeRoute,
  NewSessionRoute,
  RootRoute,
  SessionRoute,
  SettingsHarnessConfigRoute,
  SettingsSectionRoute,
  WorkflowRunRoute,
} from "@/app/routes";
import {defaultSettingsSectionId, settingsSections} from "@/features/settings/data/settings-sections";

interface RouterContext {
  appEnvironment: AppEnvironment;
}

interface HarnessConfigSearch {
  section?: string;
  projectId?: string;
  agentName?: string;
}

/** Harness configuration keeps the same search contract on the legacy and the settings route, so old links survive the redirect. */
function validateHarnessConfigSearch(search: Record<string, unknown>): HarnessConfigSearch {
  return {
    section: typeof search.section === "string" ? search.section : undefined,
    projectId: typeof search.projectId === "string" ? search.projectId : undefined,
    agentName: typeof search.agentName === "string" ? search.agentName : undefined,
  };
}

const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: RootRoute,
});

const homeLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "home-layout",
  component: HomeLayoutRoute,
});

const indexRoute = createRoute({
  getParentRoute: () => homeLayoutRoute,
  path: "/",
  component: HomeRoute,
});

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "settings",
  beforeLoad: () => {
    throw redirect({params: {sectionId: defaultSettingsSectionId}, to: "/settings/$sectionId"});
  },
});

const sessionRoute = createRoute({
  getParentRoute: () => homeLayoutRoute,
  path: "session/$sessionId",
  component: SessionRoute,
});
const harnessRunRoute = createRoute({getParentRoute: () => homeLayoutRoute, path: "session/$sessionId/run/$runId", component: HarnessRunRoute});
const workflowRunRoute = createRoute({getParentRoute: () => homeLayoutRoute, path: "session/$sessionId/workflow/$runId", component: WorkflowRunRoute});

const newSessionRoute = createRoute({
  getParentRoute: () => homeLayoutRoute,
  path: "session/new",
  component: NewSessionRoute,
});

const settingsSectionRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "settings/$sectionId",
  beforeLoad: ({params}) => {
    if (!settingsSections.some((section) => section.id === params.sectionId)) {
      throw redirect({params: {sectionId: defaultSettingsSectionId}, to: "/settings/$sectionId"});
    }
  },
  component: SettingsSectionRoute,
});

const settingsHarnessConfigRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "settings/harness/$harnessId",
  component: SettingsHarnessConfigRoute,
  validateSearch: validateHarnessConfigSearch,
});

// Harness configuration moved into settings. The former routes stay as redirects so existing links keep working.
const harnessesRedirectRoute = createRoute({
  getParentRoute: () => homeLayoutRoute,
  path: "harnesses",
  beforeLoad: () => {
    throw redirect({params: {sectionId: "harnesses"}, to: "/settings/$sectionId"});
  },
});

const harnessConfigRedirectRoute = createRoute({
  getParentRoute: () => homeLayoutRoute,
  path: "harness/$harnessId",
  validateSearch: validateHarnessConfigSearch,
  beforeLoad: ({params, search}) => {
    throw redirect({params: {harnessId: params.harnessId}, search, to: "/settings/harness/$harnessId"});
  },
});

export const routeTree = rootRoute.addChildren([
  homeLayoutRoute.addChildren([indexRoute, newSessionRoute, sessionRoute, harnessRunRoute, workflowRunRoute, harnessesRedirectRoute, harnessConfigRedirectRoute]),
  settingsRoute,
  settingsHarnessConfigRoute,
  settingsSectionRoute,
]);

export const router = createRouter({
  context: {
    appEnvironment: "web",
  },
  routeTree,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
