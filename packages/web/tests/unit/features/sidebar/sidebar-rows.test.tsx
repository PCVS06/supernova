import type {ReactNode} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {beforeEach, describe, expect, it, vi} from "vitest";
import type {HarnessConfig, HarnessProject} from "@supernova/contracts/harnesses/schemas";
import SidebarInbox from "@/features/sidebar/components/sidebar-inbox";
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

const state = vi.hoisted(() => ({
  activeHarnessId: undefined as string | undefined,
  sessions: [] as StoredSession[],
  pendingProposals: 0,
  pathname: "/",
  liveSessions: {} as Record<string, {status: SessionLiveStatus}>,
}));

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
vi.mock("@/features/workspace/hooks/use-workspace-overview", () => ({
  useWorkspaceOverview: () => ({
    model: {items: [], links: []},
    data: {
      revision: 1,
      capturedAt: "2026-09-13T10:00:00Z",
      projects: [],
      runs: [],
      workflows: [],
      controls: [],
      curators: [{harnessId: "science", pending: state.pendingProposals}],
      activityTotals: [],
      errors: [],
    },
    library: {revision: 1, harnesses: [harness()], projects: []},
    isPending: false,
    error: null,
    refetch: vi.fn(),
  }),
}));
vi.mock("@/features/workspace/components/workspace-activity-link", () => ({default: () => null}));
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
  activeHarness: <T extends {id: string}>(harnesses: readonly T[], storedId?: string) => harnesses.find((item) => item.id === storedId) ?? harnesses[0],
  useHarnessNavigationStore: (select: (store: Record<string, unknown>) => unknown) =>
    select({activeHarnessId: state.activeHarnessId, selectHarness: () => undefined, selectProject: () => undefined}),
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
    state.activeHarnessId = undefined;
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

  it("identifies the harness lead with its symbol without a repeated subtitle", () => {
    const html = renderProjectRow({isCoordinator: true});

    expect(html).not.toContain(">Harness lead<");
    expect(html).not.toContain("Coordinates all labs");
    expect(html).toContain('data-constant="tau"');
    expect(html).not.toContain("group-hover/ledger:opacity-0");
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
    expect(html).not.toContain("constant-orb");
  });

  it("opens project settings from the row menu", () => {
    const html = renderProjectRow();

    expect(html).toContain("Project settings");
    expect(html).not.toContain("Project instructions");
  });

  it("offers plain project actions to a project that belongs to no harness", () => {
    const html = renderProjectRow({harnessId: undefined, harnessProjectId: undefined});

    expect(html).not.toContain("Project settings");
    expect(html).not.toContain("Remove from harness");
    expect(html).toContain("Rename project");
    expect(html).toContain(">Remove<");
    expect(html).toContain('data-constant="phi"');
  });

  it("identifies the harness with pi and keeps both group actions reachable", () => {
    const html = renderHarnessSection([project()], [configuredProject()]);

    expect(html).toContain("Science Pi");
    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain('aria-label="New project in Science Pi"');
    expect(html).toContain('aria-label="Harness settings for Science Pi"');
    expect(html).toContain(">1 project<");
    expect(html).not.toContain("bg-surface-sidebar");
    expect(html).toContain('data-constant="pi"');
  });

  it("opens the inbox of the first harness until a harness is chosen", () => {
    expect(renderToStaticMarkup(<SidebarInbox />)).toContain('href="/inbox/science"');
    state.activeHarnessId = "gone";
    expect(renderToStaticMarkup(<SidebarInbox />)).toContain('href="/inbox/science"');
  });

  it("links directly to curator proposals and signals pending decisions without an inline inbox", () => {
    const quiet = renderToStaticMarkup(<SidebarInbox />);
    state.pendingProposals = 2;
    const waiting = renderToStaticMarkup(<SidebarInbox />);
    expect(quiet).not.toContain("curator decisions");
    expect(waiting).toContain('aria-label="2 curator decisions"');
    expect(waiting).toContain('href="/inbox/science"');
    expect(waiting).not.toContain("aria-expanded");
    expect(waiting).not.toContain(">Inbox<");
    expect(renderHarnessSection([project()], [configuredProject()])).not.toContain("proposals waiting");
  });

  it("keeps empty harnesses collapsed while creation remains reachable", () => {
    const html = renderHarnessSection([], []);

    expect(html).not.toContain("Add a project");
    expect(html).toContain('aria-label="New project in Science Pi"');
  });

  it("gives the chat stable hover actions without completion metadata", () => {
    const html = renderToStaticMarkup(
      <ProjectSessionListItem
        onOpen={() => undefined}
        onPrefetch={() => undefined}
        onTogglePinned={() => undefined}
        projectPath="/work/lab"
        selected
        session={{id: "c1", pinned: false, title: "Launch review"}}
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
    expect(html).not.toContain(">3h<");
    expect(html).not.toContain("group-hover/ledger:opacity-100");
    expect(html).not.toContain("group-hover/ledger:scale-110");
    expect(html).not.toContain("group-hover/ledger:-rotate-6");
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
      expect(html).toContain('data-state="working"');
      expect(html).not.toContain("1 working");
    }
    expect(collapsed).not.toContain('aria-label="Open chat: Research 7"');
  });

  it.each([
    ["streaming", "Working"],
    ["compacting", "Compacting"],
    ["stopping", "Stopping"],
  ] as const)("keeps the actual %s state available without extra row text", (status, label) => {
    const html = renderToStaticMarkup(
      <ProjectSessionListItem
        onOpen={() => undefined}
        onPrefetch={() => undefined}
        onTogglePinned={() => undefined}
        projectPath="/work/lab"
        selected={false}
        session={{id: "c1", title: "Review", pinned: true}}
        streaming
        status={status}
        unseen={false}
      />
    );
    expect(html).toContain(`aria-label="${label}"`);
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
        session={{id: "c1", title: "Owner chat", pinned: false}}
        streaming={false}
        unseen={false}
      />
    );
    expect(html).toContain('aria-label="Open chat: Owner chat"');
    expect(html).not.toContain('aria-current="page"');
  });
});
