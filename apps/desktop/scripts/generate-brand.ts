import sharp from "sharp";

// One geometry source keeps the animated UI and static launcher frame identical.
const artwork = (await Bun.file(new URL("../../../packages/web/assets/pi-orb.json", import.meta.url)).json()) as {
  readonly size: number;
  readonly glyphPath: string;
  readonly layers: readonly {readonly path: string; readonly opacity: number}[];
};
const pixels = artwork.layers.map((layer) => `<path d="${layer.path}" opacity="${layer.opacity}"/>`).join("");
const drawing = `<g fill="#FFFFFF" shape-rendering="crispEdges">${pixels}<path d="${artwork.glyphPath}"/></g>`;
const mark = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 ${artwork.size} ${artwork.size}">${drawing}</svg>`;
const mac = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 128 128"><rect x="12" y="12" width="104" height="104" rx="24" fill="#000000"/><svg x="18" y="18" width="92" height="92" viewBox="0 0 ${artwork.size} ${artwork.size}">${drawing}</svg></svg>`;
const tile = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 ${artwork.size} ${artwork.size}"><rect width="40" height="40" fill="#000000"/>${drawing}</svg>`;

for (const variant of ["dev", "prod", "nightly"]) {
  const directory = new URL(`../icons/${variant}/`, import.meta.url);
  await sharp(Buffer.from(mac)).png().toFile(new URL("macos.png", directory).pathname);
  await sharp(Buffer.from(mark)).png().toFile(new URL("macos.icon/Assets/icon.png", directory).pathname);
  await sharp(Buffer.from(tile)).png().toFile(new URL("icon.png", directory).pathname);
}

for (const [name, artwork] of [
  ["icon-white.png", mark],
  ["icon-black.png", mark.replaceAll("#FFFFFF", "#111111")],
]) {
  await sharp(Buffer.from(artwork!))
    .resize(512)
    .png()
    .toFile(new URL(`../../../packages/web/assets/${name}`, import.meta.url).pathname);
}

await Bun.write(new URL("../icons/icon.svg", import.meta.url), tile);
await Bun.write(new URL("../../../packages/web/public/favicon.svg", import.meta.url), tile);
