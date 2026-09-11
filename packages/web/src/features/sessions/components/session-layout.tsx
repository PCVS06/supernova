import type {CSSProperties, HTMLAttributes, ReactNode} from "react";
import type {AppEnvironment} from "@/lib/app-environment";
import AttachmentDropOverlay from "@/features/sessions/components/attachments/attachment-drop-overlay";
import SessionHeader from "@/features/sessions/components/session-header";

/** Sticky inset that keeps the routed chat's header clear of the platform window controls. */
function titleOffsetClassName(appEnvironment: AppEnvironment): string {
  if (appEnvironment === "mac") return "left-48";
  if (appEnvironment === "web") return "left-12";

  return "left-29";
}

interface SessionLayoutProps {
  /** Chat-level actions such as split and close. */
  readonly actions?: ReactNode;
  readonly appEnvironment: AppEnvironment;
  readonly attachmentDropOverlayVisible?: boolean;
  readonly attachmentDropZoneProps?: Pick<HTMLAttributes<HTMLDivElement>, "onDragEnter" | "onDragLeave" | "onDragOver" | "onDrop">;
  readonly badge?: ReactNode;
  readonly color?: string;
  readonly composer: ReactNode;
  /** Compact strip under the header with the chat's goals and instructions. */
  readonly contextStrip?: ReactNode;
  readonly mark?: ReactNode;
  readonly timeline: ReactNode;
  readonly title: ReactNode;
  readonly titleActions?: ReactNode;
  /** A pane sits beside the routed chat and is never under the window controls. */
  readonly variant?: "pane" | "primary";
}

/** One chat surface: header, context strip, transcript and composer in a single frame. */
export default function SessionLayout(props: SessionLayoutProps) {
  const {
    actions,
    appEnvironment,
    attachmentDropOverlayVisible = false,
    attachmentDropZoneProps,
    badge,
    color,
    composer,
    contextStrip,
    mark,
    timeline,
    title,
    titleActions,
    variant = "primary",
  } = props;

  return (
    <div {...attachmentDropZoneProps} className="chat-workspace relative flex min-h-0 min-w-0 flex-1 flex-col" style={{"--chat-accent": color ?? "#ffffff"} as CSSProperties}>
      <SessionHeader
        actions={actions}
        badge={badge}
        mark={mark}
        offsetClassName={variant === "primary" ? titleOffsetClassName(appEnvironment) : undefined}
        title={title}
        titleActions={titleActions}
      />
      {contextStrip}
      {timeline}
      {composer}
      {attachmentDropOverlayVisible && <AttachmentDropOverlay />}
    </div>
  );
}
