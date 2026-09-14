import {use, useMemo, useState} from "react";
import type {ReactNode} from "react";
import {Popover} from "@base-ui/react/popover";
import type {HarnessRunSummary} from "@supernova/contracts/harnesses/schemas";
import Button from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import ConstantOrb from "@/components/brand/constant-orb";
import type {MathematicalConstant} from "@/components/brand/constant-identity";
import {useHarnessRuns} from "@/features/harnesses/hooks/api/use-harness-runs";
import {useWorkflowRuns} from "@/features/harnesses/hooks/api/use-workflow-runs";
import {useAppearanceStore} from "@/features/settings/stores/appearance-store";
import {WorkspaceOverviewContext} from "@/features/workspace/contexts/workspace-overview-context";
import {useWorkspaceMapStore} from "@/features/workspace/stores/workspace-map-store";
import type {ChatConstellationContext} from "@/features/sessions/types/chat-constellation";
import {buildOrbitModel} from "@/features/sessions/lib/orbits/orbit-model";
import type {OrbitBody} from "@/features/sessions/lib/orbits/orbit-model";
import {projectOrbits} from "@/features/sessions/lib/orbits/orbit-projection";
import type {OrbitGroup} from "@/features/sessions/lib/orbits/orbit-projection";
import OrbitCanvas from "@/features/sessions/components/orbits/orbit-canvas";
import OrbitInspector from "@/features/sessions/components/orbits/orbit-inspector";
import OrbitMembers from "@/features/sessions/components/orbits/orbit-members";
import "@/features/sessions/components/orbits/chat-orbits.css";

interface ChatConstellationProps {
  readonly context: ChatConstellationContext;
  readonly busy: boolean;
  readonly anchor: ReactNode;
  readonly status: ReactNode;
  readonly constant: MathematicalConstant;
  readonly rootRun?: HarnessRunSummary;
  readonly stale?: boolean;
}

/** The chat avatar is the sun; one observed system replaces separate maps and delegation diagrams. */
export default function ChatConstellation(props: ChatConstellationProps) {
  const {context, busy, anchor, status, constant, rootRun, stale: rootStale = false} = props;
  const overview = use(WorkspaceOverviewContext);
  const workers = useHarnessRuns(context.sessionId, busy);
  const workflows = useWorkflowRuns(context.sessionId, busy);
  const motion = useAppearanceStore((state) => state.mathematicalMotion);
  const preferences = useWorkspaceMapStore();
  const [width, setWidth] = useState(640);
  const [expanded, setExpanded] = useState(false);
  const [focusedId, setFocusedId] = useState<string>();
  const [selectedId, setSelectedId] = useState<string>();
  const [members, setMembers] = useState<readonly string[]>();
  const [event, setEvent] = useState("");
  const [lastRequest, setLastRequest] = useState<number>();
  const requested = preferences.requested?.sessionId === context.sessionId ? preferences.requested : undefined;
  if (requested && requested.nonce !== lastRequest) {
    setExpanded(true);
    setLastRequest(requested.nonce);
    setSelectedId(requested.nodeId);
    setFocusedId(undefined);
    setMembers(undefined);
  }
  const model = useMemo(
    () =>
      buildOrbitModel({
        chatId: context.sessionId,
        title: context.title,
        constant,
        busy,
        rootRun,
        runs: workers.data ?? overview?.data?.runs ?? [],
        workflows: workflows.data ?? overview?.data?.workflows ?? [],
        otherRuns: overview?.data?.runs,
        otherWorkflows: overview?.data?.workflows,
      }),
    [context.sessionId, context.title, constant, busy, rootRun, workers.data, workflows.data, overview?.data?.runs, overview?.data?.workflows]
  );
  const chosen = selectedId ? (model.bodies.get(selectedId) ?? [...model.bodies.values()].find((body) => `run:${body.runId}` === selectedId)) : undefined;
  const chosenWorkflow = selectedId?.startsWith("workflow:") ? model.workflows.find((run) => `workflow:${run.id}` === selectedId) : undefined;
  const focusId = focusedId ?? (chosen?.parentId && requested && requested.nonce === lastRequest ? chosen.parentId : model.rootId);
  const projection = projectOrbits(model, focusId, preferences.orbitDensity === "compact" || width < 540 ? 3 : 6, chosen?.id);
  const stale = Boolean(rootStale || workers.error || workflows.error);
  const select = (body: OrbitBody | OrbitGroup): void => {
    preferences.consumeFocus();
    if ("members" in body) {
      setMembers(body.members);
      setSelectedId(body.id);
      return;
    }
    if (body.id === projection.root.id && body.id === model.rootId) {
      setMembers(model.children.get(body.id) ?? []);
      setSelectedId(undefined);
      return;
    }
    setSelectedId(body.id);
    setMembers(undefined);
    if (model.children.get(body.id)?.length) setFocusedId(body.id);
    if (body.updatedAt) preferences.markRead(body.id, body.updatedAt);
  };
  const close = (): void => {
    setSelectedId(undefined);
    setMembers(undefined);
    preferences.consumeFocus();
  };
  const rootView = projection.root.id === model.rootId;
  const collapse = (): void => {
    setExpanded(false);
    setFocusedId(undefined);
    close();
  };
  const workflowMembers = chosenWorkflow ? [...model.bodies.values()].filter((body) => body.workflowId === chosenWorkflow.id).map((body) => body.id) : undefined;
  return (
    <section
      className="chat-orbits"
      aria-label="Chat solar system"
      data-chat-orbits={context.sessionId}
      data-expanded={expanded}
      onKeyDown={(event) => {
        if (event.key === "Escape" && expanded && !event.defaultPrevented) {
          event.preventDefault();
          collapse();
          event.currentTarget.querySelector<HTMLButtonElement>(".chat-orbit-sun")?.focus();
        }
      }}
    >
      {expanded && (
        <div className="chat-orbit-toolbar">
          {!rootView && (
            <Button
              className="chat-orbit-back"
              onClick={() => {
                setFocusedId(projection.root.parentId ?? model.rootId);
                close();
              }}
              aria-label="Back to parent system"
            >
              <Icon name="arrow-left" size="xs" />
              <span>Viewing {projection.root.label}</span>
            </Button>
          )}
          <Popover.Root>
            <Popover.Trigger aria-label="Orbit options" className="chat-orbit-options">
              <Icon name="more-horizontal" size="sm" />
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Positioner side="top" align="end" sideOffset={8} collisionPadding={12} className="z-50">
                <Popover.Popup aria-label="Orbit options" className="grid w-64 gap-3 rounded-xl border border-border bg-surface p-4 text-xs text-ink">
                  <Button onClick={() => preferences.setOrbitMotion(!preferences.orbitMotion)}>{preferences.orbitMotion ? "Pause orbital motion" : "Resume orbital motion"}</Button>
                  <label className="flex items-center justify-between gap-3">
                    Detail
                    <select
                      aria-label="Orbit detail"
                      className="bg-surface"
                      value={preferences.orbitDensity}
                      onChange={(e) => preferences.setOrbitDensity(e.target.value as "compact" | "balanced")}
                    >
                      <option value="balanced">Balanced</option>
                      <option value="compact">Compact</option>
                    </select>
                  </label>
                  <Button
                    onClick={() => {
                      setMembers(model.children.get(projection.root.id) ?? []);
                      setSelectedId(undefined);
                    }}
                  >
                    Find a participant
                  </Button>
                  {!rootView && (
                    <Button
                      onClick={() => {
                        setFocusedId(model.rootId);
                        close();
                      }}
                    >
                      Return to this chat
                    </Button>
                  )}
                </Popover.Popup>
              </Popover.Positioner>
            </Popover.Portal>
          </Popover.Root>
          <Button
            className="chat-orbit-options chat-orbit-close"
            aria-label="Close solar system"
            onClick={(event) => {
              event.currentTarget.closest("section")?.querySelector<HTMLButtonElement>(".chat-orbit-sun")?.focus();
              collapse();
            }}
          >
            <Icon name="x" size="sm" />
          </Button>
        </div>
      )}
      <OrbitCanvas
        expanded={expanded}
        onToggle={() => (expanded ? collapse() : setExpanded(true))}
        model={model}
        projection={projection}
        selectedId={chosen?.id ?? selectedId}
        ready={workers.isSuccess && workflows.isSuccess}
        stale={stale}
        moving={preferences.orbitMotion && motion !== "off"}
        onResize={setWidth}
        onSelect={select}
        onEvent={setEvent}
        anchor={rootView ? anchor : <ConstantOrb constant={projection.root.constant} className="size-16" state={projection.root.active && !stale ? "working" : "still"} />}
        status={rootView ? status : projection.root.status}
      />
      <span className="sr-only" role="status">
        {event}
      </span>
      {expanded && (workers.isPending || workflows.isPending) && busy && (
        <p className="py-2 text-xs text-ink-muted" role="status">
          Loading recorded work…
        </p>
      )}
      {expanded && stale && (
        <p role="status" className="py-2 text-xs text-ink-muted">
          Last saved activity · updates unavailable.{" "}
          <Button
            className="underline"
            onClick={() => {
              void workers.refetch();
              void workflows.refetch();
            }}
          >
            Retry
          </Button>
        </p>
      )}
      {expanded && (members || workflowMembers) && (
        <OrbitMembers key={`${projection.root.id}:${members?.join(",") ?? chosenWorkflow?.id}`} model={model} ids={members ?? workflowMembers!} onSelect={select} onClose={close} />
      )}
      {expanded && chosen && chosen.id !== model.rootId && <OrbitInspector key={chosen.id} body={chosen} onClose={close} />}
    </section>
  );
}
