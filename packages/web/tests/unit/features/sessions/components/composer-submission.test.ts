import type {UserMessageAttachmentPart, UserMessageContentPart} from "@supernova/contracts/sessions/schemas";
import {describe, expect, it, vi} from "vitest";
import {submitComposerDraft} from "@/features/sessions/components/composer/composer-submission";
import {goalCommandObjective} from "@/features/sessions/components/composer/goal-command";

const attachment: UserMessageAttachmentPart = {type: "attachment", id: "file-1", name: "notes.md", kind: "text", mime: "text/markdown", size: 4, contentBase64: "dGVzdA=="};
const parts: readonly UserMessageContentPart[] = [{type: "text", text: "Review this"}, attachment];

describe("acknowledged composer delivery", () => {
  it.each([
    {name: "normal send", accepted: true, includeAttachments: true, cleared: true, removed: true},
    {name: "queued send", accepted: true, includeAttachments: true, cleared: true, removed: true},
    {name: "steering", accepted: true, includeAttachments: false, cleared: true, removed: false},
    {name: "goal creation", accepted: true, includeAttachments: false, cleared: true, removed: false},
    {name: "rejected send", accepted: false, includeAttachments: true, cleared: false, removed: false},
    {name: "rejected steering", accepted: false, includeAttachments: false, cleared: false, removed: false},
  ])("retains the correct draft parts for $name", async ({accepted, includeAttachments, cleared, removed}) => {
    const clearEditable = vi.fn();
    const removeAttachment = vi.fn();
    const result = await submitComposerDraft({
      contentParts: parts,
      send: async () => accepted,
      readCurrentContent: () => parts,
      clearEditable,
      removeAttachment,
      includeAttachments,
    });
    expect(result).toBe(accepted);
    expect(clearEditable).toHaveBeenCalledTimes(cleared ? 1 : 0);
    expect(removeAttachment.mock.calls).toEqual(removed ? [["file-1"]] : []);
  });

  it("waits for acknowledgement and never clears newer typing or newly attached files", async () => {
    let acknowledge: (accepted: boolean) => void = () => {
      throw new Error("Acknowledgement was not initialized");
    };
    const acknowledgement = new Promise<boolean>((resolve) => {
      acknowledge = resolve;
    });
    let current = parts;
    const clearEditable = vi.fn();
    const removeAttachment = vi.fn();
    const delivery = submitComposerDraft({
      contentParts: parts,
      send: () => acknowledgement,
      readCurrentContent: () => current,
      clearEditable,
      removeAttachment,
      includeAttachments: true,
    });
    expect(clearEditable).not.toHaveBeenCalled();
    expect(removeAttachment).not.toHaveBeenCalled();
    current = [{type: "text", text: "A newer draft"}, attachment, {...attachment, id: "file-2"}];
    acknowledge(true);
    expect(await delivery).toBe(true);
    expect(clearEditable).not.toHaveBeenCalled();
    expect(removeAttachment.mock.calls).toEqual([["file-1"]]);
  });

  it("keeps all content when the request throws", async () => {
    const clearEditable = vi.fn();
    const removeAttachment = vi.fn();
    await expect(
      submitComposerDraft({
        contentParts: parts,
        send: async () => {
          throw new Error("Connection lost");
        },
        readCurrentContent: () => parts,
        clearEditable,
        removeAttachment,
        includeAttachments: true,
      })
    ).rejects.toThrow("Connection lost");
    expect(clearEditable).not.toHaveBeenCalled();
    expect(removeAttachment).not.toHaveBeenCalled();
  });
});

describe("client goal command", () => {
  it.each([
    ["/goal", ""],
    [" /goal  ", ""],
    ["/goal Fix parser", "Fix parser"],
    ["/goal\nRun tests\nVerify output", "Run tests\nVerify output"],
    ["/goals", null],
    ["Explain /goal", null],
    ["`/goal test`", null],
    ["/goalkeeper", null],
  ])("parses %s without consuming ordinary text", (input, expected) => expect(goalCommandObjective(input!)).toBe(expected));
});
