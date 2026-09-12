import type {ComponentProps} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {createMemoryHistory, createRootRoute, createRoute, createRouter, RouterContextProvider} from "@tanstack/react-router";
import type {Session} from "@supernova/contracts/sessions/schemas";
import {beforeEach, describe, expect, it, vi} from "vitest";
import NewSessionPage from "@/features/sessions/pages/new-session-page";
import type SessionComposer from "@/features/sessions/components/composer/session-composer";
import {newSessionComposerDraftKey, sessionComposerDraftKey, useComposerDraftsStore} from "@/features/sessions/stores/composer-drafts-store";

const calls = vi.hoisted(() => ({
  create: vi.fn(),
  rename: vi.fn(),
  controls: vi.fn(),
  send: vi.fn(),
  assign: vi.fn(),
  composer: undefined as ComponentProps<typeof SessionComposer> | undefined,
}));
vi.mock("@/features/sessions/hooks/api/use-create-session", () => ({useCreateSession: () => ({mutateAsync: calls.create, isPending: false})}));
vi.mock("@/features/sessions/hooks/api/use-rename-session", () => ({useRenameSession: () => ({mutateAsync: calls.rename})}));
vi.mock("@/features/sessions/hooks/api/use-session-controls", () => ({useUpdateSessionControls: () => ({mutateAsync: calls.controls})}));
vi.mock("@/rpc/use-rpc-client", () => ({useRpcClient: () => ({run: calls.send})}));
vi.mock("@/features/harnesses/hooks/api/use-harnesses", () => ({useHarnessLibrary: () => ({data: {projects: [], harnesses: []}, isPending: false})}));
vi.mock("@/features/sessions/hooks/use-composer-model-selection", () => ({
  useComposerModelSelection: () => ({
    modelReference: {providerId: "test", id: "test-model"},
    isPending: false,
    assignToSession: calls.assign,
  }),
}));
vi.mock("@/features/sessions/components/composer/session-composer", () => ({
  default: (props: ComponentProps<typeof SessionComposer>) => {
    calls.composer = props;
    return null;
  },
}));

const session: Session = {
  id: "new-chat",
  title: "Untitled session",
  context: {usedTokens: 0, contextWindow: 1000},
  projectPath: "/work",
  turns: [],
  undoneTurns: [],
  updatedAt: "2026-09-12",
};
const draftKey = newSessionComposerDraftKey("/work");
const attachment = {id: "note", type: "attachment", name: "note.md", kind: "text", mime: "text/markdown", size: 4, contentBase64: "dGVzdA=="} as const;

function renderNewChat() {
  const rootRoute = createRootRoute();
  const routeTree = rootRoute.addChildren([
    createRoute({getParentRoute: () => rootRoute, path: "/session/new"}),
    createRoute({getParentRoute: () => rootRoute, path: "/session/$sessionId"}),
    createRoute({getParentRoute: () => rootRoute, path: "/settings"}),
  ]);
  const router = createRouter({routeTree, history: createMemoryHistory({initialEntries: ["/session/new"]})});
  const queryClient = new QueryClient({defaultOptions: {queries: {retry: false}}});
  renderToStaticMarkup(
    <QueryClientProvider client={queryClient}>
      <RouterContextProvider router={router}>
        <NewSessionPage projectName="Work" projectPath="/work" />
      </RouterContextProvider>
    </QueryClientProvider>
  );
  return {composer: calls.composer!, router};
}

describe("new-chat goal delivery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    calls.create.mockReset().mockResolvedValue(session);
    calls.controls.mockReset().mockResolvedValue({});
    calls.rename.mockReset().mockResolvedValue(session);
    calls.send.mockReset().mockResolvedValue(undefined);
    useComposerDraftsStore.setState({drafts: {}});
    useComposerDraftsStore.getState().setDraftContentParts(draftKey, [{type: "text", text: "/goal Finish docs"}, attachment]);
  });

  it("creates and names the chat before starting the goal, without sending the slash command", async () => {
    const {composer} = renderNewChat();
    expect(await composer.onStartGoal!("Finish docs")).toBe(true);
    expect(calls.create).toHaveBeenCalledExactlyOnceWith({projectPath: "/work", harnessProjectId: undefined});
    expect(calls.rename).toHaveBeenCalledExactlyOnceWith({sessionId: "new-chat", title: "Finish docs"});
    expect(calls.controls).toHaveBeenCalledWith({
      sessionId: "new-chat",
      action: expect.objectContaining({type: "start_goal", objective: "Finish docs", modelReference: {providerId: "test", id: "test-model"}}),
    });
    expect(calls.send).not.toHaveBeenCalled();
    expect(calls.rename.mock.invocationCallOrder[0]).toBeLessThan(calls.controls.mock.invocationCallOrder[0]!);
    // The real composer clears accepted text before the page transfers retained files.
    useComposerDraftsStore.getState().setDraftEditableContentParts(draftKey, []);
    composer.onAccepted!();
    expect(useComposerDraftsStore.getState().drafts[draftKey]).toBeUndefined();
    expect(useComposerDraftsStore.getState().drafts[sessionComposerDraftKey("new-chat")]?.attachments).toEqual([attachment]);
    await expect(composer.onStartGoal!("A different goal")).rejects.toThrow("already started");
    expect(calls.controls).toHaveBeenCalledOnce();
  });

  it.each(["creation", "title", "goal"])("retains the draft when %s fails and retries without duplicating a created chat", async (failure) => {
    ({creation: calls.create, title: calls.rename, goal: calls.controls})[failure]!.mockRejectedValueOnce(new Error("Request rejected"));
    const {composer} = renderNewChat();
    const before = useComposerDraftsStore.getState().drafts[draftKey];
    await expect(composer.onStartGoal!("Finish docs")).rejects.toThrow("Request rejected");
    expect(useComposerDraftsStore.getState().drafts[draftKey]).toEqual(before);
    expect(calls.send).not.toHaveBeenCalled();
    expect(await composer.onStartGoal!("Finish docs")).toBe(true);
    expect(calls.create).toHaveBeenCalledTimes(failure === "creation" ? 2 : 1);
    expect(calls.controls).toHaveBeenLastCalledWith(expect.objectContaining({sessionId: "new-chat"}));
  });

  it("does not reopen an accepted chat after the user navigates elsewhere", async () => {
    const {composer, router} = renderNewChat();
    expect(await composer.onStartGoal!("Finish docs")).toBe(true);
    await router.navigate({to: "/settings"});

    composer.onAccepted!();

    await vi.waitFor(() => expect(router.state.location.pathname).toBe("/settings"));
  });
});
