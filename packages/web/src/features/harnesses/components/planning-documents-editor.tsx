import {useState} from "react";
import Button from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import Input from "@/components/ui/input";
import {SettingsGroup, SettingsRow} from "@/features/settings/components/settings-group";
import ConfigCard from "@/features/harnesses/components/config-card";
import PromptEditor from "@/features/harnesses/components/prompt-editor";
import {useProjectDocument, useSaveProjectDocument} from "@/features/harnesses/hooks/api/use-project-documents";
import {addPlanningDocument, isPlanningDocumentConflict, planningDocumentWrite, quickPlanningDocuments} from "@/features/harnesses/lib/planning-documents";
import {cn} from "@/lib/cn";

interface DocumentContentEditorProps {
  projectPath: string;
  path: string;
}

/** Loads one document, keeps the edit local, and writes it back with the modification time it was loaded at. */
function DocumentContentEditor(props: DocumentContentEditorProps) {
  const {projectPath, path} = props;
  const document = useProjectDocument(projectPath, path);
  const save = useSaveProjectDocument();
  const [edited, setEdited] = useState<string>();
  const loaded = document.data;
  const content = edited ?? loaded?.content ?? "";
  const dirty = edited !== undefined && edited !== (loaded?.content ?? "");
  const conflict = isPlanningDocumentConflict(save.error, loaded?.modifiedAt);

  const handleSave = (): void => {
    save.reset();
    save.mutate(planningDocumentWrite({content, loaded, path, projectPath}));
  };

  const handleReload = (): void => {
    save.reset();
    setEdited(undefined);
    void document.refetch();
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="min-w-0 flex-1 truncate font-mono text-xs text-ink-muted" title={`${projectPath}/${path}`}>
          {path}
        </span>
        {loaded && <span className="text-xs text-ink-faint">Loaded {new Date(loaded.modifiedAt).toLocaleString()}</span>}
        {!loaded && document.isError && <span className="text-xs text-ink-faint">New file · saving creates it</span>}
        <Button className="rounded-lg border border-border px-3 py-2 text-xs text-ink-muted hover:text-ink" disabled={document.isFetching} onClick={handleReload}>
          Reload
        </Button>
        <Button className="px-3 py-2 text-xs" variant="filled" disabled={!dirty || save.isPending} onClick={handleSave}>
          {save.isPending ? "Saving…" : "Save document"}
        </Button>
      </div>
      {document.isPending && <p className="text-sm text-ink-muted">Loading {path}…</p>}
      {loaded?.truncated && <p className="text-xs text-ink-muted">This document was cut at the server's read limit. Saving would discard the rest, so edit it on disk instead.</p>}
      <PromptEditor
        disabled={document.isPending || loaded?.truncated}
        label={`${path} content`}
        onChange={setEdited}
        placeholder={`# ${path.replace(/\.md$/i, "")}\n\nWhat this project is working towards.`}
        size="lg"
        value={content}
      />
      {conflict && (
        <p className="text-xs leading-relaxed text-danger-ink" role="alert">
          {path} changed on disk after it was loaded, so the server refused the write and kept the newer version. Reload it, then apply your edit again. Your text is still here.
        </p>
      )}
      {save.error && !conflict && (
        <p className="text-xs leading-relaxed text-danger-ink" role="alert">
          Could not save {path}. {String(save.error)} Your text is still here.
        </p>
      )}
      {save.isSuccess && !dirty && <p className="text-xs text-ink-muted">Saved. Agents in this project read it from their next chat on.</p>}
    </div>
  );
}

interface PlanningDocumentsEditorProps {
  projectPath: string;
  documents: readonly string[];
  onChange: (documents: readonly string[]) => void;
}

/** The project's long-term plans: listed here, written as Markdown in the project folder. */
export default function PlanningDocumentsEditor(props: PlanningDocumentsEditorProps) {
  const {projectPath, documents, onChange} = props;
  const [path, setPath] = useState("");
  const [selected, setSelected] = useState(documents[0] ?? "");
  const open = documents.includes(selected) ? selected : "";

  const handleAdd = (next: string): void => {
    const added = addPlanningDocument(documents, next);
    if (added === documents) return;
    onChange(added);
    setSelected(added[added.length - 1]!);
    setPath("");
  };

  return (
    <SettingsGroup title="Planning documents">
      <SettingsRow
        description="Every agent working in this project reads these Markdown documents as part of its instructions, so a long-term plan survives new chats and compacted context windows."
        title="Documents agents always read"
      >
        <div className="space-y-2">
          {documents.length === 0 && <ConfigCard className="border-dashed text-sm text-ink-muted">No planning documents yet.</ConfigCard>}
          {documents.map((item) => (
            <ConfigCard className="flex items-center gap-2" key={item}>
              <Button
                aria-label={`Edit ${item}`}
                aria-pressed={item === open}
                className={cn("min-w-0 flex-1 truncate text-left font-mono text-xs text-ink-muted hover:text-ink", item === open && "text-ink")}
                onClick={() => setSelected(item === open ? "" : item)}
              >
                {item}
              </Button>
              <Button
                aria-label={`Remove ${item}`}
                className="grid size-7 shrink-0 place-items-center rounded-md hover:bg-overlay-hover"
                onClick={() => onChange(documents.filter((document) => document !== item))}
              >
                <Icon name="x" size="xs" />
              </Button>
            </ConfigCard>
          ))}
        </div>
      </SettingsRow>
      <SettingsRow description="A project-relative path. The file is created on the server the first time you save it." title="Add a document">
        <div className="flex flex-wrap items-center gap-2">
          <Input aria-label="Planning document path" className="min-w-48 flex-1" placeholder="docs/roadmap.md" value={path} onChange={(event) => setPath(event.target.value)} />
          <Button className="px-3 py-2 text-xs" variant="filled" disabled={!path.trim()} onClick={() => handleAdd(path)}>
            Add document
          </Button>
          {quickPlanningDocuments.map((quick) => (
            <Button
              className="rounded-lg border border-border px-3 py-2 text-xs text-ink-muted hover:text-ink"
              disabled={documents.includes(quick)}
              key={quick}
              onClick={() => handleAdd(quick)}
            >
              Create {quick}
            </Button>
          ))}
        </div>
      </SettingsRow>
      {open && (
        <SettingsRow description="Markdown, saved straight into the project folder." stacked title={open}>
          <DocumentContentEditor key={`${projectPath}:${open}`} path={open} projectPath={projectPath} />
        </SettingsRow>
      )}
    </SettingsGroup>
  );
}
