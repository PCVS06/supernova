import {readFile, writeFile} from "node:fs/promises";
import {createRequire} from "node:module";
import {getIconData} from "@iconify/utils";

// Resolve the locked collections during development/build, never in the renderer.
const require = createRequire(import.meta.url);
const catalog = JSON.parse(await readFile(new URL("../assets/ui-icon-catalog.json", import.meta.url), "utf8")) as Record<string, string>;
const collections = new Map<string, Parameters<typeof getIconData>[0]>();
const selected: Record<string, NonNullable<ReturnType<typeof getIconData>>> = {};
for (const [name, reference] of Object.entries(catalog)) {
  const [prefix, iconName] = reference.split(":");
  if (!prefix || !iconName) throw new Error(`Invalid icon reference: ${reference}`);
  const collection = collections.get(prefix) ?? (require(`@iconify-json/${prefix}`).icons as Parameters<typeof getIconData>[0]);
  collections.set(prefix, collection);
  const icon = getIconData(collection, iconName);
  if (!icon) throw new Error(`Missing static icon data for ${reference}`);
  selected[name] = icon;
}
const output = new URL("../assets/ui-icons.json", import.meta.url);
const content = `${JSON.stringify(selected, null, 2)}\n`;
const previous = await readFile(output, "utf8").catch((error: NodeJS.ErrnoException) => {
  if (error.code !== "ENOENT") throw error;
  return undefined;
});
if (previous !== content) await writeFile(output, content);
