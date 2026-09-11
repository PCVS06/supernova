import {mkdtemp, readFile, rm, stat, writeFile, unlink} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {afterEach, beforeEach, describe, expect, it} from "vitest";
import {ToolCredentialStore} from "@supernova/agent-runtime/layers/harnesses/internal/tool-credentials";

describe("tool credential persistence", () => {
  let root: string;
  let environment: NodeJS.ProcessEnv;
  let store: ToolCredentialStore;
  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "pi-plus-credential-test-"));
    environment = {SCOPUS_API_KEY: "original-test-value"};
    store = new ToolCredentialStore(root, environment);
  });
  afterEach(async () => {
    await rm(root, {recursive: true, force: true});
  });
  it("encrypts credentials separately and returns metadata only", async () => {
    const result = await store.save("SCOPUS_API_KEY", "synthetic-private-value");
    expect(JSON.stringify(result)).not.toContain("synthetic-private-value");
    expect(await readFile(join(root, "tools.enc"), "utf8")).not.toContain("synthetic-private-value");
    expect((await stat(join(root, "tools.enc"))).mode & 0o777).toBe(0o600);
    expect((await stat(join(root, "tools.key"))).mode & 0o777).toBe(0o600);
    const nextEnvironment: NodeJS.ProcessEnv = {};
    await new ToolCredentialStore(root, nextEnvironment).loadIntoRuntime();
    expect(nextEnvironment.SCOPUS_API_KEY).toBe("synthetic-private-value");
    expect(environment.SCOPUS_API_KEY).toBe("synthetic-private-value");
  });
  it("removes only app overrides and restores an original environment credential", async () => {
    await store.save("SCOPUS_API_KEY", "replacement");
    const result = await store.save("SCOPUS_API_KEY", "");
    expect(environment.SCOPUS_API_KEY).toBe("original-test-value");
    expect(result.find((item) => item.id === "scopus")?.fields[0]?.source).toBe("environment");
    await store.save("WOS_API_KEY", "temporary");
    await store.save("WOS_API_KEY", "");
    expect(environment.WOS_API_KEY).toBeUndefined();
  });
  it("rejects arbitrary environment changes and malformed credentials", async () => {
    await expect(store.save("PATH", "bad")).rejects.toThrow("Invalid");
    await expect(store.save("SCOPUS_API_KEY", "line\nbreak")).rejects.toThrow("Invalid");
    expect(environment).toEqual({SCOPUS_API_KEY: "original-test-value"});
  });
  it("does not overwrite an unreadable store or one whose key was lost", async () => {
    await store.save("SCOPUS_API_KEY", "synthetic-secret");
    const encrypted = await readFile(join(root, "tools.enc"), "utf8");
    await unlink(join(root, "tools.key"));
    await expect(store.save("SCOPUS_API_KEY", "new")).rejects.toThrow("Could not save");
    expect(await readFile(join(root, "tools.enc"), "utf8")).toBe(encrypted);
    await writeFile(join(root, "tools.key"), Buffer.alloc(32));
    await expect(store.status()).rejects.toThrow("could not be opened");
  });
});
