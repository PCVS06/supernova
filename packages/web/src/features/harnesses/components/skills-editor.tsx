import Button from "@/components/ui/button";
import Switch from "@/components/ui/switch";
import {SettingsNote, SettingsRow} from "@/features/settings/components/settings-group";
import {useHarnessSkills} from "@/features/harnesses/hooks/api/use-harnesses";

interface SkillsEditorProps {
  harnessId: string;
  value?: readonly string[];
  inherited?: readonly string[];
  onChange: (value: readonly string[] | undefined) => void;
}

/** Selects named skills from the actual runtime catalogue. Undefined means inherit; [] means none. Renders rows for a settings card. */
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
      {skills.isPending && <SettingsNote>Loading connected skills…</SettingsNote>}
      {skills.isError && (
        <SettingsNote role="alert" tone="danger">
          Could not load the connected skill catalogue.
        </SettingsNote>
      )}
      {skills.isSuccess && available.length === 0 && <SettingsNote>No skills are enabled at the parent level.</SettingsNote>}
      {available.map((skill) => (
        <div className="flex items-start justify-between gap-5 px-4 py-3" key={skill.name}>
          <div className="min-w-0">
            <p className="break-words text-sm font-medium text-ink-strong">{skill.name}</p>
            <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-ink-muted" title={skill.description}>
              {skill.description}
            </p>
          </div>
          <Switch
            aria-label={`Enable ${skill.name}`}
            checked={selected.includes(skill.name)}
            onCheckedChange={(checked) => onChange(checked ? [...selected, skill.name] : selected.filter((name) => name !== skill.name))}
          />
        </div>
      ))}
    </>
  );
}
