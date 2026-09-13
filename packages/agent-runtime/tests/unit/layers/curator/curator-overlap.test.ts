import {describe, expect, it} from "vitest";
import type {HarnessConfig, HarnessProject} from "@supernova/contracts/harnesses/schemas";
import {roleOverlaps, roleSentences} from "@supernova/agent-runtime/layers/curator/lib/curator-overlap";
import {createDefaultHarness} from "@supernova/agent-runtime/layers/harnesses/lib/harness-config";

const shared = [
  "Cite every claim with the identifier of the run it came from.",
  "Never answer from memory when the ledger holds the record.",
  "Write the result as JSON with a result field and nothing else.",
];

function agent(name: string, sentences: readonly string[]) {
  return {name, description: name, systemPrompt: sentences.join("\n"), tools: []};
}

function harness(agents: readonly {name: string; description: string; systemPrompt: string; tools: string[]}[]): HarnessConfig {
  return {...createDefaultHarness(), agents: [...agents]};
}

function project(agents: readonly {name: string; description: string; systemPrompt: string; tools: string[]}[]): HarnessProject {
  return {
    id: "project-a",
    harnessId: "coding",
    name: "Project A",
    path: "/tmp/project-a",
    systemPrompt: "",
    contextInstructions: "",
    agents: [...agents],
  };
}

describe("curator role overlap", () => {
  it("keeps only sentences long enough to carry an instruction", () => {
    expect(roleSentences("Be brief.\nCite every claim with the identifier of the run it came from.")).toEqual(["cite every claim with the identifier of the run it came from."]);
    // Spacing and capitalisation are not differences between two copies of the same sentence.
    expect(roleSentences("Cite   EVERY  claim with the identifier of the run it came from.")).toEqual(["cite every claim with the identifier of the run it came from."]);
  });

  it("reports a pair that shares three sentences and passes over one that shares two", () => {
    const overlaps = roleOverlaps(
      harness([
        agent("reviewer", [...shared, "Reject a claim whose evidence does not resolve to a run."]),
        agent("scout", [...shared, "Search the literature before you propose an experiment."]),
        agent("planner", [...shared.slice(0, 2), "Break the goal into steps that one specialist can finish."]),
      ]),
      []
    );

    expect(overlaps).toEqual([{agents: ["reviewer", "scout"], shared: 3, sample: shared[0]!.toLowerCase()}]);
  });

  it("compares a project's role override under its own name", () => {
    const overlaps = roleOverlaps(harness([agent("reviewer", shared)]), [project([agent("reviewer", [...shared, "Also check the units."])])]);

    expect(overlaps.map((overlap) => overlap.agents)).toEqual([["reviewer", "reviewer@project-a"]]);
    expect(overlaps[0]?.shared).toBe(3);
  });

  it("cuts the sample at a hundred and sixty characters", () => {
    const long = `${"Cite every claim with the identifier of the run it came from, and say which instruction layer the rule you followed came from".repeat(2)}.`;
    const overlaps = roleOverlaps(harness([agent("reviewer", [long, ...shared]), agent("scout", [long, ...shared])]), []);

    expect(overlaps[0]?.sample).toHaveLength(160);
  });
});
