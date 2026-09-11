import {createRootRouteWithContext, createRoute, createRouter, redirect} from "@tanstack/react-router";
import type {AppEnvironment} from "@/lib/app-environment";
import {
  HarnessRunRoute,
  HarnessConfigRoute,
  HarnessesRoute,
  HomeLayoutRoute,
  HomeRoute,
  NewSessionRoute,
  RootRoute,
  SessionRoute,
  SettingsSectionRoute,
  WorkflowRunRoute,
} from "@/app/routes";
import {defaultSettingsSectionId, settingsSections} from "@/features/settings/data/settings-sections";

interface RouterContext {
  appEnvironment: AppEnvironment;
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

const harnessesRoute = createRoute({getParentRoute: () => homeLayoutRoute, path: "harnesses", component: HarnessesRoute});
const harnessConfigRoute = createRoute({
  getParentRoute: () => homeLayoutRoute,
  path: "harness/$harnessId",
  component: HarnessConfigRoute,
  validateSearch: (search: Record<string, unknown>): {section?: string; projectId?: string; agentName?: string} => ({
    section: typeof search.section === "string" ? search.section : undefined,
    projectId: typeof search.projectId === "string" ? search.projectId : undefined,
    agentName: typeof search.agentName === "string" ? search.agentName : undefined,
  }),
});
const routeTree = rootRoute.addChildren([
  homeLayoutRoute.addChildren([indexRoute, newSessionRoute, sessionRoute, harnessRunRoute, workflowRunRoute, harnessesRoute, harnessConfigRoute]),
  settingsRoute,
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
