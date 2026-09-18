import {useState} from "react";
import ConstantOrb from "@/components/brand/constant-orb";
import {useNavigate} from "@tanstack/react-router";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import {SettingsGroup, SettingsLinkRow, SettingsNote, SettingsRow} from "@/features/settings/components/settings-group";
import ScienceImport from "@/features/harnesses/components/science-import";
import {useHarnessLibrary, useSaveHarness} from "@/features/harnesses/hooks/api/use-harnesses";
import {useHarnessNavigationStore} from "@/features/harnesses/stores/harness-navigation-store";

/** The harness library, listed inside settings. Each entry opens its configuration on the settings harness route. */
export default function HarnessesPage() {
  const library = useHarnessLibrary();
  const save = useSaveHarness();
  const navigate = useNavigate();
  const select = useHarnessNavigationStore((state) => state.selectHarness);
  const [name, setName] = useState("");
  const [importOpen, setImportOpen] = useState(false);

  // The library is the whole content of this section, so it is narrowed once instead of guarded in every expression.
  if (!library.data) {
    return (
      <SettingsGroup title="Harnesses">
        {library.isError ? (
          <SettingsNote role="alert" tone="danger">
            Could not load your harnesses. {String(library.error)}
          </SettingsNote>
        ) : (
          <SettingsNote>Loading harnesses…</SettingsNote>
        )}
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
          void navigate({to: "/settings/harness/$harnessId/$page", params: {harnessId: id, page: "overview"}});
        },
      }
    );
  };

  return (
    <>
      <SettingsGroup description="Open a harness to change its instructions, agents, skills, workflows and projects." title={`${harnesses.length} harnesses`}>
        {harnesses.map((harness) => (
          <SettingsLinkRow
            description={harness.description}
            key={harness.id}
            label={`Open ${harness.name}`}
            leading={<ConstantOrb constant="pi" className="size-8" state="still" />}
            meta={`${projects.filter((project) => project.harnessId === harness.id).length} projects · ${harness.agents.length} agents`}
            title={harness.name}
            onClick={() => {
              select(harness.id);
              void navigate({to: "/settings/harness/$harnessId/$page", params: {harnessId: harness.id, page: "overview"}});
            }}
          />
        ))}
        {harnesses.length === 0 && <SettingsNote>No harness yet. Create one below, then link its first project.</SettingsNote>}
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
        {!harnesses.some((harness) => harness.id === "science") && <ScienceImport open={importOpen} revision={revision} onToggle={() => setImportOpen(!importOpen)} />}
      </SettingsGroup>

      {save.error && (
        <p className="px-1 text-sm text-danger-ink" role="alert">
          {String(save.error)}
        </p>
      )}
    </>
  );
}
