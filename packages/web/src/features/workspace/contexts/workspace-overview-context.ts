import {createContext} from "react";
import type {useWorkspaceOverviewQuery} from "@/features/workspace/hooks/use-workspace-overview";

/** Shared overview subscription owned by the application shell. */
export const WorkspaceOverviewContext = createContext<ReturnType<typeof useWorkspaceOverviewQuery> | null>(null);
