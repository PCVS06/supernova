import {useState, type FormEvent, type KeyboardEvent} from "react";
import Button from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import IconButton from "@/components/ui/icon-button";
import Input from "@/components/ui/input";
import {useProjectDocument, useSaveProjectDocument} from "@/features/harnesses/hooks/api/use-project-documents";
import {
  addPlanningDocument,
  isPlanningDocumentConflict,
  planningDocumentTemplate,
  planningDocumentWrite,
  quickPlanningDocuments,
} from "@/features/harnesses/lib/planning-documents";
import {cn} from "@/lib/cn";

interface DocumentContentEditorProps {
  projectPath: string;
  path: string;
  disabled?: boolean;
}

/** One document, full height: a status bar with Save and Revert above the text. Cmd+S saves. */
function DocumentContentEditor(props: DocumentContentEditorProps) {
  const {projectPath, path, disabled} = props;
  const document = useProjectDocument(projectPath, path);
  const save = useSaveProjectDocument();
  const [edited, setEdited] = useState<string>();
  const loaded = document.data;
  // A listed file that is not on disk yet opens with a starting structure; its first save creates it.
  const missing = !loaded && document.isError;
  const content = edited ?? loaded?.content ?? (missing ? planningDocumentTemplate(path) : "");
  const dirty = content !== (loaded?.content ?? "");
  const conflict = isPlanningDocumentConflict(save.error, loaded?.modifiedAt);
  const locked = disabled || document.isPending || loaded?.truncated;
  const canSave = dirty && !locked && !save.isPending;

  const handleSave = (): void => {
    if (!canSave) return;
    save.reset();
    save.mutate(planningDocumentWrite({content, loaded, path, projectPath}));
  };

  const handleRevert = (): void => {
    save.reset();
    setEdited(undefined);
    void document.refetch();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>): void => {
    if ((event.metaKey || event.ctrlKey) && event.key === "s") {
      event.preventDefault();
      handleSave();
    }
  };

  const status = save.isPending
    ? "Saving…"
    : conflict
      ? "Changed on disk"
      : dirty
        ? missing
          ? "New file · Save creates it"
          : "Unsaved changes"
        : loaded
          ? `Saved · ${new Date(loaded.modifiedAt).toLocaleString()}`
          : document.isPending
            ? "Loading…"
            : "";

  return (
    <div className="flex min-h-0 flex-1 flex-col" data-testid="planning-document-editor">
      <div className="flex h-11 shrink-0 items-center gap-3 border-b border-border px-4">
        <Icon className="text-ink-faint" name="file" size="xs" />
        <span className="min-w-0 flex-1 truncate font-mono text-xs text-ink" title={`${projectPath}/${path}`}>
          {path}
        </span>
        {status && <span className={cn("text-xs", conflict ? "text-danger-ink" : "text-ink-faint")}>{status}</span>}
        <Button className="rounded-md px-2.5 py-1.5 text-xs text-ink-muted hover:bg-overlay-hover hover:text-ink" disabled={document.isFetching || !dirty} onClick={handleRevert}>
          Revert
        </Button>
        <Button className="px-3 py-1.5 text-xs" disabled={!canSave} variant="filled" onClick={handleSave}>
          {save.isPending ? "Saving…" : "Save"}
        </Button>
      </div>
      {loaded?.truncated && (
        <p className="shrink-0 border-b border-border px-4 py-2 text-xs text-ink-muted">
          This document was cut at the server's read limit. Saving would discard the rest, so edit it on disk instead.
        </p>
      )}
      {conflict && (
        <p className="shrink-0 border-b border-border px-4 py-2 text-xs leading-relaxed text-danger-ink" role="alert">
          {path} changed on disk after it was loaded, so the server kept the newer version. Revert, then apply your edit again. Your text is still here.
        </p>
      )}
      {save.error && !conflict && (
        <p className="shrink-0 border-b border-border px-4 py-2 text-xs leading-relaxed text-danger-ink" role="alert">
          Could not save {path}. {String(save.error)} Your text is still here.
        </p>
      )}
      <textarea
        aria-label={`${path} content`}
        className="min-h-0 flex-1 resize-none bg-transparent px-6 py-5 font-mono text-sm leading-relaxed text-ink outline-none placeholder:text-ink-faint disabled:opacity-60"
        disabled={locked}
        onChange={(event) => setEdited(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={`# ${path.replace(/\.md$/i, "")}`}
        spellCheck={false}
        value={content}
      />
    </div>
  );
}

interface EmptyPlanProps {
  disabled?: boolean;
  onAdd: (path: string) => void;
  onAddExisting: () => void;
}

function EmptyPlan(props: EmptyPlanProps) {
  const {disabled, onAdd, onAddExisting} = props;
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 px-6 py-10 text-center">
      <div className="grid size-12 place-items-center rounded-2xl border border-border text-ink-faint">
        <Icon name="file" />
      </div>
      <div className="max-w-md">
        <h3 className="text-base font-medium text-ink">No plan yet</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">
          Keep the long-term plan, goals and open decisions here as Markdown files in the project. Every chat in this project reads them after the project instructions, so they
          carry across contexts.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {quickPlanningDocuments.map((quick) => (
          <Button className="px-3 py-2 text-xs" disabled={disabled} key={quick} variant="filled" onClick={() => onAdd(quick)}>
            Start {quick}
          </Button>
        ))}
      </div>
      <Button className="text-xs text-ink-muted hover:text-ink" disabled={disabled} onClick={onAddExisting}>
        Add an existing Markdown file instead
      </Button>
    </div>
  );
}

interface PlanningDocumentsEditorProps {
  projectPath: string;
  documents: readonly string[];
  /** Set when the project folder is missing, so nothing can be read or written. */
  disabled?: boolean;
  /** Persists the document list; rejected changes are reported by the caller. */
  onChange: (documents: readonly string[]) => void | Promise<void>;
}

/** The project's plan as a workspace: documents on the left, the open one filling the rest. */
export default function PlanningDocumentsEditor(props: PlanningDocumentsEditorProps) {
  const {projectPath, documents, disabled, onChange} = props;
  const [selected, setSelected] = useState(documents[0] ?? "");
  const [adding, setAdding] = useState(false);
  const [path, setPath] = useState("");
  const open = documents.includes(selected) ? selected : (documents[0] ?? "");
  const suggested = quickPlanningDocuments.filter((quick) => !documents.includes(quick));

  const change = (next: readonly string[]): void => {
    void Promise.resolve(onChange(next)).catch(() => undefined);
  };

  const add = (next: string): void => {
    const added = addPlanningDocument(documents, next);
    if (added === documents) return;
    change(added);
    setSelected(added[added.length - 1]!);
    setPath("");
    setAdding(false);
  };

  const closeAdd = (): void => {
    setAdding(false);
    setPath("");
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    add(path);
  };

  return (
    <div className="flex min-h-0 flex-1" data-testid="planning-workspace">
      <aside className="flex w-60 shrink-0 flex-col border-r border-border">
        <div className="flex h-11 shrink-0 items-center justify-between pr-2 pl-4 text-xs text-ink-muted">
          <span>
            Documents <span className="ml-1 text-ink-faint">{documents.length}</span>
          </span>
          <IconButton disabled={disabled} label="Add a document" size="sm" onClick={() => setAdding(true)}>
            <Icon name="plus" size="xs" />
          </IconButton>
        </div>
        <ul aria-label="Planning documents" className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
          {documents.map((item) => (
            <li className="group/doc relative" key={item}>
              <Button
                aria-label={`Edit ${item}`}
                aria-pressed={item === open}
                className={cn(
                  "flex h-8 w-full items-center gap-2 rounded-md px-2 pr-8 text-left font-mono text-xs text-ink-muted hover:bg-overlay-hover hover:text-ink",
                  item === open && "bg-surface-control text-ink"
                )}
                onClick={() => setSelected(item)}
              >
                <Icon className="text-ink-faint" name="file" size="xs" />
                <span className="truncate">{item}</span>
              </Button>
              <IconButton
                className="absolute top-1 right-1 opacity-0 group-hover/doc:opacity-100 focus-visible:opacity-100"
                disabled={disabled}
                label={`Remove ${item} from the plan`}
                size="sm"
                title="Removes it from the plan. The file stays on disk."
                onClick={() => change(documents.filter((document) => document !== item))}
              >
                <Icon name="x" size="xs" />
              </IconButton>
            </li>
          ))}
          {documents.length === 0 && !adding && <li className="px-2 py-2 text-xs text-ink-faint">No documents yet.</li>}
        </ul>
        {adding && (
          <form className="shrink-0 border-t border-border p-3" onSubmit={handleSubmit}>
            <Input
              aria-label="Planning document path"
              autoFocus
              className="w-full"
              disabled={disabled}
              placeholder="docs/roadmap.md"
              value={path}
              onChange={(event) => setPath(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") closeAdd();
              }}
            />
            <div className="mt-2 flex items-center gap-2">
              <Button className="px-3 py-1.5 text-xs" disabled={disabled || !path.trim()} type="submit" variant="filled">
                Add
              </Button>
              <Button className="px-2 py-1.5 text-xs text-ink-muted hover:text-ink" onClick={closeAdd}>
                Cancel
              </Button>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-ink-faint">Relative to the project folder. A file that does not exist yet is created on its first save.</p>
          </form>
        )}
        {suggested.length > 0 && documents.length > 0 && (
          <div className="shrink-0 border-t border-border px-3 py-3">
            <p className="mb-2 px-1 text-xs text-ink-faint">Suggested</p>
            <div className="flex flex-wrap gap-1.5">
              {suggested.map((quick) => (
                <Button
                  className="rounded-md border border-border px-2 py-1 font-mono text-xs text-ink-muted hover:text-ink"
                  disabled={disabled}
                  key={quick}
                  onClick={() => add(quick)}
                >
                  + {quick}
                </Button>
              ))}
            </div>
          </div>
        )}
        <p className="shrink-0 border-t border-border px-4 py-3 text-xs leading-relaxed text-ink-faint">
          Every chat in this project reads these files after the project instructions.
        </p>
      </aside>
      <section className="flex min-w-0 flex-1 flex-col">
        {disabled && (
          <p className="shrink-0 border-b border-border px-5 py-2 text-xs text-danger-ink" role="alert">
            This project's folder is missing, so its documents cannot be read or saved.
          </p>
        )}
        {open ? (
          <DocumentContentEditor disabled={disabled} key={`${projectPath}:${open}`} path={open} projectPath={projectPath} />
        ) : (
          <EmptyPlan disabled={disabled} onAdd={add} onAddExisting={() => setAdding(true)} />
        )}
      </section>
    </div>
  );
}
