import {createCipheriv, createDecipheriv, randomBytes, randomUUID} from "node:crypto";
import {mkdir, open, readFile, rename, rmdir, writeFile} from "node:fs/promises";
import {join} from "node:path";
import {harnessStore} from "@supernova/agent-runtime/layers/harnesses/internal/harness-store";

const field = (name: string, label = "API key", optional = false) => ({name, label, optional});
const connectors = [
  {id: "crossref", name: "Crossref", fields: []},
  {id: "arxiv", name: "arXiv", fields: []},
  {id: "openalex", name: "OpenAlex", fields: [field("OPENALEX_API_KEY", "API key", true)]},
  {id: "scopus", name: "Scopus", fields: [field("SCOPUS_API_KEY"), field("SCOPUS_INST_TOKEN", "Institution token", true)]},
  {id: "wos", name: "Web of Science", fields: [field("WOS_API_KEY")]},
  {id: "ieee", name: "IEEE Xplore", fields: [field("IEEE_API_KEY")]},
  {id: "ebsco", name: "EBSCO", fields: [field("EBSCO_CONSUMER_KEY", "Consumer key"), field("EBSCO_CLIENT_ID", "Client ID"), field("EBSCO_CLIENT_SECRET", "Client secret")]},
  {id: "pubmed", name: "PubMed", fields: [field("NCBI_API_KEY", "API key", true)]},
  {id: "semantic-scholar", name: "Semantic Scholar", fields: [field("SEMANTIC_SCHOLAR_API_KEY", "API key", true)]},
  {id: "unpaywall", name: "Unpaywall", fields: [field("UNPAYWALL_EMAIL", "Contact email")]},
];
const names = new Set(connectors.flatMap((connector) => connector.fields.map((item) => item.name)));

/** App-wide tool credentials. Ciphertext and its local key are private files, not OS Keychain. Never returned to clients. */
export class ToolCredentialStore {
  private original = new Map<string, string | undefined>();
  constructor(
    private root: string,
    private environment: NodeJS.ProcessEnv = process.env
  ) {}

  private async read(): Promise<Record<string, string>> {
    try {
      const raw = await readFile(join(this.root, "tools.enc"), "utf8");
      const data = JSON.parse(raw);
      const key = await readFile(join(this.root, "tools.key"));
      const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(data.iv, "base64"));
      decipher.setAAD(Buffer.from("pi-plus-tool-credentials-v1"));
      decipher.setAuthTag(Buffer.from(data.tag, "base64"));
      const values = JSON.parse(Buffer.concat([decipher.update(Buffer.from(data.ciphertext, "base64")), decipher.final()]).toString("utf8"));
      if (!values || typeof values !== "object" || Object.entries(values).some(([name, value]) => !names.has(name) || typeof value !== "string")) throw new Error();
      return values;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        // A missing key must not silently turn an existing credential file into an empty store.
        try {
          await readFile(join(this.root, "tools.enc"));
        } catch (missing) {
          if ((missing as NodeJS.ErrnoException).code === "ENOENT") return {};
        }
      }
      throw new Error("Tool credentials could not be opened. Existing credentials have not been changed.");
    }
  }

  private apply(values: Record<string, string>) {
    for (const name of names) {
      if (values[name] !== undefined) {
        if (!this.original.has(name)) this.original.set(name, this.environment[name]);
        this.environment[name] = values[name];
      } else if (this.original.has(name)) {
        const original = this.original.get(name);
        if (original === undefined) delete this.environment[name];
        else this.environment[name] = original;
        this.original.delete(name);
      }
    }
  }

  public async loadIntoRuntime() {
    this.apply(await this.read());
  }

  public async status() {
    const values = await this.read();
    this.apply(values);
    return connectors.map((connector) => ({
      ...connector,
      fields: connector.fields.map((item) => ({
        ...item,
        configured: !!this.environment[item.name],
        source: values[item.name] ? "pi+" : this.environment[item.name] ? "environment" : "missing",
      })),
    }));
  }

  public async save(name: string, value: string) {
    if (!names.has(name) || value.length > 8192 || /[\r\n\0]/.test(value)) throw new Error("Invalid tool credential field or value.");
    await mkdir(this.root, {recursive: true, mode: 0o700});
    const lock = join(this.root, "tools.write-lock");
    try {
      await mkdir(lock, {mode: 0o700});
    } catch {
      throw new Error("Tool credentials are being saved elsewhere. Retry shortly.");
    }
    try {
      const values = await this.read();
      if (value.trim()) values[name] = value.trim();
      else delete values[name];
      let key: Buffer;
      try {
        key = await readFile(join(this.root, "tools.key"));
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
        key = randomBytes(32);
        const handle = await open(join(this.root, "tools.key"), "wx", 0o600);
        try {
          await handle.writeFile(key);
        } finally {
          await handle.close();
        }
      }
      const iv = randomBytes(12);
      const cipher = createCipheriv("aes-256-gcm", key, iv);
      cipher.setAAD(Buffer.from("pi-plus-tool-credentials-v1"));
      const ciphertext = Buffer.concat([cipher.update(JSON.stringify(values)), cipher.final()]);
      const temporary = join(this.root, `tools-${randomUUID()}.tmp`);
      await writeFile(temporary, JSON.stringify({iv: iv.toString("base64"), ciphertext: ciphertext.toString("base64"), tag: cipher.getAuthTag().toString("base64")}), {
        mode: 0o600,
      });
      await rename(temporary, join(this.root, "tools.enc"));
      this.apply(values);
    } catch {
      throw new Error("Could not save tool credentials. No secret values were returned.");
    } finally {
      await rmdir(lock);
    }
    return this.status();
  }
}

export const toolCredentials = new ToolCredentialStore(join(harnessStore.root, "credentials"));
