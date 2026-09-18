import {useState} from "react";
import type {ToolCredentialResult} from "@supernova/contracts/harnesses/procedures";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import {useSaveToolCredential, useToolCredentials} from "@/features/harnesses/hooks/api/use-harness-resources";

function CredentialField(props: {field: ToolCredentialResult[number]["fields"][number]}) {
  const {field} = props;
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);
  const save = useSaveToolCredential();
  const submit = async (next: string) => {
    setError(false);
    try {
      await save.mutateAsync({name: field.name, value: next});
      setValue("");
    } catch {
      setError(true);
    } finally {
      save.reset();
    }
  };
  return (
    <div className="space-y-2">
      <div className="flex justify-between gap-3 text-xs">
        <label htmlFor={field.name}>
          {field.label}
          {field.optional ? " · optional" : ""}
        </label>
        <span className="text-ink-muted">
          {field.source === "pi+" ? "Saved in Radian · not tested" : field.source === "environment" ? "From environment · not tested" : "Not configured"}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Input
          id={field.name}
          type="password"
          autoComplete="off"
          spellCheck={false}
          value={value}
          placeholder={field.configured ? "Enter a replacement" : `Enter ${field.label.toLowerCase()}`}
          className="min-w-0 flex-1"
          onChange={(event) => setValue(event.target.value)}
        />
        <Button disabled={!value.trim() || save.isPending} className="rounded-lg border border-border px-3 py-2 text-xs" onClick={() => void submit(value)}>
          {save.isPending ? "Saving…" : "Save key"}
        </Button>
        {field.source === "pi+" && (
          <Button
            disabled={save.isPending}
            className="text-xs text-ink-muted"
            onClick={() => {
              if (window.confirm("Remove this saved credential from Radian? An existing environment credential, if any, will be used instead.")) void submit("");
            }}
          >
            Remove
          </Button>
        )}
      </div>
      {error && (
        <p role="alert" className="text-xs text-danger-ink">
          Could not save this credential. Your input is still here; retry when ready.
        </p>
      )}
    </div>
  );
}

/** App-wide keys for the tools every harness may call. Each key is stored the moment it is entered. Renders rows for a settings card. */
export default function ToolCredentialsEditor() {
  const credentials = useToolCredentials();
  // A connector that needs no key has nothing to set, so it takes one line instead of a row.
  const keyed = credentials.data?.filter((connector) => connector.fields.length > 0) ?? [];
  const keyless = credentials.data?.filter((connector) => connector.fields.length === 0) ?? [];

  return (
    <>
      {credentials.isPending && <p className="px-4 py-3.5 text-xs text-ink-muted">Loading credential status…</p>}
      {credentials.isError && (
        <p role="alert" className="px-4 py-3.5 text-xs text-danger-ink">
          Could not load credential status. No secret values were requested.
        </p>
      )}
      {credentials.data && !keyed.length && <p className="px-4 py-3.5 text-xs text-ink-muted">No tool of your harnesses needs a key.</p>}
      {keyed.map((connector) => (
        <section key={connector.id} className="space-y-3 px-4 py-3.5">
          <h3 className="text-sm font-medium">{connector.name}</h3>
          {connector.fields.map((field) => (
            <CredentialField key={field.name} field={field} />
          ))}
        </section>
      ))}
      {keyless.length > 0 && <p className="px-4 py-3 text-xs leading-relaxed text-ink-faint">Work without a key: {keyless.map((connector) => connector.name).join(", ")}.</p>}
    </>
  );
}
