export interface ProjectListProject {
  harnessId?: string;
  harnessProjectId?: string;
  isCoordinator?: boolean;
  parentProjectId?: string;
  color?: string;
  order?: number;
  id: string;
  name: string;
  path: string;
  pinned: boolean;
  pinnedSessionIds: string[];
}
