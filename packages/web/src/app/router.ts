import {createRootRouteWithContext, createRoute, createRouter, redirect} from "@tanstack/react-router";
import type {AppEnvironment} from "@/lib/app-environment";
import {
  HarnessRunRoute,
  HomeLayoutRoute,
  HomeRoute,
  InboxRoute,
  NewSessionRoute,
  RootRoute,
  SessionRoute,
  SettingsHarnessPageRoute,
  SettingsSectionRoute,
  WorkflowRunRoute,
} from "@/app/routes";
import {harnessPages, legacyHarnessRoute} from "@/features/harnesses/lib/harness-sections";
import {defaultSettingsSectionId, settingsAppPages} from "@/features/settings/data/settings-tree";

interface RouterContext {
  appEnvironment: AppEnvironment;
}

interface LegacyHarnessSearch {
  section?: string;
  projectId?: string;
  agentName?: string;
}

interface HarnessPageSearch {
  agent?: string;
  project?: string;
  workflow?: string;
}

/** The scope of a harness page: which agent, project or workflow is open. */
function validateHarnessPageSearch(search: Record<string, unknown>): HarnessPageSearch {
  return {
    agent: typeof search.agent === "string" ? search.agent : undefined,
    project: typeof search.project === "string" ? search.project : undefined,
    workflow: typeof search.workflow === "string" ? search.workflow : undefined,
  };
}

/** The search harness links used before the tree existed. Kept so old links can be mapped onto a page. */
function validateLegacyHarnessSearch(search: Record<string, unknown>): LegacyHarnessSearch {
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
    if (!settingsAppPages.some((page) => page.id === params.sectionId)) {
      throw redirect({params: {sectionId: defaultSettingsSectionId}, to: "/settings/$sectionId"});
    }
  },
  component: SettingsSectionRoute,
});

const settingsHarnessPageRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "settings/harness/$harnessId/$page",
  validateSearch: validateHarnessPageSearch,
  beforeLoad: ({params, search}) => {
    if (harnessPages.some((page) => page.id === params.page)) return;
    const {page, inbox} = legacyHarnessRoute({section: params.page});
    if (inbox) throw redirect({params: {harnessId: params.harnessId}, to: "/inbox/$harnessId"});
    throw redirect({params: {harnessId: params.harnessId, page}, search, to: "/settings/harness/$harnessId/$page"});
  },
  component: SettingsHarnessPageRoute,
});

// The inbox decides work, so it lives in the home layout beside the chats rather than inside settings.
const inboxRoute = createRoute({
  getParentRoute: () => homeLayoutRoute,
  path: "inbox/$harnessId",
  component: InboxRoute,
});

// One page per URL replaced `?section=`. The former harness URLs stay as redirects so existing links keep working.
const settingsHarnessConfigRedirectRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "settings/harness/$harnessId",
  validateSearch: validateLegacyHarnessSearch,
  beforeLoad: ({params, search}) => {
    const {page, search: next, inbox} = legacyHarnessRoute(search);
    if (inbox) throw redirect({params: {harnessId: params.harnessId}, to: "/inbox/$harnessId"});
    throw redirect({params: {harnessId: params.harnessId, page}, search: next, to: "/settings/harness/$harnessId/$page"});
  },
});

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
  validateSearch: validateLegacyHarnessSearch,
  beforeLoad: ({params, search}) => {
    const {page, search: next, inbox} = legacyHarnessRoute(search);
    if (inbox) throw redirect({params: {harnessId: params.harnessId}, to: "/inbox/$harnessId"});
    throw redirect({params: {harnessId: params.harnessId, page}, search: next, to: "/settings/harness/$harnessId/$page"});
  },
});

export const routeTree = rootRoute.addChildren([
  homeLayoutRoute.addChildren([indexRoute, newSessionRoute, sessionRoute, harnessRunRoute, workflowRunRoute, inboxRoute, harnessesRedirectRoute, harnessConfigRedirectRoute]),
  settingsRoute,
  settingsHarnessPageRoute,
  settingsHarnessConfigRedirectRoute,
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
