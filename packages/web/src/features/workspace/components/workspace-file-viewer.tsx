import {useState} from "react";
import Button from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import IconButton from "@/components/ui/icon-button";
import {Marker, MarkerContent, MarkerIcon} from "@/components/ui/marker";
import {formatAttachmentSize} from "@/features/sessions/lib/attachments/session-attachments";
import {useFolderFile} from "@/features/workspace/hooks/api/use-folder-file";
import AssistantMessageContent from "@/features/sessions/components/timeline/items/assistant/assistant-message-content";
import {pathFileName} from "@/features/workspace/lib/workspace-paths";
import {cn} from "@/lib/cn";

interface WorkspaceFileViewerProps {
  /** Project-relative file to show. */
  readonly onAddToChat?: () => void;
  readonly path: string;
  readonly projectPath: string;
}

/** Shows one project file with line numbers, its read limits, and a way to hand it to the chat. */
export default function WorkspaceFileViewer(props: WorkspaceFileViewerProps) {
  const {onAddToChat, path, projectPath} = props;
  const fileQuery = useFolderFile({path, projectPath});
  const file = fileQuery.data;
  const markdown = /\.(md|markdown)$/i.test(path);
  const [source, setSource] = useState(false);
  const lines = file && !file.binary ? file.content.split("\n") : [];

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="flex h-10 shrink-0 items-center gap-2 border-b border-border-muted px-3">
        <span className="min-w-0 flex-1 truncate text-xs text-ink-muted" title={path}>
          {pathFileName(projectPath)} / <span className="text-ink">{path}</span>
        </span>
        {onAddToChat && (
          <IconButton className="size-7 rounded-full" label="Add to chat" onClick={onAddToChat} title={`Add ${pathFileName(path)} to chat`}>
            <Icon name="corner-left-up" size="sm" />
          </IconButton>
        )}
      </div>
      {markdown && file && !file.binary && (
        <div aria-label="File display" className="flex shrink-0 gap-1 border-b border-border-muted px-2 py-1">
          {([false, true] as const).map((showSource) => (
            <Button
              aria-pressed={source === showSource}
              className={cn("rounded-md px-2 py-1 text-xs text-ink-faint hover:text-ink", source === showSource && "bg-overlay-hover text-ink")}
              key={String(showSource)}
              onClick={() => setSource(showSource)}
            >
              {showSource ? "Source" : "Preview"}
            </Button>
          ))}
        </div>
      )}

      <div className="min-h-0 min-w-0 flex-1 overflow-auto">
        {fileQuery.error && (
          <p className="px-3 py-2 text-sm text-danger-ink" role="alert">
            This file could not be read.
          </p>
        )}
        {!file && !fileQuery.error && <p className="px-3 py-2 text-xs text-ink-faint">Loading file…</p>}
        {file?.binary && (
          <Marker className="px-3 py-2 text-xs" role="status">
            <MarkerIcon>
              <Icon name="image" size="xs" />
            </MarkerIcon>
            <MarkerContent>This is a binary file, so it has no text to show. {formatAttachmentSize(file.size)} on disk.</MarkerContent>
          </Marker>
        )}
        {file && !file.binary && (
          <>
            {file.truncated && (
              <Marker className="border-b border-border-muted px-3 py-2 text-xs" role="status">
                <MarkerContent>Showing the start of this file only; it is {formatAttachmentSize(file.size)} in total.</MarkerContent>
              </Marker>
            )}
            {markdown && !source ? (
              <AssistantMessageContent className="px-4 py-5 text-xs leading-relaxed">{file.content}</AssistantMessageContent>
            ) : (
              <ol className="min-w-0 overflow-x-hidden py-2 font-mono text-xs leading-5 text-ink">
                {lines.map((line, index) => (
                  <li className="flex min-w-0 gap-3 px-3 hover:bg-overlay-hover" key={`${index}:${line}`}>
                    <span className="w-8 shrink-0 select-none text-right text-ink-faint tabular-nums">{index + 1}</span>
                    <span className="min-w-0 whitespace-pre wrap-anywhere">{line}</span>
                  </li>
                ))}
              </ol>
            )}
          </>
        )}
      </div>
    </div>
  );
}
