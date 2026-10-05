import {useRef, useState} from "react";
import AssistantMessageContent from "@/features/sessions/components/timeline/items/assistant/assistant-message-content";
import {useFolderFile} from "@/features/workspace/hooks/api/use-folder-file";
import {markdownHeadingAnchors} from "@/features/workspace/lib/markdown-heading-anchors";
import {resolveMarkdownReference} from "@/features/workspace/lib/markdown-reference";
import {useWorkspacePanelStore} from "@/features/workspace/stores/workspace-panel-store";

interface ProjectImageProps {
  readonly alt: string;
  readonly path: string;
  readonly projectPath: string;
  readonly title?: string;
}

/** Loads only confined, bounded images through the same server as the document. */
function ProjectImage({alt, path, projectPath, title}: ProjectImageProps) {
  const query = useFolderFile({path, projectPath, imagePreview: true});
  const image = query.data?.image;
  const [failedSource, setFailedSource] = useState<string>();
  const src = image ? `data:${image.mediaType};base64,${image.base64}` : undefined;
  if (query.error || (src && failedSource === src)) return <span role="status">Image unavailable: {alt || path}</span>;
  if (!src) return <span role="status">Loading image: {alt || path}…</span>;
  return <img alt={alt} className="max-w-full" src={src} title={title} onError={() => setFailedSource(src)} />;
}

interface WorkspaceMarkdownProps {
  readonly anchor?: string;
  readonly children: string;
  readonly path: string;
  readonly projectPath: string;
}

/** Keeps local Markdown navigation and media within the project file reader. */
export default function WorkspaceMarkdown({anchor, children, path, projectPath}: WorkspaceMarkdownProps) {
  const root = useRef<HTMLDivElement | null>(null);
  const openFile = useWorkspacePanelStore((state) => state.openFile);

  const scrollToAnchor = (element: HTMLDivElement | null, target: string): void => {
    if (!element || !target) return;
    const heading = [...element.querySelectorAll<HTMLElement>("[id]")].find((item) => item.id === target);
    heading?.scrollIntoView({block: "start"});
  };

  return (
    <div
      ref={(element) => {
        root.current = element;
        scrollToAnchor(element, anchor ?? "");
      }}
    >
      <AssistantMessageContent
        className="px-4 py-5 text-xs leading-relaxed"
        rehypePlugins={[markdownHeadingAnchors]}
        components={{
          a: ({children: label, href, title}) => {
            const reference = resolveMarkdownReference(path, href ?? "");
            if (reference.kind === "invalid") return <span title="This link is outside the project or is unsupported.">{label}</span>;
            if (reference.kind === "external")
              return (
                <a className="underline underline-offset-4" href={reference.url} rel="noreferrer" target="_blank" title={title}>
                  {label}
                </a>
              );
            return (
              <button
                type="button"
                role="link"
                className="cursor-pointer text-left underline underline-offset-4"
                title={title ?? reference.path}
                onClick={() => {
                  openFile(reference.path, reference.anchor);
                  if (reference.path === path) scrollToAnchor(root.current, reference.anchor);
                }}
              >
                {label}
              </button>
            );
          },
          img: ({alt, src, title}) => {
            const reference = resolveMarkdownReference(path, typeof src === "string" ? src : "");
            if (reference.kind === "invalid") return <span role="status">Image unavailable: {alt}</span>;
            if (reference.kind === "external") return <img alt={alt ?? ""} className="max-w-full" src={reference.url} title={title} />;
            return <ProjectImage alt={alt ?? ""} path={reference.path} projectPath={projectPath} title={title} />;
          },
        }}
      >
        {children}
      </AssistantMessageContent>
    </div>
  );
}
