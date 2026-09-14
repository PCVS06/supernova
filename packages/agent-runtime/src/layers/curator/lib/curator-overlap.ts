import type {HarnessConfig, HarnessProject} from "@supernova/contracts/harnesses/schemas";

/** Shorter than this a sentence is a heading or a fragment, and two roles sharing it says nothing. */
const minSentenceChars = 40;
/** Fewer than this is a house style; this many is one role written twice. */
const minSharedSentences = 3;
const maxSampleChars = 160;

export interface RoleOverlap {
  /** The two role prompts, named as read_instructions names them: the agent, and the project when it is an override. */
  readonly agents: readonly [string, string];
  readonly shared: number;
  readonly sample: string;
}

/** A role prompt as comparable sentences: lowercase, whitespace squashed, and long enough to carry an instruction. */
export function roleSentences(prompt: string): string[] {
  return prompt
    .split(/(?<=[.!?])\s+|\n+/)
    .map((sentence) => sentence.toLowerCase().replace(/\s+/g, " ").trim())
    .filter((sentence) => sentence.length >= minSentenceChars);
}

/**
 * Pairs of roles whose prompts repeat each other, which is the shape "split this role" or "merge these two" takes.
 *
 * Sentences rather than words, because two roles that share vocabulary are doing related work, while two roles that
 * share whole sentences were written by copying one into the other.
 */
export function roleOverlaps(harness: HarnessConfig, projects: readonly HarnessProject[]): RoleOverlap[] {
  const roles = new Map<string, string[]>();
  for (const agent of harness.agents) roles.set(agent.name, roleSentences(agent.systemPrompt));
  for (const project of projects) for (const agent of project.agents) roles.set(`${agent.name}@${project.id}`, roleSentences(agent.systemPrompt));
  const names = [...roles.keys()];
  const overlaps: RoleOverlap[] = [];
  for (let left = 0; left < names.length; left += 1) {
    for (let right = left + 1; right < names.length; right += 1) {
      const first = roles.get(names[left]!)!;
      const second = new Set(roles.get(names[right]!)!);
      const shared = [...new Set(first.filter((sentence) => second.has(sentence)))];
      if (shared.length < minSharedSentences) continue;
      overlaps.push({agents: [names[left]!, names[right]!], shared: shared.length, sample: shared[0]!.slice(0, maxSampleChars)});
    }
  }
  return overlaps.sort((left, right) => right.shared - left.shared);
}
