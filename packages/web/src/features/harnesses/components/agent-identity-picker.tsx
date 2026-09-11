import Button from "@/components/ui/button";
import AgentMark from "@/features/harnesses/components/agent-mark";
import {ConfigField} from "@/features/harnesses/components/config-fields";
import {agentColor, agentColors} from "@/features/harnesses/lib/agent-identity";
import {cn} from "@/lib/cn";

interface AgentIdentityPickerProps {
  name: string;
  color?: string;
  kind: "lead" | "specialist";
  onChange: (color: string) => void;
}

/** Identical palette geometry; a role's pi variant remains distinct. */
export default function AgentIdentityPicker(props: AgentIdentityPickerProps) {
  const {name, color, kind, onChange} = props;
  return (
    <ConfigField label="Identity">
      <div className="flex flex-wrap gap-2">
        {["#ffffff", ...agentColors].map((choice) => (
          <Button
            key={choice}
            aria-label={`${kind === "lead" ? "Lead" : "Agent"} color ${choice}`}
            aria-pressed={agentColor(name, color) === choice}
            onClick={() => onChange(choice)}
            className={cn(
              "rounded-full border border-transparent p-1 outline-none focus-visible:ring-1 focus-visible:ring-ink-faint",
              agentColor(name, color) === choice && "border-ink-faint"
            )}
          >
            <AgentMark name={name} kind={kind} color={choice} className="size-9" />
          </Button>
        ))}
      </div>
    </ConfigField>
  );
}
