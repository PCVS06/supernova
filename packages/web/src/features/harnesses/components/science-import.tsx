import {useState} from "react";
import {useNavigate} from "@tanstack/react-router";
import Button from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import Input from "@/components/ui/input";
import {SettingsRow} from "@/features/settings/components/settings-group";
import {useImportScienceHarness} from "@/features/harnesses/hooks/api/use-harnesses";
import {useHarnessNavigationStore} from "@/features/harnesses/stores/harness-navigation-store";
import {cn} from "@/lib/cn";

interface ScienceImportProps {
  /** Whether the two path fields are shown. The page owns the disclosure. */
  open: boolean;
  revision: number;
  onToggle: () => void;
}

/** Links an existing Science Pi setup. Both paths are typed in; nothing is guessed from this machine. */
export default function ScienceImport(props: ScienceImportProps) {
  const {open, revision, onToggle} = props;
  const importer = useImportScienceHarness();
  const navigate = useNavigate();
  const select = useHarnessNavigationStore((state) => state.selectHarness);
  const [packagePath, setPackagePath] = useState("");
  const [rootPath, setRootPath] = useState("");

  const handleImport = (): void => {
    importer.mutate(
      {packagePath: packagePath.trim(), rootPath: rootPath.trim(), expectedRevision: revision},
      {
        onSuccess: () => {
          select("science");
          void navigate({to: "/settings/harness/$harnessId/$page", params: {harnessId: "science", page: "overview"}});
        },
      }
    );
  };

  return (
    <>
      <SettingsRow
        control={
          <Button aria-expanded={open} className="rounded-lg border border-border px-3 py-2 text-xs" onClick={onToggle}>
            {open ? "Hide" : "Set up import"}
            <Icon name="chevron-down" size="xs" className={cn("ml-2 transition-transform", open && "rotate-180")} />
          </Button>
        }
        description="Imports prompts and specialist definitions, and links existing lab folders. Original files are not overwritten. Existing research gates stay in place; no agents or experiments start."
        title="Import your Science Pi setup"
      >
        {open && (
          <div className="space-y-3">
            <label className="block space-y-1.5">
              <span className="block text-xs text-ink-muted">Science package</span>
              <Input placeholder="~/pi-scientific-tools" value={packagePath} onChange={(event) => setPackagePath(event.target.value)} />
            </label>
            <label className="block space-y-1.5">
              <span className="block text-xs text-ink-muted">Science workspace</span>
              <Input placeholder="~/Science-Space" value={rootPath} onChange={(event) => setRootPath(event.target.value)} />
            </label>
            <Button variant="filled" className="px-4 py-2 text-sm" disabled={importer.isPending || !packagePath.trim() || !rootPath.trim()} onClick={handleImport}>
              {importer.isPending ? "Importing…" : "Import Science Pi"}
            </Button>
          </div>
        )}
      </SettingsRow>
      {importer.error && (
        <p className="px-3 text-sm text-danger-ink sm:px-4" role="alert">
          {String(importer.error)}
        </p>
      )}
    </>
  );
}
