import {useState} from "react";
import type {CurationTarget} from "@supernova/contracts/harnesses/schemas";
import Button from "@/components/ui/button";
import {SettingsRow} from "@/features/settings/components/settings-group";
import ConfigChoice from "@/features/harnesses/components/config-choice";
import PromptEditor from "@/features/harnesses/components/prompt-editor";
import {useInstructionVersion, useInstructionVersions} from "@/features/harnesses/hooks/api/use-curation";

interface InstructionHistoryProps {
  target: CurationTarget;
  onRestore: (content: string) => void;
}

/** Earlier texts of one instruction piece. Restore puts the old text into the draft, which Save changes then persists. */
export default function InstructionHistory(props: InstructionHistoryProps) {
  const {target, onRestore} = props;
  const [revision, setRevision] = useState<number>();
  const versions = useInstructionVersions(target);
  const version = useInstructionVersion(target, revision);
  const saved = versions.data?.versions ?? [];

  const handleRestore = (): void => {
    if (version.data) onRestore(version.data.content);
  };

  return (
    <SettingsRow
      control={
        <ConfigChoice
          className="sm:w-64"
          disabled={!saved.length}
          label="Saved revisions"
          options={[
            {value: "", label: saved.length ? "Current text" : "No earlier versions"},
            ...saved.map((item) => ({value: String(item.revision), label: `revision ${item.revision} · ${new Date(item.savedAt).toLocaleDateString()}`})),
          ]}
          value={revision === undefined ? "" : String(revision)}
          onChange={(value) => setRevision(value ? Number(value) : undefined)}
        />
      }
      description={saved.length ? "Texts saved each time these instructions changed." : "No earlier versions yet."}
      title="History"
    >
      {revision !== undefined && (
        <div className="space-y-2">
          {version.isError && (
            <p className="text-xs text-danger-ink" role="alert">
              Could not read that version.
            </p>
          )}
          <PromptEditor disabled label={`Instructions at revision ${revision}`} size="sm" value={version.data?.content ?? ""} onChange={() => undefined} />
          <Button className="rounded-lg border border-border px-3 py-2 text-xs text-ink-muted hover:text-ink" disabled={!version.data} onClick={handleRestore}>
            Restore
          </Button>
        </div>
      )}
    </SettingsRow>
  );
}
