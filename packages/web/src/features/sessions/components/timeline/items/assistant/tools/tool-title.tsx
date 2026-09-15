import type {ReactNode} from "react";
import Icon from "@/components/ui/icon";
import type {IconName} from "@/components/ui/icon";
import type {SessionWorkEvent} from "@/features/sessions/types/session-timeline-item";
import type {Tool} from "@supernova/contracts/sessions/schemas";
import {fileName, skillName} from "@/features/sessions/lib/timeline/tool-details";
import AgentMark from "@/features/harnesses/components/agent-mark";
import {agentLabel} from "@/features/harnesses/lib/agent-identity";
import {useHarnessLibrary} from "@/features/harnesses/hooks/api/use-harnesses";
import {useHarnessNavigationStore} from "@/features/harnesses/stores/harness-navigation-store";

type ToolEvent = Extract<SessionWorkEvent, {type: "tool"}>;
type FileMutationTool = Extract<Tool, {kind: "file-edit" | "file-write"}>;

interface FileEditDiffStats {
  readonly additions: number;
  readonly deletions: number;
}

function getFileEditDiffStats(patch: string): FileEditDiffStats {
  return patch.split("\n").reduce(
    (stats, line) => {
      if (line.startsWith("+++") || line.startsWith("---")) return stats;
      if (line.startsWith("+")) return {...stats, additions: stats.additions + 1};
      if (line.startsWith("-")) return {...stats, deletions: stats.deletions + 1};
      return stats;
    },
    {additions: 0, deletions: 0}
  );
}

function ToolTitleRow(props: {children: ReactNode; icon: IconName}) {
  const {children, icon} = props;

  return (
    <div className="flex min-w-0 items-center gap-2">
      <Icon name={icon} size="xs" />
      {children}
    </div>
  );
}

function DefaultToolTitle(props: {tool: Tool | undefined}) {
  const {tool} = props;

  return (
    <ToolTitleRow icon="folder">
      <span className="min-w-0 wrap-break-word">{tool?.status === "pending" ? "Running tool" : "Ran tool"}</span>
    </ToolTitleRow>
  );
}

function CommandToolTitle(props: {tool: Extract<Tool, {kind: "command"}>}) {
  const {tool} = props;

  return (
    <ToolTitleRow icon="server">
      <span className="min-w-0 wrap-break-word">{tool.status === "pending" ? "Running command" : "Ran command"}</span>
    </ToolTitleRow>
  );
}

function ReadToolTitle(props: {tool: Extract<Tool, {kind: "file-read"}>}) {
  const {tool} = props;

  const skill = tool.input ? skillName(tool.input.path) : undefined;
  if (skill !== undefined) {
    return (
      <ToolTitleRow icon="skill">
        <span className="min-w-0 wrap-break-word">
          {tool.status === "pending" ? "Loading" : "Loaded"} skill {skill}
        </span>
      </ToolTitleRow>
    );
  }

  const name = tool.input?.path ? ` ${fileName(tool.input.path)}` : "a file";

  return (
    <ToolTitleRow icon="folder">
      <span className="min-w-0 wrap-break-word">
        {tool.status === "pending" ? "Reading" : "Read"} {name}
      </span>
    </ToolTitleRow>
  );
}

function ListToolTitle(props: {tool: Extract<Tool, {kind: "file-list"}>}) {
  const {tool} = props;

  return (
    <ToolTitleRow icon="folder">
      <span className="min-w-0 wrap-break-word">{tool.status === "pending" ? "Listing files" : "Listed files"}</span>
    </ToolTitleRow>
  );
}

function FileMutationToolTitle(props: {tool: FileMutationTool}) {
  const {tool} = props;

  const verb = tool.kind === "file-edit" ? (tool.status === "pending" ? "Editing" : "Edited") : tool.status === "pending" ? "Writing" : "Wrote";
  const name = tool.input?.path ? ` ${fileName(tool.input.path)}` : " a file";

  const stats = tool?.status === "completed" ? getFileEditDiffStats(tool.result.patch) : undefined;

  return (
    <ToolTitleRow icon="folder">
      <span className="min-w-0 wrap-break-word">
        {verb} {name}
      </span>

      {stats && (
        <span className="flex shrink-0 items-center gap-1 font-mono text-xs leading-none">
          <span className="text-diff-added">+{stats.additions}</span>
          <span className="text-diff-removed">-{stats.deletions}</span>
        </span>
      )}
    </ToolTitleRow>
  );
}

function FindToolTitle(props: {tool: Extract<Tool, {kind: "file-find"}>}) {
  const {tool} = props;

  return (
    <ToolTitleRow icon="folder">
      <span className="min-w-0 wrap-break-word">{tool.status === "pending" ? "Exploring files" : "Explored files"}</span>
    </ToolTitleRow>
  );
}

function WebFetchToolTitle(props: {tool: Extract<Tool, {kind: "web-fetch"}>}) {
  const {tool} = props;

  return (
    <ToolTitleRow icon="globe">
      <span className="min-w-0 wrap-break-word">{tool.status === "pending" ? "Fetching an URL" : "Fetched an URL"}</span>
    </ToolTitleRow>
  );
}

function CustomToolTitle({tool}: {tool: Extract<Tool, {kind: "custom"}>}) {
  const library = useHarnessLibrary();
  const {activeHarnessId, activeProjectId} = useHarnessNavigationStore();
  const harness = library.data?.harnesses.find((item) => item.id === activeHarnessId);
  const project = library.data?.projects.find((item) => item.id === activeProjectId);
  const targetLab = library.data?.projects.find((item) => item.id === tool.input?.projectId);
  const tasks = tool.input?.chain ?? tool.input?.tasks;
  const workflowId = typeof tool.input?.workflowId === "string" ? tool.input.workflowId : undefined;
  const workflow = harness?.workflows?.find((item) => item.id === workflowId) ?? harness?.workflows?.[0];
  const names =
    tool.name === "lab_agent"
      ? [targetLab?.name ?? "Lab orchestrator"]
      : tool.name === "harness_workflow"
        ? (workflow?.steps.map((step) => step.agent) ?? harness?.graph.steps ?? [])
        : typeof tool.input?.agent === "string"
          ? [tool.input.agent]
          : Array.isArray(tasks)
            ? tasks.flatMap((task) => (task && typeof task === "object" && typeof task.agent === "string" ? [task.agent] : []))
            : [];
  const delegation = ["subagent", "harness_workflow", "lab_agent"].includes(tool.name ?? "");
  if (!delegation)
    return (
      <ToolTitleRow icon="server">
        <span className="min-w-0 wrap-break-word">
          {tool.status === "pending" ? "Running" : tool.status === "error" ? "Failed" : "Ran"} {tool.name ?? "tool"}
        </span>
      </ToolTitleRow>
    );
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
      <span className="text-xs">{tool.status === "pending" ? "Delegating" : tool.status === "error" ? "Delegation failed" : "Delegated"}</span>
      {names.map((name, index) => {
        const agent = project?.agents.find((item) => item.name === name) ?? harness?.agents.find((item) => item.name === name);
        return (
          <span className="flex min-w-0 items-center gap-1.5" key={name + index}>
            <AgentMark
              name={targetLab?.id ?? name}
              color={targetLab?.color ?? agent?.color}
              kind={tool.name === "lab_agent" ? "lead" : "specialist"}
              className="size-7"
              working={tool.status === "pending" && names.length === 1}
            />
            <span className="truncate">{agentLabel(name)}</span>
          </span>
        );
      })}
    </div>
  );
}

function ToolTitleContent(props: {event: ToolEvent}) {
  const {event} = props;

  switch (event.tool?.kind) {
    case "command":
      return <CommandToolTitle tool={event.tool} />;
    case "file-read":
      return <ReadToolTitle tool={event.tool} />;
    case "file-list":
      return <ListToolTitle tool={event.tool} />;
    case "file-edit":
    case "file-write":
      return <FileMutationToolTitle tool={event.tool} />;
    case "file-find":
      return <FindToolTitle tool={event.tool} />;
    case "web-fetch":
      return <WebFetchToolTitle tool={event.tool} />;
    case "custom":
      return <CustomToolTitle tool={event.tool} />;
    default:
      return <DefaultToolTitle tool={event.tool} />;
  }
}

export default function ToolTitle(props: {event: ToolEvent}) {
  const {event} = props;
  const pending = event.tool?.status === "pending";

  return (
    <div className={pending ? "shimmer min-w-0 text-ink-faint" : "min-w-0"}>
      <ToolTitleContent event={event} />
    </div>
  );
}
