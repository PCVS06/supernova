import Button from "@/components/ui/button";
import {SettingsRow} from "@/features/settings/components/settings-group";
import AgentMark from "@/features/harnesses/components/agent-mark";
import type {AgentMarkKind} from "@/features/harnesses/components/agent-mark";
import {agentColor, agentColors} from "@/features/harnesses/lib/agent-identity";
import {cn} from "@/lib/cn";

interface AgentIdentityPickerProps {
  name: string;
  color?: string;
  kind: AgentMarkKind;
  onChange: (color: string) => void;
}

/** Retains editable role accents alongside the monochrome mathematical marks. */
export default function AgentIdentityPicker(props: AgentIdentityPickerProps) {
  const {name, color, kind, onChange} = props;

  return (
    <SettingsRow description="Stored with this role for color accents. Its mathematical identity mark stays white." title="Role color">
      <div className="flex flex-wrap gap-2">
        {["#ffffff", ...agentColors].map((choice) => (
          <Button
            key={choice}
            aria-label={`${kind === "lead" || kind === "orchestrator" ? "Lead" : "Agent"} color ${choice}`}
            aria-pressed={agentColor(name, color) === choice}
            onClick={() => onChange(choice)}
            className={cn(
              "rounded-full border border-transparent p-1 outline-none hover:border-border focus-visible:ring-1 focus-visible:ring-ink-faint",
              agentColor(name, color) === choice && "border-ink-faint"
            )}
          >
            <AgentMark name={name} kind={kind} color={choice} colorPreview className="size-9" />
          </Button>
        ))}
      </div>
    </SettingsRow>
  );
}
