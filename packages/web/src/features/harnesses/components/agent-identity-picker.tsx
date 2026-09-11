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

/** One ring for every role; the color is the whole identity. */
export default function AgentIdentityPicker(props: AgentIdentityPickerProps) {
  const {name, color, kind, onChange} = props;

  return (
    <SettingsRow description="The ring color identifies this role in the sidebar, the workflow graph and every chat." title="Ring color">
      <div className="flex flex-wrap gap-2">
        {["#ffffff", ...agentColors].map((choice) => (
          <Button
            key={choice}
            aria-label={`${kind === "lead" ? "Lead" : "Agent"} color ${choice}`}
            aria-pressed={agentColor(name, color) === choice}
            onClick={() => onChange(choice)}
            className={cn(
              "rounded-full border border-transparent p-1 outline-none hover:border-border focus-visible:ring-1 focus-visible:ring-ink-faint",
              agentColor(name, color) === choice && "border-ink-faint"
            )}
          >
            <AgentMark name={name} kind={kind} color={choice} className="size-9" />
          </Button>
        ))}
      </div>
    </SettingsRow>
  );
}
