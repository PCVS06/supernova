import {renderToStaticMarkup} from "react-dom/server";
import {describe, expect, it, vi} from "vitest";
import ComposerSendAction from "@/features/sessions/components/composer/composer-send-action";

vi.mock("@/components/ui/icon", () => ({
  default: ({name}: {readonly name: string}) => <span data-icon={name} />,
}));

describe("composer send action", () => {
  it("uses the same clear send arrow when starting a goal", () => {
    const html = renderToStaticMarkup(
      <ComposerSendAction
        canInterrupt={false}
        canSend
        canSteer={false}
        dictating={false}
        dictationSupported
        onInterrupt={vi.fn()}
        onSend={vi.fn()}
        onSteer={vi.fn()}
        onToggleDictation={vi.fn()}
        sendLabel="Start goal"
        streamStatus="idle"
      />
    );

    expect(html).toContain('aria-label="Start goal"');
    expect(html).toContain('data-icon="send"');
    expect(html).not.toContain('data-icon="gauge"');
  });
});
