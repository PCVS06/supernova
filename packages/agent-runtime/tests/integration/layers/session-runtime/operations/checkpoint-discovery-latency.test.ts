import * as fs from "node:fs/promises";
import {afterEach, expect, it, vi} from "vitest";
import {discoverRepositories} from "@supernova/agent-runtime/layers/session-runtime/internal/shadow-repository";

vi.mock("node:fs/promises", async (original) => ({...(await original<typeof fs>()), readdir: vi.fn()}));
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

it("bounds checkpoint discovery even if cloud filesystem metadata never returns", async () => {
  vi.useFakeTimers();
  vi.mocked(fs.readdir).mockReturnValue(new Promise(() => {}));
  const result = expect(discoverRepositories("/cloud-project", "/unused-shadow-storage")).rejects.toThrow("discovery timed out");
  await vi.advanceTimersByTimeAsync(1501);
  await result;
});
