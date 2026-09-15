import type {ReactNode} from "react";
import {WorkspaceOverviewContext} from "@/features/workspace/contexts/workspace-overview-context";
import {useWorkspaceOverviewQuery} from "@/features/workspace/hooks/use-workspace-overview";

/** One refresh loop for navigation and maps, paused by React Query when the app is hidden. */
export default function WorkspaceOverviewProvider(props: {children: ReactNode}) {
  const value = useWorkspaceOverviewQuery();
  return <WorkspaceOverviewContext value={value}>{props.children}</WorkspaceOverviewContext>;
}
