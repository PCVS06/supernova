import {createRequire} from "node:module";
import {describe, expect, it} from "vitest";
import {getIconData} from "@iconify/utils";
import catalog from "@assets/ui-icon-catalog.json";
import icons from "@assets/ui-icons.json";

const require = createRequire(import.meta.url);

describe("offline UI icon subset", () => {
  it("contains exactly the app's catalog without shipping unrelated icons", () => {
    expect(Object.keys(icons).sort()).toEqual(Object.keys(catalog).sort());
    expect(JSON.stringify(icons).length).toBeLessThan(40_000);
  });

  it.each(Object.entries(catalog))("preserves the complete source artwork for %s (%s)", (name, reference) => {
    const [prefix, iconName] = reference.split(":");
    const collection = require(`@iconify-json/${prefix}`).icons as Parameters<typeof getIconData>[0];
    expect(icons[name as keyof typeof icons]).toEqual(getIconData(collection, iconName!));
  });
});
