import {useState} from "react";
import {Link, useNavigate} from "@tanstack/react-router";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Icon from "@/components/ui/icon";
import {ConfigField} from "@/features/harnesses/components/config-fields";
import {useHarnessLibrary, useImportScienceHarness, useSaveHarness} from "@/features/harnesses/hooks/api/use-harnesses";
import {useHarnessNavigationStore} from "@/features/harnesses/stores/harness-navigation-store";

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
  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-12 pt-16 md:pt-8">
      <div className="mx-auto max-w-5xl space-y-8">
        <div>
          <h1 className="text-2xl font-medium tracking-tight">Your harnesses</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-muted">
            Different ways of working, in one app. Each harness owns its instructions, agents, context, workflow, and projects.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {library.data?.harnesses.map((harness) => (
            <Link
              key={harness.id}
              params={{harnessId: harness.id}}
              to="/harness/$harnessId"
              onClick={() => select(harness.id)}
              className="group rounded-2xl border border-border bg-surface-raised p-6 transition-colors hover:border-ink-faint"
            >
              <div className="flex items-center justify-between">
                <Icon name="workflow" size="lg" />
                <Icon className="text-ink-faint group-hover:text-ink" name="arrow-right" size="sm" />
              </div>
              <h2 className="mt-5 text-lg font-medium">{harness.name}</h2>
              <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-ink-muted">{harness.description}</p>
              <p className="mt-5 font-mono text-xs text-ink-faint">
                {library.data?.projects.filter((project) => project.harnessId === harness.id).length} projects · {harness.agents.length} agents
              </p>
            </Link>
          ))}
        </div>
        <section className="space-y-4 rounded-xl border border-border p-5">
          <h2 className="text-sm font-medium">Create a clean harness</h2>
          <div className="flex gap-3">
            <Input aria-label="New harness name" placeholder="e.g. Research, Coding, Writing" value={name} onChange={(event) => setName(event.target.value)} />
            <Button
              className="shrink-0 px-4 py-2 text-sm"
              variant="filled"
              disabled={!name.trim() || !library.data || save.isPending}
              onClick={() => {
                const id = crypto.randomUUID();
                save.mutate(
                  {
                    expectedRevision: library.data!.revision,
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
                      loop: {maxTurns: 40, timeoutSeconds: 900},
                    },
                  },
                  {
                    onSuccess: () => {
                      select(id);
                      void navigate({to: "/harness/$harnessId", params: {harnessId: id}});
                    },
                  }
                );
              }}
            >
              Create harness
            </Button>
          </div>
        </section>
        {!library.data?.harnesses.some((harness) => harness.id === "science") && (
          <section className="space-y-4 rounded-xl border border-border p-5">
            <Button className="flex w-full items-center justify-between text-sm" onClick={() => setImportOpen(!importOpen)}>
              Import your Science Pi setup
              <Icon name="chevron-down" size="sm" />
            </Button>
            {importOpen && (
              <>
                <ConfigField label="Science package">
                  <Input value={packagePath} onChange={(event) => setPackagePath(event.target.value)} />
                </ConfigField>
                <ConfigField label="Science workspace">
                  <Input value={rootPath} onChange={(event) => setRootPath(event.target.value)} />
                </ConfigField>
                <p className="text-xs leading-relaxed text-ink-muted">
                  Imports prompts and specialist definitions, and links existing lab folders. Original files are not overwritten. Existing research gates stay in place; no agents
                  or experiments start.
                </p>
                <Button
                  variant="filled"
                  className="px-4 py-2 text-sm"
                  disabled={!library.data || importer.isPending}
                  onClick={() =>
                    importer.mutate(
                      {packagePath, rootPath, expectedRevision: library.data!.revision},
                      {
                        onSuccess: () => {
                          select("science");
                          void navigate({to: "/harness/$harnessId", params: {harnessId: "science"}});
                        },
                      }
                    )
                  }
                >
                  {importer.isPending ? "Importing…" : "Import Science Pi"}
                </Button>
              </>
            )}
          </section>
        )}
        {(library.error || save.error || importer.error) && (
          <p className="text-sm text-danger-ink" role="alert">
            {String(library.error || save.error || importer.error)}
          </p>
        )}
      </div>
    </div>
  );
}
