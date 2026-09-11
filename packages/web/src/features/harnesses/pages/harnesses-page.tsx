import {useState} from "react";
import {Link, useNavigate} from "@tanstack/react-router";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Icon from "@/components/ui/icon";
import {SettingsGroup, SettingsRow} from "@/features/settings/components/settings-group";
import {configCardClass} from "@/features/harnesses/components/config-card";
import {useHarnessLibrary, useImportScienceHarness, useSaveHarness} from "@/features/harnesses/hooks/api/use-harnesses";
import {useHarnessNavigationStore} from "@/features/harnesses/stores/harness-navigation-store";
import {cn} from "@/lib/cn";

/** The harness library, listed inside settings. Each entry opens its configuration on the settings harness route. */
export default function HarnessesPage() {
  const library = useHarnessLibrary();
  const save = useSaveHarness();
  const importer = useImportScienceHarness();
  const navigate = useNavigate();
  const select = useHarnessNavigationStore((state) => state.selectHarness);
  const [name, setName] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [packagePath, setPackagePath] = useState("~/Developer/pi-scientific-tools");
  const [rootPath, setRootPath] = useState("~/Developer/Science-Space");

  // The library is the whole content of this section, so it is narrowed once instead of guarded in every expression.
  if (!library.data) {
    return (
      <SettingsGroup title="Harnesses">
        <SettingsRow description="Different ways of working, in one app. Each harness owns its instructions, agents, resources, workflows, and projects." title="Your harnesses">
          {library.isError ? (
            <p className="text-sm text-danger-ink" role="alert">
              Could not load your harnesses. {String(library.error)}
            </p>
          ) : (
            <p className="text-sm text-ink-muted">Loading harnesses…</p>
          )}
        </SettingsRow>
      </SettingsGroup>
    );
  }

  const {harnesses, projects, revision} = library.data;

  const handleCreate = (): void => {
    const id = crypto.randomUUID();
    save.mutate(
      {
        expectedRevision: revision,
        harness: {
          id,
          name: name.trim(),
          description: "Your custom Pi setup.",
          systemPrompt: "",
          agents: [],
          extensions: [],
          skills: [],
          context: {instructions: "", files: [], includeProjectInstructions: true, autoCompaction: true, reserveTokens: 16384, keepRecentTokens: 20000},
          graph: {steps: []},
          workflows: [],
          loop: {maxTurns: 40, timeoutSeconds: 900},
        },
      },
      {
        onSuccess: () => {
          select(id);
          setName("");
          void navigate({to: "/settings/harness/$harnessId", params: {harnessId: id}});
        },
      }
    );
  };

  return (
    <>
      <SettingsGroup title="Harnesses">
        <SettingsRow description="Different ways of working, in one app. Each harness owns its instructions, agents, resources, workflows, and projects." title="Your harnesses">
          {harnesses.length === 0 && <p className={cn(configCardClass, "p-5 text-sm text-ink-muted")}>No harness yet. Create one below, then link its first project.</p>}
          <div className="grid gap-3 sm:grid-cols-2">
            {harnesses.map((harness) => (
              <Link
                key={harness.id}
                params={{harnessId: harness.id}}
                to="/settings/harness/$harnessId"
                onClick={() => select(harness.id)}
                className={cn(configCardClass, "group flex flex-col p-5 transition-colors hover:border-border-strong hover:bg-surface-control")}
              >
                <span className="flex items-center justify-between">
                  <Icon name="workflow" size="md" className="text-ink-muted" />
                  <Icon className="text-ink-faint group-hover:text-ink" name="arrow-right" size="sm" />
                </span>
                <span className="mt-4 text-sm font-medium text-ink-strong">{harness.name}</span>
                <span className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-ink-muted">{harness.description}</span>
                <span className="mt-4 font-mono text-xs text-ink-faint">
                  {projects.filter((project) => project.harnessId === harness.id).length} projects · {harness.agents.length} agents
                </span>
              </Link>
            ))}
          </div>
        </SettingsRow>
      </SettingsGroup>

      <SettingsGroup title="Add a harness">
        <SettingsRow description="Starts empty: no agents, no workflow, no projects." title="Create a clean harness">
          <div className="flex flex-wrap gap-2">
            <Input
              aria-label="New harness name"
              className="min-w-48 flex-1"
              placeholder="e.g. Research, Coding, Writing"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <Button className="shrink-0 px-4 py-2 text-sm" variant="filled" disabled={!name.trim() || save.isPending} onClick={handleCreate}>
              {save.isPending ? "Creating…" : "Create harness"}
            </Button>
          </div>
        </SettingsRow>
        {!harnesses.some((harness) => harness.id === "science") && (
          <SettingsRow
            control={
              <Button aria-expanded={importOpen} className="rounded-lg border border-border px-3 py-2 text-xs" onClick={() => setImportOpen(!importOpen)}>
                {importOpen ? "Hide" : "Set up import"}
                <Icon name="chevron-down" size="xs" className={cn("ml-2 transition-transform", importOpen && "rotate-180")} />
              </Button>
            }
            description="Imports prompts and specialist definitions, and links existing lab folders. Original files are not overwritten. Existing research gates stay in place; no agents or experiments start."
            title="Import your Science Pi setup"
          >
            {importOpen && (
              <div className="space-y-3">
                <label className="block space-y-1.5">
                  <span className="block text-xs text-ink-muted">Science package</span>
                  <Input value={packagePath} onChange={(event) => setPackagePath(event.target.value)} />
                </label>
                <label className="block space-y-1.5">
                  <span className="block text-xs text-ink-muted">Science workspace</span>
                  <Input value={rootPath} onChange={(event) => setRootPath(event.target.value)} />
                </label>
                <Button
                  variant="filled"
                  className="px-4 py-2 text-sm"
                  disabled={importer.isPending}
                  onClick={() =>
                    importer.mutate(
                      {packagePath, rootPath, expectedRevision: revision},
                      {
                        onSuccess: () => {
                          select("science");
                          void navigate({to: "/settings/harness/$harnessId", params: {harnessId: "science"}});
                        },
                      }
                    )
                  }
                >
                  {importer.isPending ? "Importing…" : "Import Science Pi"}
                </Button>
              </div>
            )}
          </SettingsRow>
        )}
      </SettingsGroup>

      {(save.error || importer.error) && (
        <p className="px-3 text-sm text-danger-ink sm:px-4" role="alert">
          {String(save.error || importer.error)}
        </p>
      )}
    </>
  );
}
