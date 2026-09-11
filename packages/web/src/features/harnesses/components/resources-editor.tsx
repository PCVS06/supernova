import {useState} from "react";
import type {HarnessConfig, HarnessProject} from "@supernova/contracts/harnesses/schemas";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import EditorTabs from "@/features/harnesses/components/editor-tabs";
import SkillsEditor from "@/features/harnesses/components/skills-editor";
import ToolCredentialsEditor from "@/features/harnesses/components/tool-credentials-editor";
import {useHarnessResources} from "@/features/harnesses/hooks/api/use-harness-resources";

export default function ResourcesEditor(props: {harness: HarnessConfig; project?: HarnessProject; onChange: (skills: readonly string[] | undefined) => void}) {
  const {harness, project, onChange} = props;
  const [section, setSection] = useState<"skills" | "tools" | "connectors">("skills");
  const [query, setQuery] = useState("");
  const resources = useHarnessResources(harness.id, project?.id);
  const tools = resources.data?.tools.filter((tool) => `${tool.name} ${tool.description} ${tool.group}`.toLowerCase().includes(query.toLowerCase())) ?? [];
  const research = resources.data?.tools.some((tool) => tool.name === "research_literature_search");
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 border-b border-border px-6">
        <EditorTabs
          label="Resource sections"
          value={section}
          onChange={setSection}
          items={[
            {value: "skills", label: "Skills"},
            {value: "tools", label: "Tools", count: resources.data?.tools.length},
            {value: "connectors", label: "Connectors & API keys"},
          ]}
        />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-6">
        <div className="mx-auto max-w-3xl space-y-6">
          {section === "skills" && (
            <>
              <div>
                <h2 className="text-lg font-medium">Skills</h2>
              </div>
              <SkillsEditor
                harnessId={harness.id}
                inherited={project ? harness.enabledSkills : undefined}
                value={project ? project.enabledSkills : harness.enabledSkills}
                onChange={onChange}
              />
            </>
          )}
          {section !== "skills" && resources.isPending && <p className="text-sm text-ink-muted">Inspecting configured resources…</p>}
          {section !== "skills" && resources.isError && (
            <p role="alert" className="text-sm text-danger-ink">
              Could not inspect resources.{" "}
              <Button className="underline" onClick={() => void resources.refetch()}>
                Retry
              </Button>
            </p>
          )}
          {!!resources.data?.warnings.length && (
            <details role="alert" className="rounded-lg border border-border p-4 text-xs text-danger-ink">
              <summary className="cursor-pointer">{resources.data.warnings.length} extensions unavailable</summary>
              <ul className="mt-3 space-y-2">
                {resources.data.extensions
                  .filter((extension) => !extension.loaded)
                  .map((extension, index) => (
                    <li key={index}>{extension.name}</li>
                  ))}
              </ul>
            </details>
          )}
          {section === "tools" && resources.data && (
            <>
              <div>
                <h2 className="text-lg font-medium">Tools</h2>
              </div>
              <Input aria-label="Search tools" placeholder="Search tools…" value={query} onChange={(event) => setQuery(event.target.value)} />
              <div className="space-y-3">
                {tools.map((tool) => (
                  <section key={tool.group + tool.name} className="rounded-xl border border-border bg-surface-raised p-4">
                    <p className="text-xs text-ink-muted">{tool.group}</p>
                    <h3 className="mt-1 break-all font-mono text-sm">{tool.name}</h3>
                    <p className="mt-2 text-xs leading-relaxed text-ink-muted">{tool.description}</p>
                  </section>
                ))}
                {!tools.length && <p className="text-sm text-ink-muted">No matching tools.</p>}
              </div>
              <details className="rounded-xl border border-border p-4">
                <summary className="cursor-pointer text-sm">Connected extensions · {resources.data.extensions.length}</summary>
                <div className="mt-4 space-y-3">
                  {resources.data.extensions.map((extension, index) => (
                    <div key={index} className="text-xs">
                      <p>
                        {extension.name} · {extension.loaded ? `${extension.toolCount} tools registered` : "Load failed"}
                      </p>
                      {extension.commands.length > 0 && <p className="mt-1 text-ink-muted">{extension.commands.map((name) => `/${name}`).join(", ")}</p>}
                    </div>
                  ))}
                </div>
              </details>
            </>
          )}
          {section === "connectors" &&
            resources.data &&
            (research ? (
              <ToolCredentialsEditor />
            ) : (
              <div className="rounded-xl border border-border p-4">
                <h2 className="text-sm font-medium">No supported external connectors registered</h2>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
