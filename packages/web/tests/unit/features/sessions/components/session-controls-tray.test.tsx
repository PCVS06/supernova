import type {MouseEvent} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {beforeEach, describe, expect, it, vi} from "vitest";
import type {ButtonProps} from "@/components/ui/button";
import SessionControlsTray from "@/features/sessions/components/composer/session-controls-tray";
import type {SessionControlsAction, SessionControlsState} from "@/features/sessions/hooks/api/use-session-controls";

const buttons = vi.hoisted(() => new Map<string, ButtonProps>());
vi.mock("@/components/ui/button", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/components/ui/button")>();
  return {
    ...original,
    default: (props: ButtonProps) => {
      const label = props["aria-label"] ?? (typeof props.children === "string" ? props.children : "");
      if (label) buttons.set(label, props);
      return <original.default {...props} />;
    },
  };
});

const modelReference = {providerId: "fake", id: "test-model"};
const base: SessionControlsState = {
  sessionId: "chat",
  revision: 3,
  queuePaused: true,
  goal: {
    id: "goal",
    objective: "Read all evidence\nThen verify every finding",
    status: "active",
    turnsUsed: 2,
    maxTurns: 10,
    modelReference,
    createdAt: "2026-09-12",
    updatedAt: "2026-09-12",
  },
  queue: [{id: "next", contentParts: [{type: "text", text: "Use the complete pending message\nIncluding this second line"}], modelReference, createdAt: "2026-09-12"}],
};

describe("authoritative goal and queue tray", () => {
  beforeEach(() => buttons.clear());

  it.each([
    {label: "Pause", action: {type: "pause_goal"}},
    {label: "Clear goal", action: {type: "clear_goal"}},
    {label: "Mark complete", action: {type: "complete_goal"}},
    {label: "Resume queue", action: {type: "resume_queue"}},
    {label: "Steer now", action: {type: "steer_queued", id: "next"}},
    {label: "Remove queued message 1", action: {type: "remove_queued", id: "next"}},
  ] satisfies Array<{label: string; action: SessionControlsAction}>)("$label dispatches its explicit server action", ({label, action}) => {
    const onAction = vi.fn(async () => true);
    const html = renderToStaticMarkup(<SessionControlsTray state={base} pending={false} working onAction={onAction} onRefresh={vi.fn()} />);
    const button = buttons.get(label)!;
    expect(button.disabled).toBeFalsy();
    button.onClick?.({} as MouseEvent<HTMLButtonElement>);
    expect(onAction).toHaveBeenCalledExactlyOnceWith(action);
    // No optimistic removal: complete text remains inspectable until the server changes state.
    expect(html).toContain("Including this second line");
    expect(html).toContain("Then verify every finding");
    expect(html).toContain("<details");
    expect(html).toContain("2 of 10 passes");
  });

  it.each([
    {status: "paused", used: 2, resumes: true, label: "Paused goal"},
    {status: "blocked", used: 2, resumes: true, label: "Goal needs attention"},
    {status: "blocked", used: 10, resumes: false, label: "Goal needs attention"},
    {status: "completed", used: 2, resumes: false, label: "Completed goal"},
  ] as const)("$status goal with $used passes has valid continuation controls", ({status, used, resumes, label}) => {
    const onAction = vi.fn(async () => true);
    const html = renderToStaticMarkup(
      <SessionControlsTray state={{...base, goal: {...base.goal!, status, turnsUsed: used}}} pending={false} working={false} onAction={onAction} onRefresh={vi.fn()} />
    );
    expect(html).toContain(label);
    expect(buttons.has("Resume")).toBe(resumes);
    if (resumes) {
      buttons.get("Resume")!.onClick?.({} as MouseEvent<HTMLButtonElement>);
      expect(onAction).toHaveBeenCalledWith({type: "resume_goal"});
    }
    expect(buttons.has("Mark complete")).toBe(status !== "completed");
  });

  it.each(["uncertain", "storage", "pending"])("prevents unsafe replay during %s", (problem) => {
    const state: SessionControlsState = {
      ...base,
      error: problem === "storage" ? "Unable to persist controls" : undefined,
      queue: base.queue.map((message) => ({...message, deliveryStatus: problem === "uncertain" ? "uncertain" : undefined})),
    };
    const html = renderToStaticMarkup(<SessionControlsTray state={state} pending={problem === "pending"} working onAction={vi.fn()} onRefresh={vi.fn()} />);
    expect(buttons.get("Steer now")!.disabled).toBe(true);
    expect(buttons.get("Resume queue")!.disabled).toBe(true);
    expect(buttons.get("Remove queued message 1")!.disabled).toBe(problem !== "uncertain");
    if (problem === "uncertain") expect(html).toContain("Inspect the chat");
    if (problem === "storage") expect(html).toContain("restart the server");
  });
});
