import type {ReactNode} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {beforeEach, describe, expect, it, vi} from "vitest";
import type {HarnessConfig, HarnessProject} from "@supernova/contracts/harnesses/schemas";
import HarnessSidebarSection from "@/features/harnesses/components/harness-sidebar-section";
import ProjectListItem from "@/features/projects/components/project-list/project-list-item";
import ProjectSessionListItem from "@/features/projects/components/project-list/project-session-list-item";
import type {ProjectListProject} from "@/features/projects/types/project-list";
import type {SessionLiveStatus} from "@/features/sessions/stores/session-live-store";
import {sidebarSessionId} from "@/features/sidebar/lib/ledger-navigation";

interface StoredSession {
  id: string;
  title: string;
  updatedAt: string;
}

const state = vi.hoisted(() => ({sessions: [] as StoredSession[], pendingProposals: 0, pathname: "/", liveSessions: {} as Record<string, {status: SessionLiveStatus}>}));

function MockLink(props: {
  readonly "aria-label"?: string;
  readonly children: ReactNode;
  readonly className?: string;
  readonly params?: Record<string, string>;
  readonly search?: Record<string, string>;
  readonly title?: string;
  readonly to: string;
}) {
  const {children, className, params, search, title, to} = props;
  const path = Object.entries(params ?? {}).reduce((current, [key, value]) => current.replace(`$${key}`, value), to);
  const query = new URLSearchParams(search ?? {}).toString();

  return (
    <a aria-label={props["aria-label"]} className={className} href={query ? `${path}?${query}` : path} title={title}>
      {children}
    </a>
  );
}

vi.mock("@tanstack/react-router", () => ({
  Link: MockLink,
  useLocation: () => ({pathname: state.pathname}),
  useNavigate: () => () => undefined,
}));
vi.mock("@tanstack/react-query", () => ({useQueryClient: () => ({prefetchQuery: () => undefined})}));
vi.mock("@/features/harnesses/hooks/api/use-harnesses", () => ({
  useHarnessLibrary: () => ({data: {revision: 1, harnesses: [], projects: []}}),
  useRemoveHarnessProject: () => ({mutate: () => undefined}),
}));
vi.mock("@/features/harnesses/hooks/api/use-curation", () => ({
  useCuration: () => ({data: {proposals: Array.from({length: state.pendingProposals}, () => ({status: "pending"})), reviews: []}}),
}));
vi.mock("@/components/ui/menu", () => ({
  default: (props: {children: ReactNode; trigger: (triggerProps: {readonly "aria-label": string}) => ReactNode; triggerLabel: string}) => (
    <>
      {props.trigger({"aria-label": props.triggerLabel})}
      {props.children}
    </>
  ),
  MenuItem: (props: {children: ReactNode}) => <div>{props.children}</div>,
}));
vi.mock("@/features/projects/components/project-list/sortable-project-list", () => ({default: () => <ul data-testid="project-rows" />}));
vi.mock("@/features/projects/hooks/api/use-list-project-sessions", () => ({
  useListProjectSessions: () => ({data: {sessions: state.sessions}, error: null, isPending: false}),
}));
vi.mock("@/features/sessions/hooks/api/use-session", () => ({sessionQueryOptions: () => ({queryKey: ["session"]})}));
vi.mock("@/features/sessions/hooks/api/use-rename-session", () => ({useRenameSession: () => ({mutate: () => undefined})}));
vi.mock("@/features/sessions/components/session-actions-menu", () => ({
  default: (props: {sessionTitle: string; triggerClassName?: string}) => (
    <button aria-label={`Chat actions for ${props.sessionTitle}`} className={props.triggerClassName} type="button" />
  ),
}));
vi.mock("@/features/harnesses/components/chat-run-list", () => ({default: () => null}));
vi.mock("@/features/projects/stores/projects-store", () => ({
  useProjectsStore: (select: (store: Record<string, unknown>) => unknown) =>
    select({
      projects: [],
      addProject: () => undefined,
      removeProject: () => undefined,
      renameProject: () => undefined,
      reorderProject: () => undefined,
      toggleProjectPinned: () => undefined,
      toggleSessionPinned: () => undefined,
    }),
}));
vi.mock("@/features/sessions/stores/session-live-store", () => ({
  useSessionLiveStore: (select: (store: Record<string, unknown>) => unknown) => select({sessions: state.liveSessions}),
}));
vi.mock("@/features/sessions/stores/session-visits-store", () => ({
  hasUnseenActivity: () => false,
  useSessionVisitsStore: (select: (store: Record<string, unknown>) => unknown) => select({visits: {}}),
}));
vi.mock("@/features/harnesses/stores/harness-navigation-store", () => ({
  useHarnessNavigationStore: (select: (store: Record<string, unknown>) => unknown) => select({selectHarness: () => undefined, selectProject: () => undefined}),
}));

function project(overrides: Partial<ProjectListProject> = {}): ProjectListProject {
  return {
    id: "p1",
    harnessId: "science",
    harnessProjectId: "lab",
    name: "Science Spaceflight Lab",
    path: "/work/lab",
    pinned: false,
    pinnedSessionIds: [],
    ...overrides,
  };
}

function harness(overrides: Partial<HarnessConfig> = {}): HarnessConfig {
  return {
    id: "science",
    name: "Science Pi",
    description: "",
    systemPrompt: "",
    agents: [],
    extensions: [],
    skills: [],
    context: {instructions: "", files: [], includeProjectInstructions: true, autoCompaction: true, reserveTokens: 0, keepRecentTokens: 0},
    graph: {steps: []},
    loop: {maxTurns: 1, timeoutSeconds: 1},
    ...overrides,
  };
}

function configuredProject(overrides: Partial<HarnessProject> = {}): HarnessProject {
  return {
    id: "lab",
    harnessId: "science",
    name: "Science Spaceflight Lab",
    path: "/work/lab",
    systemPrompt: "",
    contextInstructions: "",
    agents: [],
    ...overrides,
  };
}

function renderProjectRow(overrides: Partial<ProjectListProject> = {}, folderMissing = false): string {
  return renderToStaticMarkup(
    <ProjectListItem activeSessionId="" dragging={false} expanded={false} folderMissing={folderMissing} onToggle={() => undefined} project={project(overrides)} />
  );
}

function renderHarnessSection(projects: ProjectListProject[], configuredProjects: HarnessProject[]): string {
  return renderToStaticMarkup(
    <HarnessSidebarSection
      activeSessionId=""
      configuredProjects={configuredProjects}
      expandedProjectIds={new Set<string>()}
      harness={harness()}
      onAddProject={() => undefined}
      onToggleProject={() => undefined}
      projects={projects}
    />
  );
}

describe("sidebar rows", () => {
  beforeEach(() => {
    state.sessions = [];
    state.pendingProposals = 0;
    state.pathname = "/";
    state.liveSessions = {};
    vi.stubGlobal("window", {});
  });

  it("keeps the project name clear of its hover actions in a reserved slot", () => {
    const html = renderProjectRow();

    // The actions sit in a fixed-width right slot, so they can never cover the name.
    expect(html).toContain("Science Spaceflight Lab");
    expect(html).toContain("w-14");
    expect(html).toContain('aria-label="New chat in Science Spaceflight Lab"');
    expect(html).toContain('aria-label="Project actions for Science Spaceflight Lab"');
    expect(html.indexOf("Science Spaceflight Lab")).toBeLessThan(html.indexOf('aria-label="New chat in Science Spaceflight Lab"'));
  });

  it("identifies the harness lead separately from the project name", () => {
    const html = renderProjectRow({isCoordinator: true});

    expect(html).toContain(">Harness lead<");
    expect(html).not.toContain("Coordinates all labs");
    expect(html).not.toContain("pi-orb");
  });

  it("names the disclosure after its project and names its chat action when chats exist", () => {
    const withoutChats = renderProjectRow();
    state.sessions = [{id: "c1", title: "Launch review", updatedAt: "2026-09-11T10:00:00Z"}];
    const withChats = renderProjectRow();

    expect(withoutChats).not.toContain("chats in Science Spaceflight Lab");
    expect(withoutChats).toContain('aria-label="Science Spaceflight Lab"');
    expect(withChats).toContain('aria-label="Expand chats in Science Spaceflight Lab"');
  });

  it("warns about a missing folder and refuses to start a chat there", () => {
    const html = renderProjectRow({}, true);

    expect(html).toContain('title="Folder missing: /work/lab"');
    expect(html).toContain("text-danger-ink");
    expect(html).toContain("disabled");
    // The ring belongs to a project that exists; a missing folder shows a warning instead.
    expect(html).not.toContain("pi-orb");
  });

  it("opens project settings from the row menu", () => {
    const html = renderProjectRow();

    expect(html).toContain("Project settings");
    expect(html).not.toContain("Project instructions");
  });

  it("names the harness group, hides its ring and keeps both group actions reachable", () => {
    const html = renderHarnessSection([project()], [configuredProject()]);

    expect(html).toContain("Science Pi");
    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain('aria-label="New project in Science Pi"');
    expect(html).toContain('aria-label="Harness settings for Science Pi"');
    expect(html).toContain(">1 project<");
    expect(html).not.toContain("bg-surface-sidebar");
    // Rings identify projects, so the group header carries none.
    expect(html).not.toContain("pi-orb");
  });

  it("carries waiting proposals into the harness inbox and stays invisible at zero", () => {
    const quiet = renderHarnessSection([project()], [configuredProject()]);
    state.pendingProposals = 2;
    const waiting = renderHarnessSection([project()], [configuredProject()]);

    expect(quiet).not.toContain("proposals waiting");
    expect(waiting).toContain('aria-label="2 proposals waiting in Science Pi"');
    expect(waiting).toContain('href="/settings/harness/science?section=inbox"');
    expect(waiting).toContain(">2<");
  });

  it("invites a first project when a harness is empty", () => {
    const html = renderHarnessSection([], []);

    expect(html).toContain("Add a project");
    expect(html).toContain('aria-label="New project in Science Pi"');
  });

  it("gives the chat its own navigation target, timestamp and separate actions", () => {
    const html = renderToStaticMarkup(
      <ProjectSessionListItem
        onOpen={() => undefined}
        onPrefetch={() => undefined}
        onTogglePinned={() => undefined}
        projectPath="/work/lab"
        selected
        session={{id: "c1", pinned: false, title: "Launch review", updatedAt: "3h"}}
        streaming={false}
        unseen={false}
      />
    );

    expect(html).toContain("Launch review");
    expect(html).toContain('aria-label="Open chat: Launch review"');
    expect(html).toContain('aria-current="page"');
    expect(html).toContain('aria-label="Pin chat"');
    // Pinning has its own button after the navigation button, never inside it.
    const primaryButton = html.slice(html.indexOf("<button"), html.indexOf("</button>"));
    expect(primaryButton).not.toContain('aria-label="Pin chat"');
    expect(html).toContain(">3h<");
    expect(html).toContain("bg-overlay-pressed");
    // A selected chat reads as a filled row, not as a bordered one.
    expect(html).not.toContain("border-l-2");
  });

  it.each(["streaming", "compacting", "stopping"] as const)("keeps a %s chat visible beyond the recent limit and inside a collapsed project", (status) => {
    state.sessions = Array.from({length: 8}, (_, index) => ({id: `chat-${index}`, title: `Research ${index}`, updatedAt: `2026-09-11T10:0${index}:00Z`}));
    state.liveSessions = {"chat-0": {status}};
    const collapsed = renderProjectRow();
    const expanded = renderToStaticMarkup(<ProjectListItem activeSessionId="" dragging={false} expanded onToggle={() => undefined} project={project()} />);
    for (const html of [collapsed, expanded]) {
      expect(html).toContain('aria-label="Open chat: Research 0"');
      expect(html).toContain("1 working");
    }
    expect(collapsed).not.toContain('aria-label="Open chat: Research 7"');
  });

  it.each([
    ["streaming", "Working"],
    ["compacting", "Compacting"],
    ["stopping", "Stopping"],
  ] as const)("shows the actual %s state instead of a generic busy animation", (status, label) => {
    const html = renderToStaticMarkup(
      <ProjectSessionListItem
        onOpen={() => undefined}
        onPrefetch={() => undefined}
        onTogglePinned={() => undefined}
        projectPath="/work/lab"
        selected={false}
        session={{id: "c1", title: "Review", pinned: true, updatedAt: "3h"}}
        streaming
        status={status}
        unseen={false}
      />
    );
    expect(html).toContain(`>${label}<`);
    expect(html).not.toContain(">3h<");
  });

  it.each([
    ["/session/chat", "chat"],
    ["/session/chat/run/worker", "chat"],
    ["/session/chat/workflow/review", "chat"],
    ["/session/new", ""],
    ["/settings/harness/science", ""],
  ])("resolves the owning chat for %s", (pathname, expected) => {
    expect(sidebarSessionId(pathname)).toBe(expected);
  });

  it("keeps the owner chat accessible without marking it as the selected worker page", () => {
    const html = renderToStaticMarkup(
      <ProjectSessionListItem
        onOpen={() => undefined}
        onPrefetch={() => undefined}
        onTogglePinned={() => undefined}
        projectPath="/work/lab"
        selected
        current={false}
        session={{id: "c1", title: "Owner chat", pinned: false, updatedAt: "1h"}}
        streaming={false}
        unseen={false}
      />
    );
    expect(html).toContain('aria-label="Open chat: Owner chat"');
    expect(html).not.toContain('aria-current="page"');
  });
});
