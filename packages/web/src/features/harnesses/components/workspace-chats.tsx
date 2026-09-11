import {Link} from "@tanstack/react-router";
import type {HarnessConfig, HarnessProject} from "@supernova/contracts/harnesses/schemas";
import AgentMark from "@/features/harnesses/components/agent-mark";
import {agentLabel} from "@/features/harnesses/lib/agent-identity";
import {useListProjectSessions} from "@/features/projects/hooks/api/use-list-project-sessions";
import {useProjectList} from "@/features/projects/hooks/use-project-list";
import ChatRunList from "@/features/harnesses/components/chat-run-list";
import SessionTitleText from "@/features/sessions/components/session-title-text";

/** A project opens to its conversations; agent definitions are deliberately absent. */
export default function WorkspaceChats({harness, project, projects}: {harness: HarnessConfig; project?: HarnessProject; projects: readonly HarnessProject[]}) {
  const head = projects.find((item) => item.id === harness.coordinatorProjectId);
  const owner = project ?? head;
  const sessions = useListProjectSessions({projectPath: owner?.path ?? ""});
  const local = useProjectList().find((item) => item.harnessProjectId === owner?.id);
  const isHead = owner?.id === head?.id;
  const labs = projects.filter((item) => item.id !== head?.id).toSorted((a, b) => (a.order ?? 0) - (b.order ?? 0));
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-medium">{owner ? agentLabel(owner.name) : harness.name}</h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-muted">
            {isHead
              ? "Talk to your Science Space lead here to coordinate work across labs. Each lab keeps its own chats and project instructions."
              : "Talk to this project's lead in a chat. When it delegates, the workers appear beneath that chat—not in a separate team folder."}
          </p>
        </div>
        {local && (
          <Link className="rounded-lg border border-border bg-surface-control px-4 py-2 text-sm" to="/session/new" search={{projectId: local.id}}>
            + New chat
          </Link>
        )}
      </div>
      {owner && (
        <section aria-label="Project chats">
          <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-ink-muted">Chats</h3>
          {sessions.isPending && <p className="text-sm text-ink-muted">Loading chats…</p>}
          {sessions.error && (
            <p role="alert" className="text-sm text-danger-ink">
              Could not load chats. Try opening the lab again.
            </p>
          )}
          {sessions.data?.sessions.length === 0 && (
            <div className="rounded-xl border border-dashed border-border p-6 text-sm text-ink-muted">
              No chats yet. Start one above. Your project lead can bring in specialists when needed.
            </div>
          )}
          <ul className="divide-y divide-border">
            {sessions.data?.sessions
              .toSorted((a, b) => b.updatedAt.localeCompare(a.updatedAt))
              .map((chat) => (
                <li key={chat.id} className="py-3">
                  <Link to="/session/$sessionId" params={{sessionId: chat.id}} className="flex items-center gap-3 rounded-lg p-2 hover:bg-overlay-hover">
                    <AgentMark name={owner.id} color={owner.color ?? (isHead ? "#ffffff" : undefined)} kind="lead" className="size-8 shrink-0" />
                    <div className="min-w-0">
                      <SessionTitleText title={chat.title} className="block truncate text-sm" />
                      <span className="text-xs text-ink-muted">Project lead · {new Date(chat.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </Link>
                  <ChatRunList sessionId={chat.id} />
                </li>
              ))}
          </ul>
        </section>
      )}
      {!project && labs.length > 0 && (
        <section>
          <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-ink-muted">{head ? "Labs · separate projects" : "Projects"}</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {labs.map((lab) => (
              <Link
                key={lab.id}
                className="flex min-w-0 items-center gap-3 rounded-lg border border-border p-3 hover:bg-overlay-hover"
                to="/harness/$harnessId"
                params={{harnessId: harness.id}}
                search={{projectId: lab.id, section: "Chats"}}
              >
                <AgentMark name={lab.id} color={lab.color} kind="lead" className="size-8 shrink-0" />
                <span className="text-sm">{agentLabel(lab.name)}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
