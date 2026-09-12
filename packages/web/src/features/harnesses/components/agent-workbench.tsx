import {useState} from "react";
import type {ReactNode} from "react";
import PiOrb from "@/components/brand/pi-orb";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Icon from "@/components/ui/icon";
import SettingsPageShell from "@/features/settings/components/settings-page-shell";
import AgentMark from "@/features/harnesses/components/agent-mark";
import type {AgentMarkKind} from "@/features/harnesses/components/agent-mark";
import ConfigChoice from "@/features/harnesses/components/config-choice";
import EditorTabs from "@/features/harnesses/components/editor-tabs";
import {agentColor} from "@/features/harnesses/lib/agent-identity";
import {cn} from "@/lib/cn";

export type AgentEditorSection = "settings" | "prompt" | "skills" | "memory";

/** The four panels every agent-like role is edited through. Memory is part of the agent, not a place of its own. */
const agentEditorSections: readonly {value: AgentEditorSection; label: string}[] = [
  {value: "settings", label: "Settings"},
  {value: "prompt", label: "Instructions"},
  {value: "skills", label: "Skills"},
  {value: "memory", label: "Memory"},
];

interface AgentWorkbenchProps {
  kind: AgentMarkKind;
  identity?: {id: string; name: string; role: string; description: string; color?: string};
  selection?: {
    label: string;
    value: string;
    items: readonly {id: string; name: string; color?: string; subtitle: string; searchText?: string}[];
    onChange: (id: string) => void;
    onAdd?: () => void;
  };
  section?: AgentEditorSection;
  onSectionChange?: (section: AgentEditorSection) => void;
  children: ReactNode;
}

/** Shared identity, selector, navigation and scroll ownership for every agent-like role: orchestrator, leads, specialists. */
export default function AgentWorkbench(props: AgentWorkbenchProps) {
  const {kind, identity, selection, section, onSectionChange, children} = props;
  const [query, setQuery] = useState("");
  const prefix = kind === "lead" ? "lead" : "agent";
  const filtered = selection?.items.filter((item) => `${item.name} ${item.searchText ?? ""}`.toLowerCase().includes(query.toLowerCase())) ?? [];
  const detailNavigation = section && onSectionChange && (
    <EditorTabs label={kind === "lead" ? "Lead editor tabs" : "Agent editor tabs"} value={section} items={agentEditorSections} onChange={onSectionChange} />
  );

  return (
    <div className="harness-agent-layout flex h-full min-h-0 overflow-hidden" data-testid={`${prefix}-workbench`}>
      {selection && (
        <>
          <div className="agent-compact-picker shrink-0 items-center gap-3 border-b border-border px-6 py-3">
            <div className="min-w-0 flex-1">
              {selection.items.length ? (
                <ConfigChoice
                  label={selection.label}
                  value={selection.value}
                  options={selection.items.map((item) => ({value: item.id, label: item.name}))}
                  onChange={selection.onChange}
                />
              ) : (
                <span className="text-sm text-ink-muted">No agents yet</span>
              )}
            </div>
            {selection.onAdd && (
              <Button onClick={selection.onAdd} aria-label="Add agent" className="flex size-8 shrink-0 items-center justify-center rounded-md hover:bg-overlay-hover">
                <Icon name="plus" size="sm" />
              </Button>
            )}
          </div>
          <aside className="harness-agent-list flex min-h-0 w-64 shrink-0 flex-col border-r border-border">
            <div className="space-y-3 p-4">
              <div className="flex h-6 items-center justify-between gap-2 text-xs text-ink-muted">
                <span>
                  {selection.label} <span className="ml-1 text-ink-faint">{selection.items.length}</span>
                </span>
                {selection.onAdd && (
                  <Button onClick={selection.onAdd} aria-label="Add agent" className="flex size-6 items-center justify-center rounded-md hover:bg-overlay-hover">
                    <Icon name="plus" size="xs" />
                  </Button>
                )}
              </div>
              <Input
                aria-label={`Search ${selection.label.toLowerCase()}`}
                placeholder={`Search ${selection.label.toLowerCase()}…`}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-3" data-testid={`${prefix}-list-scroll`}>
              {filtered.map((item) => (
                <Button
                  key={item.id}
                  aria-label={`Configure ${item.name}${kind === "lead" ? " lead" : ""}`}
                  aria-pressed={selection.value === item.id}
                  onClick={() => selection.onChange(item.id)}
                  className={cn(
                    "agent-editor-row mb-1 flex min-h-18 w-full items-center gap-3 rounded-xl corner-superellipse/1.3 px-2 py-2 text-left outline-none hover:bg-overlay-hover focus-visible:bg-overlay-hover",
                    selection.value === item.id && "bg-surface-control"
                  )}
                >
                  <AgentMark name={item.id} color={item.color} kind={kind} className="size-10 shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2 text-sm leading-5" title={item.name}>
                      {item.name}
                    </span>
                    <span className="mt-1 block truncate text-xs text-ink-muted" title={item.subtitle}>
                      {item.subtitle}
                    </span>
                  </span>
                </Button>
              ))}
              {!filtered.length && <p className="px-2 py-3 text-xs text-ink-muted">{selection.items.length ? "No matches." : "Add an agent to get started."}</p>}
            </div>
          </aside>
        </>
      )}
      <section className="flex min-h-0 min-w-0 flex-1 flex-col" data-testid="agent-editor-detail">
        {identity && (
          <header className="agent-editor-header shrink-0 border-b border-border px-5 pt-5 sm:px-6">
            <div className="mx-auto w-full max-w-4xl">
              <div className="agent-editor-hero flex min-h-24 items-center gap-4">
                <PiOrb label={`${identity.name} ${kind} identity`} className="agent-editor-portrait size-24" color={agentColor(identity.id, identity.color)} state="idle" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs uppercase tracking-wider text-ink-muted">{identity.role}</p>
                  <h2 className="mt-1 line-clamp-2 text-xl font-medium leading-snug" title={identity.name}>
                    {identity.name}
                  </h2>
                  {identity.description && <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-ink-muted">{identity.description}</p>}
                </div>
              </div>
              {detailNavigation && <div className="mt-3">{detailNavigation}</div>}
            </div>
          </header>
        )}
        <SettingsPageShell testId={`${prefix}-detail-scroll`}>{children}</SettingsPageShell>
      </section>
    </div>
  );
}
