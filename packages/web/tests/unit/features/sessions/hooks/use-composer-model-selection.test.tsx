import {renderToStaticMarkup} from "react-dom/server";
import {describe, expect, it, vi} from "vitest";
import type {ModelDetails, ModelReference} from "@supernova/contracts/sessions/schemas";
import {useComposerModelSelection} from "@/features/sessions/hooks/use-composer-model-selection";

const {models, stored} = vi.hoisted(() => ({models: [] as ModelDetails[], stored: {} as Record<string, ModelReference>}));
vi.mock("@/features/sessions/hooks/api/use-session-models", () => ({useSessionModels: () => ({data: models, isPending: false})}));
vi.mock("@/features/sessions/stores/model-picker-store", () => ({
  useModelPickerStore: (select: (state: unknown) => unknown) =>
    select({recentModelKeys: ["test|recent"], lastThinkingLevel: "high", recordRecentModel: vi.fn(), recordRecentThinkingLevel: vi.fn()}),
}));
vi.mock("@/features/sessions/stores/session-models-store", () => ({
  useSessionModelsStore: (select: (state: unknown) => unknown) => select({models: stored, setSessionModel: vi.fn()}),
}));

function Probe(props: {initialSelection?: ModelReference; initialThinkingLevel?: string; sessionId?: string}) {
  const selection = useComposerModelSelection(props);
  return (
    <span>
      {selection.modelReference?.id}:{selection.modelReference?.thinkingLevel}
    </span>
  );
}

describe("composer harness defaults", () => {
  models.push(
    ...["recent", "project"].map((id) => ({
      id,
      providerId: "test",
      name: id,
      providerName: "Test",
      capabilities: {images: false, reasoning: true},
      thinkingLevels: [
        {value: "low", label: "Low"},
        {value: "high", label: "High"},
      ],
    }))
  );

  it("uses the configured project model and effort ahead of the recently used model", () => {
    expect(renderToStaticMarkup(<Probe initialSelection={{id: "project", providerId: "test", thinkingLevel: "low"}} />)).toBe("<span>project:low</span>");
  });

  it("can inherit a recent model while applying the configured effort", () => {
    expect(renderToStaticMarkup(<Probe initialThinkingLevel="low" />)).toBe("<span>recent:low</span>");
  });

  it("keeps an existing chat's explicit selection ahead of changed defaults", () => {
    stored.chat = {id: "recent", providerId: "test", thinkingLevel: "high"};
    expect(renderToStaticMarkup(<Probe sessionId="chat" initialSelection={{id: "project", providerId: "test", thinkingLevel: "low"}} />)).toBe("<span>recent:high</span>");
  });
});
