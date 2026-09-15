import type {CurationRequest} from "@supernova/contracts/harnesses/schemas";
import {SettingsGroup} from "@/features/settings/components/settings-group";
import ConfigCard from "@/features/harnesses/components/config-card";
import {agentLabel} from "@/features/harnesses/lib/agent-identity";
import {relativeTime} from "@/features/harnesses/lib/curation-format";

const requestLimit = 10;

interface CuratorRequestsProps {
  requests: readonly CurationRequest[];
}

/** What chats filed for the curator: a decision the plan should record, or a problem seen more than once. */
export default function CuratorRequests(props: CuratorRequestsProps) {
  const {requests} = props;
  const recent = requests.toSorted((a, b) => b.at.localeCompare(a.at)).slice(0, requestLimit);

  return (
    <SettingsGroup title="Requests">
      <div className="space-y-2 px-3 sm:px-4">
        {recent.map((request) => (
          <p className="truncate text-xs text-ink-muted" key={request.id} title={request.text}>
            {[relativeTime(request.at), request.kind === "decision" ? "Decision" : "Problem", request.agentName && agentLabel(request.agentName), request.text]
              .filter(Boolean)
              .join(" · ")}
          </p>
        ))}
        {!recent.length && <ConfigCard className="text-sm text-ink-muted">No requests from chats yet.</ConfigCard>}
      </div>
    </SettingsGroup>
  );
}
