import {describe, expect, it} from "vitest";
import type {HarnessProject} from "@supernova/contracts/harnesses/schemas";
import {createDefaultHarness, resolveHarnessProject} from "@supernova/agent-runtime/layers/harnesses/lib/harness-config";

function project(overrides: Partial<HarnessProject> = {}): HarnessProject {
  return {id: "lab", harnessId: "coding", name: "Lab", path: "/tmp/lab", systemPrompt: "", contextInstructions: "", agents: [], ...overrides};
}

describe("project planning document configuration", () => {
  it("accepts up to twelve project-relative Markdown documents", () => {
    const planningDocuments = Array.from({length: 12}, (_, index) => `docs/plan-${index}.md`);

    expect(() => resolveHarnessProject(createDefaultHarness(), project({planningDocuments}), 1)).not.toThrow();
    expect(() => resolveHarnessProject(createDefaultHarness(), project({planningDocuments: [...planningDocuments, "docs/roadmap.markdown"]}), 1)).toThrow("at most 12");
  });

  it("rejects documents that are not relative Markdown files", () => {
    for (const file of ["../outside.md", "docs/../../outside.md", "/etc/plan.md", "notes.txt", "plans"]) {
      expect(() => resolveHarnessProject(createDefaultHarness(), project({planningDocuments: [file]}), 1)).toThrow("project-relative Markdown");
    }
  });
});
