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
          {field.source === "pi+" ? "Saved in pi+ · not tested" : field.source === "environment" ? "From environment · not tested" : "Not configured"}
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
              if (window.confirm("Remove this saved credential from pi+? An existing environment credential, if any, will be used instead.")) void submit("");
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

export default function ToolCredentialsEditor() {
  const credentials = useToolCredentials();
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border p-4 text-xs leading-relaxed text-ink-muted">
        <p className="font-medium text-ink">Tool connections · app-wide credentials</p>
        <p className="mt-2">Encrypted local storage · not Keychain · available to trusted tools</p>
      </div>
      {credentials.isPending && <p className="text-sm text-ink-muted">Loading credential status…</p>}
      {credentials.isError && (
        <p role="alert" className="text-sm text-danger-ink">
          Could not load credential status. No secret values were requested.
        </p>
      )}
      {credentials.data?.map((connector) => (
        <section key={connector.id} className="space-y-4 rounded-xl border border-border bg-surface-raised p-4">
          <h3 className="text-sm font-medium">{connector.name}</h3>
          {connector.fields.length ? (
            connector.fields.map((field) => <CredentialField key={field.name} field={field} />)
          ) : (
            <p className="text-xs text-ink-muted">No key required · not tested</p>
          )}
        </section>
      ))}
    </div>
  );
}
