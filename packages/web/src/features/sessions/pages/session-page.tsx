import type {AppEnvironment} from "@/lib/app-environment";
import SessionConversation from "@/features/sessions/components/session-conversation";
import SessionLoading from "@/features/sessions/components/session-loading";
import {useSession} from "@/features/sessions/hooks/api/use-session";
import {useOpenSession} from "@/features/sessions/hooks/use-open-session";

interface SessionPageProps {
  readonly appEnvironment: AppEnvironment;
  readonly sessionId: string;
}

/** Routes one chat into the conversation surface. The route remounts this page per chat. */
export default function SessionPage(props: SessionPageProps) {
  const {appEnvironment, sessionId} = props;
  const {data: session, error} = useSession(sessionId);

  useOpenSession(sessionId);

  if (!session) {
    if (error) {
      return (
        <div className="grid flex-1 place-items-center px-6 py-10">
          <p className="text-sm text-danger-ink">Unable to load this session.</p>
        </div>
      );
    }

    return <SessionLoading appEnvironment={appEnvironment} sessionId={sessionId} />;
  }

  return <SessionConversation appEnvironment={appEnvironment} session={session} />;
}
