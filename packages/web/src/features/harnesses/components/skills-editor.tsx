import {useHarnessSkills} from "@/features/harnesses/hooks/api/use-harnesses";
import Switch from "@/components/ui/switch";
import Button from "@/components/ui/button";

/** Selects named skills from the actual runtime catalogue. Undefined means inherit; [] means none. */
export default function SkillsEditor(props: {
  harnessId: string;
  value?: readonly string[];
  inherited?: readonly string[];
  onChange: (value: readonly string[] | undefined) => void;
}) {
  const {harnessId, value, inherited, onChange} = props;
  const skills = useHarnessSkills(harnessId);
  const available = skills.data?.filter((skill) => !inherited || inherited.includes(skill.name)) ?? [];
  const selected = value ?? available.map((skill) => skill.name);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 text-xs text-ink-muted">
        <span>{value === undefined ? "Inheriting available skills" : `${selected.length} selected`}</span>
        <Button className="text-ink" disabled={value === undefined} onClick={() => onChange(undefined)}>
          Reset to inherited
        </Button>
      </div>
      {skills.isPending && <p className="text-sm text-ink-muted">Loading connected skills…</p>}
      {skills.isError && <p className="text-sm text-danger-ink">Could not load the connected skill catalogue.</p>}
      {skills.isSuccess && available.length === 0 && <p className="rounded-lg border border-border p-4 text-sm text-ink-muted">No skills are enabled at the parent level.</p>}
      {available.map((skill) => (
        <div key={skill.name} className="flex items-start justify-between gap-5 rounded-xl border border-border bg-surface-raised p-4">
          <div>
            <p className="text-sm font-medium">{skill.name}</p>
            <p className="mt-1 text-xs leading-relaxed text-ink-muted">{skill.description}</p>
          </div>
          <Switch
            aria-label={`Enable ${skill.name}`}
            checked={selected.includes(skill.name)}
            onCheckedChange={(checked) => onChange(checked ? [...selected, skill.name] : selected.filter((name) => name !== skill.name))}
          />
        </div>
      ))}
    </div>
  );
}
