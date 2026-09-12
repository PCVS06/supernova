import type {UserMessageContentPart} from "@supernova/contracts/sessions/schemas";
import {renderToStaticMarkup} from "react-dom/server";
import {describe, expect, it, vi} from "vitest";
import SessionComposer from "@/features/sessions/components/composer/session-composer";
import type {ComposerAttachmentsController} from "@/features/sessions/hooks/use-composer-attachments";
import type {SessionLiveStatus} from "@/features/sessions/stores/session-live-store";

vi.mock("@/features/sessions/hooks/api/use-composer-suggestions", () => ({useComposerSuggestions: () => ({data: undefined, isPending: false})}));

const attachments: ComposerAttachmentsController = {
  addFiles: vi.fn(),
  attachments: [],
  clear: vi.fn(),
  dropZoneProps: {},
  isDraggingFiles: false,
  isProcessing: false,
  remove: vi.fn(),
  removeUnsupportedImages: vi.fn(),
};

function composerMarkup(input: {readonly contentParts?: readonly UserMessageContentPart[]; readonly streamStatus: SessionLiveStatus}): string {
  return renderToStaticMarkup(
    <SessionComposer
      attachments={attachments}
      disabled={false}
      draft={{contentParts: input.contentParts ?? []}}
      onInterrupt={vi.fn()}
      onSteer={vi.fn()}
      onQueue={vi.fn()}
      onStartGoal={vi.fn()}
      onSubmit={vi.fn()}
      projectPath="/workspace"
      streamStatus={input.streamStatus}
    />
  );
}

describe("session composer primary action", () => {
  it("sends while the chat is idle", () => {
    const html = composerMarkup({contentParts: [{text: "Fix the parser", type: "text"}], streamStatus: "idle"});

    expect(html).toContain('aria-label="Send message"');
    expect(html).not.toContain("Steer");
    expect(html).toContain("Enter sends");
  });

  it("queues by default while a turn is streaming and keeps explicit steering and stop", () => {
    const html = composerMarkup({contentParts: [{text: "Use the other file", type: "text"}], streamStatus: "streaming"});

    expect(html).toContain('aria-label="Steer now"');
    expect(html).toContain('aria-label="Queue message"');
    expect(html).toContain('aria-label="Stop streaming"');
    expect(html).not.toContain('aria-label="Send message"');
    expect(html).toContain("Enter queues");
  });

  it("keeps steering unavailable until the user has written something", () => {
    const empty = composerMarkup({streamStatus: "streaming"});
    const written = composerMarkup({contentParts: [{text: "Stop editing tests", type: "text"}], streamStatus: "streaming"});

    expect(empty).toMatch(/aria-label="Steer now"[^>]*disabled/);
    expect(written).not.toMatch(/aria-label="Steer now"[^>]*disabled/);
  });

  it("shows stopping as its own state while the abort settles", () => {
    const html = composerMarkup({contentParts: [{text: "Never mind", type: "text"}], streamStatus: "stopping"});

    expect(html).toContain('aria-label="Stopping stream"');
    expect(html).toMatch(/aria-label="Steer now"[^>]*disabled/);
  });

  it("recognizes a typed goal without offering to steer the slash command", () => {
    const html = composerMarkup({contentParts: [{text: "/goal Fix the parser", type: "text"}], streamStatus: "streaming"});
    expect(html).toContain('aria-label="Start goal"');
    expect(html).not.toContain('aria-label="Steer now"');
  });

  it("allows queueing during compaction while steering is unavailable", () => {
    const html = composerMarkup({contentParts: [{text: "Check the logs next", type: "text"}], streamStatus: "compacting"});
    expect(html).toContain('aria-label="Queue message"');
    expect(html).not.toMatch(/aria-label="Queue message"[^>]*disabled/);
    expect(html).toMatch(/aria-label="Steer now"[^>]*disabled/);
  });
});
