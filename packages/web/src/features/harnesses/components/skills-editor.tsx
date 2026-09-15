import Button from "@/components/ui/button";
import Switch from "@/components/ui/switch";
import {SettingsRow} from "@/features/settings/components/settings-group";
import ConfigCard from "@/features/harnesses/components/config-card";
import {useHarnessSkills} from "@/features/harnesses/hooks/api/use-harnesses";

interface SkillsEditorProps {
  harnessId: string;
  value?: readonly string[];
  inherited?: readonly string[];
  onChange: (value: readonly string[] | undefined) => void;
}

/** Selects named skills from the actual runtime catalogue. Undefined means inherit; [] means none. */
export default function SkillsEditor(props: SkillsEditorProps) {
  const {harnessId, value, inherited, onChange} = props;
  const skills = useHarnessSkills(harnessId);
  const available = skills.data?.filter((skill) => !inherited || inherited.includes(skill.name)) ?? [];
  const selected = value ?? available.map((skill) => skill.name);

  return (
    <>
      <SettingsRow
        control={
          <Button className="rounded-lg border border-border px-3 py-2 text-xs text-ink-muted hover:text-ink" disabled={value === undefined} onClick={() => onChange(undefined)}>
            Reset to inherited
          </Button>
        }
        description={value === undefined ? "Inheriting every available skill." : `${selected.length} of ${available.length} skills enabled.`}
        title="Skill availability"
      />
      <div className="space-y-2 px-3 sm:px-4">
        {skills.isPending && <p className="text-sm text-ink-muted">Loading connected skills…</p>}
        {skills.isError && (
          <p className="text-sm text-danger-ink" role="alert">
            Could not load the connected skill catalogue.
          </p>
        )}
        {skills.isSuccess && available.length === 0 && <ConfigCard className="text-sm text-ink-muted">No skills are enabled at the parent level.</ConfigCard>}
        {available.map((skill) => (
          <ConfigCard className="flex items-start justify-between gap-5" key={skill.name}>
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink-strong">{skill.name}</p>
              <p className="mt-1 text-xs leading-relaxed text-ink-muted">{skill.description}</p>
            </div>
            <Switch
              aria-label={`Enable ${skill.name}`}
              checked={selected.includes(skill.name)}
              onCheckedChange={(checked) => onChange(checked ? [...selected, skill.name] : selected.filter((name) => name !== skill.name))}
            />
          </ConfigCard>
        ))}
      </div>
    </>
  );
}
