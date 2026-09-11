import {readFile} from "node:fs/promises";
import type {PromptTemplate, Skill} from "@earendil-works/pi-coding-agent";
import {Context, Effect, Layer} from "effect";
import {PiSdkService} from "@supernova/agent-runtime/layers/pi-sdk";
import {harnessStore} from "@supernova/agent-runtime/layers/harnesses/internal/harness-store";

export interface PiResourceCatalogShape {
  readonly listPromptTemplates: (projectPath: string) => Promise<readonly PromptTemplate[]>;
  readonly listSkills: (projectPath: string) => Promise<readonly Skill[]>;
  readonly readSkillContent: (skill: Skill) => Promise<string>;
}

/** Private capability for loading Pi skills and prompt templates. */
export class PiResourceCatalog extends Context.Service<PiResourceCatalog, PiResourceCatalogShape>()("supernova/agent-runtime/PiResourceCatalog") {}

export const PiResourceCatalogLive = Layer.effect(
  PiResourceCatalog,
  Effect.gen(function* () {
    const piSdk = yield* PiSdkService;

    return {
      listPromptTemplates: async (projectPath) => {
        if ((await harnessStore.list()).projects.some((project) => project.path === projectPath)) return [];
        const resourceLoader = piSdk.createResourceLoader({projectPath});
        await resourceLoader.reload();
        return resourceLoader.getPrompts().prompts;
      },
      listSkills: async (projectPath) => {
        const library = await harnessStore.list();
        const project = library.projects.find((item) => item.path === projectPath);
        if (project) {
          const harness = library.harnesses.find((item) => item.id === project.harnessId)!;
          const enabled = project.enabledSkills ?? harness.enabledSkills;
          return (await harnessStore.listSkills(harness.id)).filter((skill) => !enabled || enabled.includes(skill.name));
        }
        const resourceLoader = piSdk.createResourceLoader({projectPath});
        await resourceLoader.reload();
        return resourceLoader.getSkills().skills;
      },
      readSkillContent: (skill) => readFile(skill.filePath, "utf8"),
    };
  })
);
