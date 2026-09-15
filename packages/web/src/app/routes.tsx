import {Outlet, useParams, useRouteContext, useSearch} from "@tanstack/react-router";
import HomePage from "@/components/home-page";
import {useProjectList} from "@/features/projects/hooks/use-project-list";
import SettingsPage from "@/features/settings/pages/settings-page";
import NewSessionPage from "@/features/sessions/pages/new-session-page";
import SessionPage from "@/features/sessions/pages/session-page";
import HarnessConfigPage from "@/features/harnesses/pages/harness-config-page";
import InboxPage from "@/features/harnesses/pages/inbox-page";
import HarnessRunPage from "@/features/harnesses/pages/harness-run-page";
import WorkflowRunPage from "@/features/harnesses/pages/workflow-run-page";

export function HarnessRunRoute() {
  const {sessionId, runId} = useParams({from: "/home-layout/session/$sessionId/run/$runId"});
  return <HarnessRunPage sessionId={sessionId} runId={runId} />;
}

export function WorkflowRunRoute() {
  const {sessionId, runId} = useParams({from: "/home-layout/session/$sessionId/workflow/$runId"});
  return <WorkflowRunPage sessionId={sessionId} runId={runId} />;
}

function EmptySessionState() {
  return (
    <div className="grid flex-1 place-items-center px-6 py-10">
      <p className="text-sm text-ink-faint">Select a session or start a new one.</p>
    </div>
  );
}

export function RootRoute() {
  return <Outlet />;
}

export function HomeLayoutRoute() {
  const {appEnvironment} = useRouteContext({from: "__root__"});

  return (
    <HomePage appEnvironment={appEnvironment}>
      <Outlet />
    </HomePage>
  );
}

export function HomeRoute() {
  return <EmptySessionState />;
}

export function InboxRoute() {
  const {harnessId} = useParams({from: "/home-layout/inbox/$harnessId"});

  return <InboxPage key={harnessId} harnessId={harnessId} />;
}

export function SessionRoute() {
  const {appEnvironment} = useRouteContext({from: "__root__"});
  const {sessionId} = useParams({from: "/home-layout/session/$sessionId"});

  return <SessionPage appEnvironment={appEnvironment} key={sessionId} sessionId={sessionId} />;
}

export function NewSessionRoute() {
  const search = useSearch({from: "/home-layout/session/new"}) as {projectId?: string};
  const projects = useProjectList();
  const project = search.projectId ? projects.find((candidate) => candidate.id === search.projectId) : undefined;

  if (!project) return <EmptySessionState />;

  return <NewSessionPage harnessProjectId={project.harnessProjectId} projectName={project.name} projectPath={project.path} />;
}

export function SettingsSectionRoute() {
  const {appEnvironment} = useRouteContext({from: "__root__"});
  const {sectionId} = useParams({from: "/settings/$sectionId"});

  return <SettingsPage appEnvironment={appEnvironment} sectionId={sectionId} />;
}

export function SettingsHarnessPageRoute() {
  const {appEnvironment} = useRouteContext({from: "__root__"});
  const {harnessId, page} = useParams({from: "/settings/harness/$harnessId/$page"});
  const search = useSearch({from: "/settings/harness/$harnessId/$page"});

  return <HarnessConfigPage appEnvironment={appEnvironment} key={harnessId} harnessId={harnessId} page={page} {...search} />;
}
