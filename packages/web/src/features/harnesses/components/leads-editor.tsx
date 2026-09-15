import type {HarnessConfig, HarnessProject} from "@supernova/contracts/harnesses/schemas";
import SettingsPageShell from "@/features/settings/components/settings-page-shell";
import {SettingsGroup, SettingsRow} from "@/features/settings/components/settings-group";
import ExecutionEditor from "@/features/harnesses/components/execution-editor";
import ProjectOverridesEditor from "@/features/harnesses/components/project-overrides-editor";
import PromptEditor from "@/features/harnesses/components/prompt-editor";
import SkillsEditor from "@/features/harnesses/components/skills-editor";

interface LeadsEditorProps {
  harness: HarnessConfig;
  project: HarnessProject;
  onChangeProject: (change: Partial<HarnessProject>) => void;
  onOpenSpecialists: () => void;
}

/** The lead of one project: how its main chat agent runs, what it may use, and which specialists it redefines. */
export default function LeadsEditor(props: LeadsEditorProps) {
  const {harness, project, onChangeProject, onOpenSpecialists} = props;

  return (
    <SettingsPageShell testId="project-detail-scroll">
      <SettingsGroup title="Execution">
        <ExecutionEditor value={project.execution} inherited={harness.execution} inheritLabel="Use default model" onChange={(execution) => onChangeProject({execution})} />
      </SettingsGroup>
      <SettingsGroup title="Lead role">
        <SettingsRow description="Only this project's main chat agent reads this." title="Lead role prompt">
          <PromptEditor label="Lead role prompt" value={project.orchestratorPrompt ?? ""} onChange={(value) => onChangeProject({orchestratorPrompt: value || undefined})} />
        </SettingsRow>
      </SettingsGroup>
      <SettingsGroup title="Skills">
        <SkillsEditor harnessId={harness.id} value={project.enabledSkills} inherited={harness.enabledSkills} onChange={(enabledSkills) => onChangeProject({enabledSkills})} />
      </SettingsGroup>
      <ProjectOverridesEditor harness={harness} overrides={project.agents} onChange={(agents) => onChangeProject({agents})} onOpenSpecialists={onOpenSpecialists} />
    </SettingsPageShell>
  );
}
