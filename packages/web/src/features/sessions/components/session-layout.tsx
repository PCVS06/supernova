import type {CSSProperties, HTMLAttributes, ReactNode} from "react";
import type {AppEnvironment} from "@/lib/app-environment";
import AttachmentDropOverlay from "@/features/sessions/components/attachments/attachment-drop-overlay";
import SessionHeader from "@/features/sessions/components/session-header";

interface SessionLayoutProps {
  /** Chat-level actions such as split and close. */
  readonly actions?: ReactNode;
  readonly appEnvironment: AppEnvironment;
  readonly attachmentDropOverlayVisible?: boolean;
  readonly attachmentDropZoneProps?: Pick<HTMLAttributes<HTMLDivElement>, "onDragEnter" | "onDragLeave" | "onDragOver" | "onDrop">;
  readonly badge?: ReactNode;
  readonly color?: string;
  readonly composer: ReactNode;
  /** Single entry point to this chat's captured context, placed in the header. */
  readonly contextStrip?: ReactNode;
  readonly mark?: ReactNode;
  readonly timeline: ReactNode;
  readonly title: ReactNode;
  readonly subtitle?: ReactNode;
  readonly titleActions?: ReactNode;
  /** A pane sits beside the routed chat and is never under the window controls. */
  readonly variant?: "pane" | "primary";
}

/** One chat surface with context inspection in the header, transcript and composer. */
export default function SessionLayout(props: SessionLayoutProps) {
  const {actions, attachmentDropOverlayVisible = false, attachmentDropZoneProps, badge, color, composer, contextStrip, mark, timeline, title, subtitle, titleActions} = props;

  return (
    <div {...attachmentDropZoneProps} className="chat-workspace relative flex min-h-0 min-w-0 flex-1 flex-col" style={{"--chat-accent": color ?? "#ffffff"} as CSSProperties}>
      <SessionHeader
        actions={
          <>
            {contextStrip}
            {actions}
          </>
        }
        badge={badge}
        mark={mark}
        title={title}
        subtitle={subtitle}
        titleActions={titleActions}
      />
      {timeline}
      {composer}
      {attachmentDropOverlayVisible && <AttachmentDropOverlay />}
    </div>
  );
}
